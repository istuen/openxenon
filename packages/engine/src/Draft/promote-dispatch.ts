/**
 * Draft promote dispatch module — v0.6.3 NG6
 *
 * 设计来源：
 *   - RFC-0019 §3.3 + §6.3 Phase 4 dispatch-target
 *   - .openxenon/assets/blueprints/promote-target-aware-workflow.md §Tasks
 *
 * 职责：
 *   - 7 sub-target 实际写文件（v0.6.2-alpha.3 仅返回 dispatch 信息）
 *   - 转换 Draft 内容为 target 格式
 *   - 处理 RFC-XXXX 自动编号
 *   - 处理 target 路径冲突（force flag）
 *
 * 关键约束：
 *   - 源 Draft 不变（写文件后 source mtime 不变）
 *   - 默认不覆盖现有文件（--force 显式覆盖）
 *   - 写失败事务回滚（创建空 → 写 → 失败则删除）
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DraftTarget, DraftAssetKind } from './skeleton'
import type { SubTarget } from './promote'

export interface DispatchInput {
  projectRoot: string
  /** Draft 名称 (e.g., "v0.6.2-draft-promote-routing") */
  name: string
  target: DraftTarget
  kind: DraftAssetKind | null
  /** 解析后的 sub-target */
  subTarget: SubTarget
  /** Draft 解析后的 frontmatter */
  draftFrontmatter: Record<string, string>
  /** Draft 解析后的 body */
  draftBody: string
  /** 是否覆盖现有目标文件 */
  force?: boolean
  /** v0.6.3 Fix #2: 目标目录覆盖（相对 projectRoot）；优先级高于 .oxnrc */
  targetDirOverride?: string
  /** v0.6.3 Fix #2: .oxnrc 配置（从 ProjectConfig.draftPromote 读） */
  config?: {
    draftPromote?: {
      rfcDir?: string
      assetDirs?: {
        domain?: string
        workflow?: string
        stack?: string
        blueprint?: string
        roadmap?: string
      }
      workDir?: string
    }
  } | null
  /** v0.5.0 D2: target=goal 必填（promote 阶段校验后传入） */
  goalSlug?: string
  /** v0.5.0 D2: 强制 auto git checkout（默认 true；仅 target=goal 有效） */
  gitBranchAuto?: boolean
}

export interface DispatchResult {
  ok: true
  /** 实际写入的文件路径（绝对路径） */
  targetPath: string
  /** RFC 编号（如 RFC-0019）— 仅 target=rfc 有意义 */
  rfcNumber: string | null
  /** 写入字节数 */
  bytesWritten: number
  /** 是否为新建（true）or 覆盖（false） */
  created: boolean
  /** v0.5.0 D2: auto 创建的 branch 名 (仅 target=goal) */
  branch?: string | null
}

export interface DispatchError {
  ok: false
  code:
    | 'OXN_DRAFT_PROMOTE_TARGET_EXISTS'
    | 'OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED'
    | 'OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID'
    | 'OXN_DRAFT_PROMOTE_GIT_BRANCH_FAILED'
    | 'OXN_DRAFT_PROMOTE_GOAL_BRANCH_EXISTS'
  message: string
  suggestion?: string
}

// ──────────────── RFC-XXXX 自动编号 ────────────────

function scanExistingRFCNumbers(projectRoot: string): number[] {
  const rfcDir = join(projectRoot, 'docs', 'rfc', 'zh-cn')
  if (!existsSync(rfcDir)) return []

  const numbers: number[] = []
  for (const f of readdirSync(rfcDir)) {
    const m = f.match(/^RFC-(\d{4})-/)
    if (m?.[1]) {
      numbers.push(parseInt(m[1], 10))
    }
  }
  return numbers
}

function nextRFCNumber(projectRoot: string): string {
  const numbers = scanExistingRFCNumbers(projectRoot)
  const max = numbers.length > 0 ? Math.max(...numbers) : 18 // 默认从 0019 开始 (RFC-0018 是 Meta RFC)
  return `RFC-${String(max + 1).padStart(4, '0')}`
}

// ──────────────── Per-target frontmatter 生成 ────────────────

function buildRFCFrontmatter(frontmatter: Record<string, string>, rfcNumber: string): string {
  const theme = frontmatter.theme || 'TODO_<theme>'
  const today = new Date().toISOString().slice(0, 10)
  const fields: Record<string, string> = {
    entity: 'rfc',
    id: rfcNumber,
    theme,
    status: frontmatter.status || 'Draft',
    date: today,
    'synced-at': today,
  }
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

function buildAssetFrontmatter(frontmatter: Record<string, string>, kind: DraftAssetKind, name: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const fields: Record<string, string> = {
    entity: kind,
    version: frontmatter.version || '0.1.0',
    name: frontmatter.name || name,
    abstract: frontmatter.abstract || 'TODO: one-line description',
    references: frontmatter.references || '[]',
    citations: frontmatter.citations || '0',
    'synced-at': today,
  }
  // domain PascalCase 名 (e.g., MemberContext); 其他 kebab-case
  if (kind === 'domain') {
    fields.name = toPascalCase(name)
  }
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

function buildWorkFrontmatter(frontmatter: Record<string, string>, name: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const fields: Record<string, string> = {
    entity: 'work',
    workId: frontmatter.workId || name,
    intent: frontmatter.intent || 'TODO: one-line description',
    createdAt: frontmatter.createdAt || today,
    status: frontmatter.status || 'aligning',
    currentRound: frontmatter.currentRound || '1',
    references: frontmatter.references || '[]',
    'synced-at': today,
  }
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

function toPascalCase(s: string): string {
  return s
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

// ──────────────── Per-target path + content ────────────────

interface TargetSpec {
  targetPath: string
  content: string
}

function buildRFCTarget(
  projectRoot: string,
  frontmatter: Record<string, string>,
  body: string,
  targetDirOverride?: string,
  configRfcDir?: string,
): TargetSpec & { rfcNumber: string } {
  const rfcNumber = nextRFCNumber(projectRoot)
  const theme = frontmatter.theme || 'TODO'
  const filename = `${rfcNumber}-${theme}.md`
  // v0.6.3 Fix #2: targetDirOverride > config.rfcDir > default
  const dirRel = targetDirOverride || (configRfcDir ?? join('docs', 'rfc', 'zh-cn'))
  const targetPath = join(projectRoot, dirRel, filename)
  const fm = buildRFCFrontmatter(frontmatter, rfcNumber)
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`
  return { targetPath, content, rfcNumber }
}

function buildAssetTarget(
  projectRoot: string,
  name: string,
  kind: DraftAssetKind,
  frontmatter: Record<string, string>,
  body: string,
  targetDirOverride?: string,
  configAssetDirs?: { domain?: string; workflow?: string; stack?: string; blueprint?: string; assetmap?: string }, // 🆕 v0.6.4: 'roadmap' → 'assetmap'
): TargetSpec {
  // v0.6.3 Fix #2: targetDirOverride > config.assetDirs[kind] > default
  const defaultDir = kind === 'assetmap' ? 'assetmaps' : `${kind}s` // 🆕 v0.6.4: 'roadmap' → 'assetmap'
  const dirRel = targetDirOverride || (configAssetDirs?.[kind] ?? join('.openxenon', 'assets', defaultDir))
  // Domain 用 PascalCase 文件名（如 MemberContext.md）; 其他用 kebab-case
  const filename = kind === 'domain' ? `${toPascalCase(name)}.md` : `${name}.md`
  const targetPath = join(projectRoot, dirRel, filename)
  const fm = buildAssetFrontmatter(frontmatter, kind, name)
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`
  return { targetPath, content }
}

function buildWorkTarget(
  projectRoot: string,
  name: string,
  frontmatter: Record<string, string>,
  body: string,
  targetDirOverride?: string,
  configWorkDir?: string,
): TargetSpec {
  // v0.6.3 Fix #2: targetDirOverride > config.workDir > default
  const dirRel = targetDirOverride || (configWorkDir ?? join('.openxenon', 'works'))
  const targetPath = join(projectRoot, dirRel, name, 'work.md')
  const fm = buildWorkFrontmatter(frontmatter, name)
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`
  return { targetPath, content }
}

// ──────────────── v0.5.0 D2: Goal target ────────────────

function buildGoalFrontmatter(frontmatter: Record<string, string>, goalSlug: string, sourceDraftPath?: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const branchName = `feat/goal-${goalSlug}`
  const fields: Record<string, string> = {
    id: goalSlug,
    theme: frontmatter.theme || 'TODO_<theme>',
    priority: frontmatter.priority || 'medium',
    status: 'planned',
    'created-at': frontmatter['created-at'] || today,
    'scheduled-version': '~',
    'synced-at': today,
    branch: branchName,
    source: 'draft',
  }
  if (sourceDraftPath) {
    fields['source-ref'] = sourceDraftPath
  }
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

function buildGoalTarget(
  projectRoot: string,
  goalSlug: string,
  frontmatter: Record<string, string>,
  body: string,
  targetDirOverride?: string,
): TargetSpec {
  // v0.5.0 D2: targetDirOverride > default dev/pool/
  const dirRel = targetDirOverride || join('dev', 'pool')
  const targetPath = join(projectRoot, dirRel, `${goalSlug}.md`)
  const fm = buildGoalFrontmatter(frontmatter, goalSlug)
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`
  return { targetPath, content }
}

/**
 * v0.5.0 D2: auto `git checkout -b feat/goal-<slug> dev` (or main if dev 不存在).
 * 分支已存在报 OXN_DRAFT_PROMOTE_GOAL_BRANCH_EXISTS。
 */
function ensureGoalBranch(
  projectRoot: string,
  slug: string,
):
  | {
      ok: true
      branch: string
    }
  | DispatchError {
  const branchName = `feat/goal-${slug}`
  // 1. 检查分支是否已存在
  const checkExists = Bun.spawnSync({
    cmd: ['git', 'rev-parse', '--verify', '--quiet', `refs/heads/${branchName}`],
    cwd: projectRoot,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
  if (checkExists.exitCode === 0) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_GOAL_BRANCH_EXISTS',
      message: `Branch ${branchName} already exists.`,
      suggestion: `Use existing branch (\`git checkout ${branchName}\`) or remove with \`git branch -D ${branchName}\` then retry.`,
    }
  }

  // 2. 选 base branch：dev 优先；不存在用 main
  const hasDev =
    Bun.spawnSync({
      cmd: ['git', 'rev-parse', '--verify', '--quiet', 'refs/heads/dev'],
      cwd: projectRoot,
    }).exitCode === 0
  const base = hasDev ? 'dev' : 'main'

  // 3. checkout -b
  const result = Bun.spawnSync({
    cmd: ['git', 'checkout', '-b', branchName, base],
    cwd: projectRoot,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
  if (result.exitCode !== 0) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_GIT_BRANCH_FAILED',
      message: `git checkout -b ${branchName} ${base} failed: ${result.stderr?.toString() ?? 'unknown'}`,
      suggestion: 'Verify git repo state and base branch access.',
    }
  }
  return { ok: true, branch: branchName }
}

// ──────────────── 公开 API ────────────────

export function dispatchPromote(input: DispatchInput): DispatchResult | DispatchError {
  let spec: TargetSpec & { rfcNumber?: string }
  let rfcNumber: string | null = null
  let goalBranch: string | null = null

  const cfg = input.config?.draftPromote
  if (input.target === 'rfc') {
    const r = buildRFCTarget(
      input.projectRoot,
      input.draftFrontmatter,
      input.draftBody,
      input.targetDirOverride,
      cfg?.rfcDir,
    )
    spec = { targetPath: r.targetPath, content: r.content }
    rfcNumber = r.rfcNumber
  } else if (input.target === 'asset' && input.kind) {
    spec = buildAssetTarget(
      input.projectRoot,
      input.name,
      input.kind,
      input.draftFrontmatter,
      input.draftBody,
      input.targetDirOverride,
      cfg?.assetDirs,
    )
  } else if (input.target === 'work') {
    spec = buildWorkTarget(
      input.projectRoot,
      input.name,
      input.draftFrontmatter,
      input.draftBody,
      input.targetDirOverride,
      cfg?.workDir,
    )
  } else if (input.target === 'goal') {
    // v0.5.0 D2: target=goal 必带 goalSlug（已上游校验）
    if (!input.goalSlug) {
      return {
        ok: false,
        code: 'OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID',
        message: 'target=goal requires goalSlug (should be checked upstream)',
      }
    }
    spec = buildGoalTarget(
      input.projectRoot,
      input.goalSlug,
      input.draftFrontmatter,
      input.draftBody,
      input.targetDirOverride,
    )
  } else {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID',
      message: `Unknown target/kind combination: ${input.target}/${input.kind}`,
    }
  }

  const absTargetPath = spec.targetPath

  // 1. 检查路径冲突
  const existed = existsSync(absTargetPath)
  if (existed && !input.force) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_TARGET_EXISTS',
      message: `Target file already exists: ${absTargetPath}`,
      suggestion: 'Pass --force to overwrite, or pick a different draft name.',
    }
  }

  // 2. 创建父目录（如需要）
  const parentDir = dirname(absTargetPath)
  try {
    mkdirSync(parentDir, { recursive: true })
  } catch (_err) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED',
      message: `Failed to create parent directory: ${parentDir}`,
      suggestion: 'Check directory permissions.',
    }
  }

  // 3. 写文件（带事务语义：失败则删除已创建文件）
  let created = false
  try {
    writeFileSync(absTargetPath, spec.content, 'utf-8')
    created = !existed
  } catch (err) {
    if (!existed) {
      try {
        unlinkSync(absTargetPath)
      } catch {
        // ignore cleanup failure
      }
    }
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED',
      message: `Failed to write target file: ${absTargetPath} (${err instanceof Error ? err.message : String(err)})`,
    }
  }

  // 4. v0.5.0 D2: target=goal 时 auto git checkout -b feat/goal-<slug> dev
  // 失败回滚：删除已创建文件 + 不留分支
  if (input.target === 'goal' && input.goalSlug && input.gitBranchAuto !== false) {
    const branchResult = ensureGoalBranch(input.projectRoot, input.goalSlug)
    if (!branchResult.ok) {
      // 回滚：删除已创建文件
      if (created) {
        try {
          unlinkSync(absTargetPath)
        } catch {
          // ignore cleanup failure
        }
      }
      return branchResult
    }
    goalBranch = branchResult.branch
  }

  return {
    ok: true,
    targetPath: absTargetPath,
    rfcNumber,
    bytesWritten: Buffer.byteLength(spec.content, 'utf-8'),
    created,
    branch: goalBranch,
  }
}
