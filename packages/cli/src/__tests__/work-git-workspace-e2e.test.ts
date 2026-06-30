// =============================================================================
// work-git-workspace-e2e.test.ts — git worktree 工作空间 e2e
//
// 方案 B：OXN 端到端验证 git worktree 工作空间；OXN 不替人 commit / merge，
// 只用 L1 git 适配器（src/infra/git/workspace.ts）+ catalog git probes
// （git-clean / git-branch-exists / git-status-clean / git-merge-feasible）
// 产出可合并性证据，**不实际** git merge。
//
// 流程（与文档"步骤 1-7"对应）：
//   1. mkdtemp + git init + 初始 commit + oxn init
//   2. cp builtin blueprint (git-workflow.oxn) → .openxenon/blueprints/
//   3. domain + work create + add-task + validate + lock
//   4. git worktree add -b feat/<w>  （人工命令 — OXN 观察）
//   5. 在 worktree 改文件 + git add
//   6. run work + 4 次 submit（4 part = 4 slot）
//   7. 调 L1 适配器：
//        can_ff_merge：fast-forward 路径
//        has_conflicts：故意制造冲突
//   8. 清理 worktree + branch
//
// 跑法：bun test src/cli/__tests__/work-git-workspace-e2e.test.ts
// 跳过条件：git 二进制不可用（用 isGitAvailable 探测）
// =============================================================================

import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { isGitAvailable, runGit, checkMergeFeasibility } from '@openxenon/engine/infra/git/workspace'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')
const BUILTIN_BP_SRC = join(import.meta.dir, '..', '..', '..', '..', 'src', 'builtin', 'blueprints', 'git-workflow.oxn')

let tmpDir: string
let gitAvailable = true

beforeAll(async () => {
  gitAvailable = await isGitAvailable()
  if (!gitAvailable) {
    console.warn('⚠️  git binary not available — skipping git-workspace e2e suite')
  }
})

beforeEach(() => {
  if (!gitAvailable) return
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-git-workflow-'))
})

afterEach(() => {
  if (!gitAvailable) return
  if (existsSync(tmpDir)) {
    // worktree + 分支的清理在每个 test 自己负责；这里只兜底 rm tmp
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// 工具：CLI 进程 / git 命令 / 工程初始化
// ---------------------------------------------------------------------------

async function runCli(args: string[], cwd = tmpDir): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function git(args: string[], cwd: string): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const r = await runGit(args, { cwd, timeoutMs: 15000 })
  return { ok: r.ok, stdout: r.stdout, stderr: r.stderr }
}

async function gitInitWithCommit(cwd: string, initialBranch = 'main'): Promise<void> {
  await git(['init', '--initial-branch', initialBranch], cwd)
  await git(['config', 'user.email', 'oxn-test@example.com'], cwd)
  await git(['config', 'user.name', 'OXN Test'], cwd)
  writeFileSync(join(cwd, 'README.md'), '# OXN e2e fixture\n')
  await git(['add', 'README.md'], cwd)
  await git(['commit', '-m', 'init'], cwd)
}

async function oxnInit(cwd: string): Promise<void> {
  const r = await runCli(['init'], cwd)
  expect(r.exitCode).toBe(0)
}

async function setupProjectWithGitWorkflow(workName: string): Promise<{ workDir: string; mainRepo: string }> {
  const mainRepo = tmpDir
  await gitInitWithCommit(mainRepo)
  await oxnInit(mainRepo)
  // mkdir prj 边界子目录（oxn init 只建 .openxenon/ 根 + .gitignore）
  mkdirSync(join(mainRepo, '.openxenon', 'blueprints'), { recursive: true })
  mkdirSync(join(mainRepo, '.openxenon', 'domains'), { recursive: true })
  // cp builtin blueprint → prj 边界
  copyFileSync(BUILTIN_BP_SRC, join(mainRepo, '.openxenon', 'blueprints', 'git-workflow.oxn'))
  // domain（最小：单一 term）
  const domainOxn = `domain "ProgramContext" {
  description = "git workspace test domain"
  term { "WorkingTree": "git working tree" }
  invariant { "head is clean before merge" }
}
`
  writeFileSync(join(mainRepo, '.openxenon', 'domains', 'program-context.oxn'), domainOxn)
  // work create + add-task + 4 part
  const createR = await runCli(['work', 'create', workName, '--blueprint', 'git-workflow', '--json'], mainRepo)
  expect(createR.exitCode).toBe(0)
  // 注入 context / domain ref / task 块
  const workOxnPath = join(mainRepo, '.openxenon', 'works', workName, 'work.oxn')
  writeFileSync(
    workOxnPath,
    `work "${workName}" {
  context {
    goal = "git worktree e2e";
    constraints = ["do not commit on main"];
    } loop_policy { max_iterations = 3; }
  domain "ProgramContext" ref "@prj/domains/program-context";
  blueprint "git-workflow" ref "@prj/blueprints/git-workflow";

  task "ship" {
    domain "ProgramContext"
    blueprint "git-workflow"
  }
}
`,
  )
  // add-task
  const addR = await runCli(
    [
      'work',
      'add-task',
      workName,
      '--task',
      'ship',
      '--blueprint',
      'git-workflow',
      '--domain',
      'ProgramContext',
      '--json',
    ],
    mainRepo,
  )
  expect(addR.exitCode).toBe(0)
  // task.oxn 4 parts（与 blueprint 的 4 slot 一一对应）
  const taskOxnPath = join(mainRepo, '.openxenon', 'works', workName, 'tasks', 'ship', 'task.oxn')
  writeFileSync(
    taskOxnPath,
    `task "ship" {
  blueprint "git-workflow"
  domain "ProgramContext"
  part "ensure_clean_workspace" { skill_context = "verify tree clean + base branch exists" }
  part "prepare_branch"          { skill_context = "git status clean" }
  part "develop"                 { skill_context = "implement feature" }
  part "verify_merge_feasible"   { skill_context = "git-merge-feasible" }
}
`,
  )
  // validate + lock
  const v = JSON.parse((await runCli(['work', 'validate', workName, '--json'], mainRepo)).stdout)
  expect(v.ok).toBe(true)
  const lk = JSON.parse((await runCli(['work', 'lock', workName, '--json'], mainRepo)).stdout)
  expect(lk.ok).toBe(true)
  return { workDir: join(mainRepo, '.openxenon', 'works', workName), mainRepo }
}

async function cleanupWorktree(mainRepo: string, worktreePath: string, branch: string): Promise<void> {
  await git(['worktree', 'remove', '--force', worktreePath], mainRepo)
  await git(['branch', '-D', branch], mainRepo)
  if (existsSync(worktreePath)) rmSync(worktreePath, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 测试
// ---------------------------------------------------------------------------

describe('git worktree 工作空间 e2e（方案 B）', () => {
  test('1. happy path：work + worktree + L1 探针 → can_ff_merge', async () => {
    if (!gitAvailable) return
    const workName = 'gw-happy'
    const branch = `feat/${workName}`
    const worktreePath = join(tmpDir, 'wt-happy')
    await setupProjectWithGitWorkflow(workName)

    // commit 所有 .oxn 工件（避免 checkMergeFeasibility 的 dirty_worktree 误报）
    await git(['add', '-A'], tmpDir)
    await git(['commit', '-m', 'test: add oxn artifacts'], tmpDir)

    // 在 main 仓里建 worktree
    const wtAdd = await git(['worktree', 'add', '-b', branch, worktreePath], tmpDir)
    expect(wtAdd.ok).toBe(true)
    expect(existsSync(worktreePath)).toBe(true)

    // 在 worktree 里 commit（OXN 观察，不替人 commit — 由测试 fixture 模拟"工程师在 worktree 干活"）
    writeFileSync(join(worktreePath, 'feature.txt'), 'feature work\n')
    await git(['add', 'feature.txt'], worktreePath)
    await git(['commit', '-m', 'feat: add feature'], worktreePath)

    // run + 4 次 submit（4 part = 4 slot）
    const run = JSON.parse((await runCli(['work', 'run', workName, '--json'], tmpDir)).stdout)
    expect(run.ok).toBe(true)
    for (let i = 0; i < 4; i++) {
      const sub = JSON.parse((await runCli(['work', 'submit', workName, '--task', 'ship', '--json'], tmpDir)).stdout)
      expect(sub.ok).toBe(true)
    }
    const status = JSON.parse((await runCli(['work', 'status', workName, '--json'], tmpDir)).stdout)
    expect(status.data.overallStatus).toBe('passed')

    // 调 L1 适配器（这是 OXN 的"探针"——不实际 merge）
    const feasibility = await checkMergeFeasibility(branch, 'main', worktreePath)
    expect(feasibility.status).toBe('can_ff_merge')
    expect(feasibility.conflictFiles).toEqual([])

    // 清理
    await cleanupWorktree(tmpDir, worktreePath, branch)
  })

  test('2. 冲突场景：故意制造冲突 → L1 探针 → has_conflicts', async () => {
    if (!gitAvailable) return
    const workName = 'gw-conflict'
    const branch = `feat/${workName}`
    const worktreePath = join(tmpDir, 'wt-conflict')
    await setupProjectWithGitWorkflow(workName)

    // commit 所有 .oxn 工件（避免 checkMergeFeasibility 的 dirty_worktree 误报）
    await git(['add', '-A'], tmpDir)
    await git(['commit', '-m', 'test: add oxn artifacts'], tmpDir)

    const wtAdd = await git(['worktree', 'add', '-b', branch, worktreePath], tmpDir)
    expect(wtAdd.ok).toBe(true)

    // 分支侧改 README.md 第一行
    writeFileSync(join(worktreePath, 'README.md'), '# OXN e2e fixture (branch edit)\n')
    await git(['add', 'README.md'], worktreePath)
    await git(['commit', '-m', 'branch: edit README'], worktreePath)

    // 主侧（main）也改 README.md 第一行（同步进行 — 模拟工程师忘记 pull）
    writeFileSync(join(tmpDir, 'README.md'), '# OXN e2e fixture (main edit)\n')
    await git(['add', 'README.md'], tmpDir)
    await git(['commit', '-m', 'main: edit README'], tmpDir)

    // run + submit（流程仍能跑通；OXN 不阻止冲突，conflict 判定由探针做）
    const run = JSON.parse((await runCli(['work', 'run', workName, '--json'], tmpDir)).stdout)
    expect(run.ok).toBe(true)
    for (let i = 0; i < 4; i++) {
      const sub = JSON.parse((await runCli(['work', 'submit', workName, '--task', 'ship', '--json'], tmpDir)).stdout)
      expect(sub.ok).toBe(true)
    }

    // 探针：在 worktree 内（避免主仓 dir 污染；worktree 跟踪的是 .oxn 工件，但提交后无 untracked）
    const feasibility = await checkMergeFeasibility(branch, 'main', worktreePath)
    expect(feasibility.status).toBe('has_conflicts')
    expect(feasibility.conflictFiles).toContain('README.md')

    await cleanupWorktree(tmpDir, worktreePath, branch)
  })

  test('3. 锁后漂移 per-work blueprints slim 索引 → context 报 HASH_MISMATCH（planLock 守卫）', async () => {
    if (!gitAvailable) return
    const workName = 'gw-drift'
    await setupProjectWithGitWorkflow(workName)
    await git(['add', '-A'], tmpDir)
    await git(['commit', '-m', 'test: add oxn artifacts'], tmpDir)

    // 漂移 per-work 蓝图 slim 索引（works/<w>/blueprints.json — planLock 锁的就是这个）
    const bpIndexPath = join(tmpDir, '.openxenon', 'works', workName, 'blueprints.json')
    const original = readFileSync(bpIndexPath, 'utf-8')
    writeFileSync(bpIndexPath, original.replace('"git-workflow"', '"git-workflow_DRIFTED"'))

    const ctx = JSON.parse((await runCli(['work', 'context', workName, '--task', 'ship', '--json'], tmpDir)).stdout)
    expect(ctx.ok).toBe(false)
    expect(ctx.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(ctx.error.context.component).toBe('blueprints')
  })

  test('4. builtin 蓝图与 catalog 4 git probe 一一对应（接口契约守卫）', () => {
    const bpSource = readFileSync(BUILTIN_BP_SRC, 'utf-8')
    for (const probe of ['git-clean', 'git-branch-exists', 'git-status-clean', 'git-merge-feasible']) {
      expect(bpSource).toContain(`"${probe}"`)
    }
  })
})
