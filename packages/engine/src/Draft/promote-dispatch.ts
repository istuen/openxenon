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
}

export interface DispatchError {
  ok: false
  code:
    | 'OXN_DRAFT_PROMOTE_TARGET_EXISTS'
    | 'OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED'
    | 'OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID'
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
    if (m && m[1]) {
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
  const theme = frontmatter['theme'] || 'TODO_<theme>'
  const today = new Date().toISOString().slice(0, 10)
  const fields: Record<string, string> = {
    entity: 'rfc',
    id: rfcNumber,
    theme,
    status: frontmatter['status'] || 'Draft',
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
    version: frontmatter['version'] || '0.1.0',
    name: frontmatter['name'] || name,
    abstract: frontmatter['abstract'] || 'TODO: one-line description',
    references: frontmatter['references'] || '[]',
    citations: frontmatter['citations'] || '0',
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
    workId: frontmatter['workId'] || name,
    intent: frontmatter['intent'] || 'TODO: one-line description',
    createdAt: frontmatter['createdAt'] || today,
    status: frontmatter['status'] || 'aligning',
    currentRound: frontmatter['currentRound'] || '1',
    references: frontmatter['references'] || '[]',
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
): TargetSpec & { rfcNumber: string } {
  const rfcNumber = nextRFCNumber(projectRoot)
  const theme = frontmatter['theme'] || 'TODO'
  const filename = `${rfcNumber}-${theme}.md`
  const targetPath = join(projectRoot, 'docs', 'rfc', 'zh-cn', filename)
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
): TargetSpec {
  const dir = kind === 'roadmap' ? 'assetmaps' : `${kind}s`
  // Domain 用 PascalCase 文件名（如 MemberContext.md）; 其他用 kebab-case
  const filename = kind === 'domain' ? `${toPascalCase(name)}.md` : `${name}.md`
  const targetPath = join(projectRoot, '.openxenon', 'assets', dir, filename)
  const fm = buildAssetFrontmatter(frontmatter, kind, name)
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`
  return { targetPath, content }
}

function buildWorkTarget(
  projectRoot: string,
  name: string,
  frontmatter: Record<string, string>,
  body: string,
): TargetSpec {
  const targetPath = join(projectRoot, '.openxenon', 'works', name, 'work.md')
  const fm = buildWorkFrontmatter(frontmatter, name)
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`
  return { targetPath, content }
}

// ──────────────── 公开 API ────────────────

export function dispatchPromote(input: DispatchInput): DispatchResult | DispatchError {
  let spec: TargetSpec & { rfcNumber?: string }
  let rfcNumber: string | null = null

  if (input.target === 'rfc') {
    const r = buildRFCTarget(input.projectRoot, input.draftFrontmatter, input.draftBody)
    spec = { targetPath: r.targetPath, content: r.content }
    rfcNumber = r.rfcNumber
  } else if (input.target === 'asset' && input.kind) {
    spec = buildAssetTarget(input.projectRoot, input.name, input.kind, input.draftFrontmatter, input.draftBody)
  } else if (input.target === 'work') {
    spec = buildWorkTarget(input.projectRoot, input.name, input.draftFrontmatter, input.draftBody)
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
  } catch (err) {
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

  return {
    ok: true,
    targetPath: absTargetPath,
    rfcNumber,
    bytesWritten: Buffer.byteLength(spec.content, 'utf-8'),
    created,
  }
}
