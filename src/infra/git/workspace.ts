// =============================================================================
// Git Workspace Adapter (L1-Infra)
//
// 职责：把 git 命令封装成纯函数 IO 接口。
// 边界：L0-Kernel 永远不碰此文件；只有 L1-Infra / L2-Work / L3-CLI 可调用。
//
// 设计原则（与 IAP 三轴分离一致）：
//   - 本模块只回答"git 物理观测的客观事实"，不判定 PASS/FAIL
//   - 判定（verdict）走 src/kernel/probes/verdict.ts 的纯函数
//   - 失败时不抛异常；返回 Result<{ ok, stdout, stderr, exitCode }>，调用方决定如何处理
//
// 不做的事（明确划线）：
//   - 不接触 L0-Kernel（Kernel 是兰姆达真空，不感知 git 存在）
//   - 不替人 commit / push / merge（"OXN 永远不替人决策"哲学）
//   - 不读 .env / process.env（git config 是项目级，不是环境级）
//   - 不在后台持有 worktree 状态（每次调用都 spawn 新 git 进程）
// =============================================================================

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Git 命令返回结构（统一错误契约） */
export interface GitResult {
  /** git 命令是否成功（exit 0） */
  ok: boolean
  /** stdout（成功时为命令输出） */
  stdout: string
  /** stderr（git 写警告 / 错误到这里） */
  stderr: string
  /** git 进程退出码；失败时为非 0；被 timeout 杀时为 null */
  exitCode: number | null
  /** 错误对象（spawn 失败 / EACCES / ENOENT / 等等） */
  error?: string
}

/** 通用 git 命令执行器（最底层；所有函数都走它） */
export async function runGit(args: string[], options: { cwd?: string; timeoutMs?: number } = {}): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: options.cwd ?? process.cwd(),
      timeout: options.timeoutMs ?? 10000,
      maxBuffer: 4 * 1024 * 1024, // 4 MB
    })
    return { ok: true, stdout: stdout.toString(), stderr: stderr.toString(), exitCode: 0 }
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; code?: string | number; message?: string }
    return {
      ok: false,
      stdout: typeof e.stdout === 'string' ? e.stdout : (e.stdout?.toString() ?? ''),
      stderr: typeof e.stderr === 'string' ? e.stderr : (e.stderr?.toString() ?? ''),
      exitCode: typeof e.code === 'number' ? e.code : null,
      error: e.message ?? String(err),
    }
  }
}

/** 检查 git 是否可用（PoC 阶段避免 EACCES/ENOENT 卡住 CLI） */
export async function isGitAvailable(cwd?: string): Promise<boolean> {
  const r = await runGit(['--version'], { cwd })
  return r.ok
}

// =============================================================================
// 物理观测函数（被 4 个 builtin probe 调用）
// =============================================================================

/**
 * git status --porcelain 输出是否为空（= working tree 干净）
 * 不含 untracked 文件（untracked 不影响 merge，但工程师可能想看到）
 */
export async function isWorkingTreeClean(
  cwd: string,
  options: { includeUntracked?: boolean } = {},
): Promise<GitResult & { clean: boolean }> {
  const args = options.includeUntracked
    ? ['status', '--porcelain', '--untracked-files=normal']
    : ['status', '--porcelain', '--untracked-files=no']
  const r = await runGit(args, { cwd })
  return { ...r, clean: r.ok && r.stdout.trim().length === 0 }
}

/** 列出当前未提交改动（git status --porcelain 输出） */
export async function listDirtyFiles(cwd: string): Promise<GitResult & { dirtyFiles: string[] }> {
  const r = await runGit(['status', '--porcelain'], { cwd })
  const dirtyFiles = r.ok
    ? r.stdout
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
    : []
  return { ...r, dirtyFiles }
}

/** 检查指定本地 / 远程分支是否存在 */
export async function branchExists(branch: string, cwd: string): Promise<GitResult & { exists: boolean }> {
  // 兼容 macOS git 2.53（无 --quiet flag）：capture stderr 判定
  const r = await runGit(['rev-parse', '--verify', `refs/heads/${branch}`], { cwd })
  // 即使 r.ok=false，stderr 含 "fatal: ..." 但 exit !== 0 → 不存在
  const exists = r.ok
  return { ...r, exists }
}

/** 取当前 HEAD 的 commit hash */
export async function getHeadCommit(cwd: string): Promise<GitResult & { commit: string | null }> {
  const r = await runGit(['rev-parse', 'HEAD'], { cwd })
  return { ...r, commit: r.ok ? r.stdout.trim() : null }
}

/** 取 target_branch 的 commit hash（若 target_branch 是 "current"，用当前分支） */
export async function getTargetCommit(branch: string, cwd: string): Promise<GitResult & { commit: string | null }> {
  if (branch === 'current') {
    const r = await runGit(['symbolic-ref', '--short', 'HEAD'], { cwd })
    if (!r.ok) return { ...r, commit: null }
    return getTargetCommit(r.stdout.trim(), cwd)
  }
  const r = await runGit(['rev-parse', '--verify', `refs/heads/${branch}`], { cwd })
  return { ...r, commit: r.ok ? r.stdout.trim() : null }
}

/**
 * 用 git merge-tree --write-tree 算法判定 work_branch 能否合并到 target_branch
 * **纯算法，不修改 working tree / index / refs**
 *
 * 返回状态枚举：
 *   - 'can_ff_merge'       : work_branch 在 target_branch 之后（fast-forward 可行）
 *   - 'can_merge_clean'    : 三路合并无冲突（需 --no-ff 创 merge commit）
 *   - 'has_conflicts'      : 冲突文件列表非空
 *   - 'dirty_worktree'     : worktree 有未提交改动（应先 clean）
 *   - 'unknown'            : 计算失败（git 报错 / 分支不存在等）
 */
export type MergeFeasibility = 'can_ff_merge' | 'can_merge_clean' | 'has_conflicts' | 'dirty_worktree' | 'unknown'

export interface MergeFeasibilityResult {
  status: MergeFeasibility
  /** 冲突文件列表（status === 'has_conflicts' 时非空） */
  conflictFiles: string[]
  /** target_branch 解析到的 commit */
  targetCommit: string | null
  /** work_branch 解析到的 commit */
  workCommit: string | null
  /** 错误信息（status === 'unknown' 时非空） */
  error?: string
}

export async function checkMergeFeasibility(
  workBranch: string,
  targetBranch: string,
  cwd: string,
): Promise<MergeFeasibilityResult> {
  // 1. dirty 守卫：先确认 worktree 干净
  const dirty = await listDirtyFiles(cwd)
  if (!dirty.ok) {
    return {
      status: 'unknown',
      conflictFiles: [],
      targetCommit: null,
      workCommit: null,
      error: dirty.error ?? 'failed to check working tree status',
    }
  }
  if (dirty.dirtyFiles.length > 0) {
    return {
      status: 'dirty_worktree',
      conflictFiles: dirty.dirtyFiles,
      targetCommit: null,
      workCommit: null,
    }
  }

  // 2. 取两边 commit
  const [targetR, workR] = await Promise.all([getTargetCommit(targetBranch, cwd), getTargetCommit(workBranch, cwd)])
  if (!targetR.ok || !targetR.commit) {
    return {
      status: 'unknown',
      conflictFiles: [],
      targetCommit: targetR.commit,
      workCommit: null,
      error: `target branch "${targetBranch}" not found`,
    }
  }
  if (!workR.ok || !workR.commit) {
    return {
      status: 'unknown',
      conflictFiles: [],
      targetCommit: targetR.commit,
      workCommit: workR.commit,
      error: `work branch "${workBranch}" not found`,
    }
  }

  // 3. fast-forward 判定：work_commit 在 target_commit 之后
  const ffR = await runGit(['merge-base', '--is-ancestor', workR.commit, targetR.commit], { cwd })
  if (ffR.ok) {
    return {
      status: 'can_ff_merge',
      conflictFiles: [],
      targetCommit: targetR.commit,
      workCommit: workR.commit,
    }
  }
  // work 在 target 之前（或分支）→ 不是 ff
  const isWorkAncestorR = await runGit(['merge-base', '--is-ancestor', targetR.commit, workR.commit], { cwd })
  if (isWorkAncestorR.ok) {
    return {
      status: 'can_ff_merge',
      conflictFiles: [],
      targetCommit: targetR.commit,
      workCommit: workR.commit,
    }
  }

  // 4. 三路合并模拟（git merge-tree --write-tree，git 2.38+）
  //    exit 0 = 无冲突，exit 非 0 = 有冲突（merge-tree 输出含冲突标记）
  const mergeR = await runGit(['merge-tree', '--write-tree', '--messages', targetR.commit, workR.commit], { cwd })
  if (mergeR.ok) {
    return {
      status: 'can_merge_clean',
      conflictFiles: [],
      targetCommit: targetR.commit,
      workCommit: workR.commit,
    }
  }
  // 解析冲突文件列表（merge-tree 输出格式：<<<<<<< <tree>...）
  const conflictFiles = parseConflictFiles(`${mergeR.stdout}\n${mergeR.stderr}`)
  return {
    status: conflictFiles.length > 0 ? 'has_conflicts' : 'unknown',
    conflictFiles,
    targetCommit: targetR.commit,
    workCommit: workR.commit,
    error: conflictFiles.length === 0 ? (mergeR.error ?? 'merge-tree produced no parseable output') : undefined,
  }
}

/**
 * 从 git merge-tree 输出解析冲突文件
 * 真实输出格式（git 2.53+）：
 *   <tree-hash>                                    # 合并结果 tree
 *   <mode> <blob-hash> <stage>\t<path>             # file metadata
 *   ...                                            # 多个文件
 *   自动合并 a.txt                                  # merge message (中文)
 *   冲突（内容）：合并冲突于 a.txt                  # conflict message (中文)
 *
 * 注意：merge-tree --write-tree 在 exit 0（clean）时只输出 tree-hash；
 *      在 exit 1（有冲突）时输出 tree + file metadata + 冲突消息。
 *      "冲突" 关键字（中文 git 翻译）+ stage 2/3 + 文件路径 = 冲突文件
 */
export function parseConflictFiles(mergeTreeOutput: string): string[] {
  const files = new Set<string>()
  for (const raw of mergeTreeOutput.split('\n')) {
    const line = raw.trim()
    if (line.length === 0) continue

    // 1. file metadata: "<mode> <blob> <stage>\t<path>"（stage 2/3 = 冲突）
    //    例: "100644 7898... 1\ta.txt"（stage 1 = base，2/3 = ours/theirs）
    const metaMatch = line.match(/^\d{6}\s+[0-9a-f]{7,}\s+[123]\s+(.+)$/)
    if (metaMatch) {
      const path = metaMatch[1]?.trim()
      if (path) files.add(path)
      continue
    }

    // 2. merge 消息：跳过"自动合并 X"行（仅信息，不一定冲突）
    // 3. "冲突（内容）：合并冲突于 X" / "CONFLICT (...) in X" → 强冲突信号
    const cnMatch = line.match(/冲突.*?\u4e8e\s+(.+)$/)
    if (cnMatch) {
      const path = cnMatch[1]?.trim()
      if (path) files.add(path)
      continue
    }
    const enMatch = line.match(/CONFLICT.*?in\s+(.+)$/)
    if (enMatch) {
      const path = enMatch[1]?.trim()
      if (path) files.add(path)
    }
  }
  return Array.from(files)
    .filter((f) => f.length > 0 && !f.includes(' '))
    .slice(0, 50)
}

// =============================================================================
// 副作用函数（PoC 阶段由状态机调用；明确划线：OXN 不替人 commit/merge）
// =============================================================================

/** 创建 work_branch（git switch -c） */
export async function createWorkBranch(branchName: string, base: string, cwd: string): Promise<GitResult> {
  return runGit(['switch', '-c', branchName, base], { cwd })
}

/** git worktree add（完全隔离的 working tree） */
export async function createWorktree(
  worktreePath: string,
  branchName: string,
  base: string,
  cwd: string,
): Promise<GitResult> {
  return runGit(['worktree', 'add', '-b', branchName, worktreePath, base], { cwd })
}

/** git worktree remove */
export async function removeWorktree(worktreePath: string, cwd: string): Promise<GitResult> {
  return runGit(['worktree', 'remove', '--force', worktreePath], { cwd })
}

/** 列出所有 worktree */
export async function listWorktrees(cwd: string): Promise<GitResult & { worktrees: string[] }> {
  const r = await runGit(['worktree', 'list', '--porcelain'], { cwd })
  const worktrees: string[] = []
  if (r.ok) {
    for (const line of r.stdout.split('\n')) {
      if (line.startsWith('worktree ')) worktrees.push(line.slice('worktree '.length).trim())
    }
  }
  return { ...r, worktrees }
}
