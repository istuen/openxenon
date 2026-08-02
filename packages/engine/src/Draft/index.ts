/**
 * Draft module — v0.6.2-alpha.3
 *
 * 6 操作 (v0.6.2 4 + v0.6.2-alpha.3 2):
 *   - v0.6.2: create / list / archive / discard
 *   - v0.6.2-alpha.3: promote / retarget
 *
 * 默认目录：`<boundaryDir>/drafts/`（默认 `.openxenon/drafts/`，可经 .oxnrc draftDir 配）
 * 文件命名：无 --prefix → <name>.md；有 --prefix → <prefix>-<name>.md
 * 文件内容：v0.6.2 空白（无 Template / frontmatter / Probe）;
 *          v0.6.2-alpha.3+ 可选带 frontmatter（来自 --target skeleton fork）
 * 本模块不依赖 L0-Processor / L1-Infra 之外层（仅 std fs）
 *
 * 详见：
 *   - .openxenon/assets/domains/oxn-draft-domain.md
 *   - .openxenon/assets/domains/oxn-draft-promote-domain.md
 */

import { join } from 'node:path'
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { getBoundaryDir } from '@openxenon/engine/infra/oxnrc'
import { forkDraftSkeleton, type DraftTarget, type DraftAssetKind } from './skeleton'

export {
  DRAFT_TARGETS,
  ASSET_KINDS,
  type DraftTarget,
  type DraftAssetKind,
  type ForkSkeletonInput,
  type ForkSkeletonResult,
  type ForkSkeletonError,
} from './skeleton'

export {
  promoteDraft,
  SUB_TARGETS,
  type PromoteDraftInput,
  type PromoteDraftResult,
  type PromoteDraftError,
  type PromoteDraftConfig,
  type SubTarget,
} from './promote'

export {
  dispatchPromote,
  type DispatchInput,
  type DispatchResult,
  type DispatchError,
} from './promote-dispatch'

export { retargetDraft, type RetargetDraftInput, type RetargetDraftResult, type RetargetDraftError } from './retarget'

export const DRAFT_PREFIXES = ['report', 'issue', 'design'] as const
export type DraftPrefix = (typeof DRAFT_PREFIXES)[number]

export interface CreateDraftInput {
  projectRoot: string
  name: string
  prefix?: DraftPrefix | null
  /** v0.6.2-alpha.3 新增: --target 参数 (rfc|asset|work) */
  target?: DraftTarget | null
  /** v0.6.2-alpha.3 新增: --kind 参数 (5 AssetKind,仅 target=asset 时) */
  kind?: DraftAssetKind | null
}

export interface CreateDraftResult {
  ok: true
  path: string
  name: string
  prefix: DraftPrefix | null
}

export interface CreateDraftError {
  ok: false
  code:
    | 'OXN_DRAFT_INVALID_NAME'
    | 'OXN_DRAFT_INVALID_PREFIX'
    | 'OXN_DRAFT_ALREADY_EXISTS'
    | 'OXN_DRAFT_TARGET_INVALID'
    | 'OXN_DRAFT_KIND_REQUIRED'
    | 'OXN_DRAFT_KIND_INVALID'
    | 'OXN_DRAFT_SKELETON_NOT_FOUND'
  message: string
  suggestion?: string
}

export interface DraftItem {
  name: string
  prefix: DraftPrefix | null
  path: string
  size: number
  mtime: string
  archived: boolean
}

export interface ListDraftsInput {
  projectRoot: string
  includeArchived?: boolean
}

export interface ListDraftsResult {
  drafts: DraftItem[]
}

export interface ArchiveDraftInput {
  projectRoot: string
  name: string
}

export interface ArchiveDraftResult {
  ok: true
  archivedPath: string
}

export interface DiscardDraftInput {
  projectRoot: string
  name: string
  force?: boolean
}

export interface DiscardDraftResult {
  ok: true
  deletedPath: string
}

export interface DraftOpsError {
  ok: false
  code:
    | 'OXN_DRAFT_NOT_FOUND'
    | 'OXN_DRAFT_INVALID_NAME'
    | 'OXN_DRAFT_ALREADY_EXISTS'
    | 'OXN_DRAFT_ALREADY_ARCHIVED'
    | 'OXN_DRAFT_NOT_ARCHIVED'
  message: string
  suggestion?: string
}

// ───────── 路径解析 ─────────

function getDraftDir(projectRoot: string, config: { draftDir?: string } | null = null): string {
  const boundaryDir = getBoundaryDir((config ?? null) as never)
  const root = config?.draftDir ?? 'drafts'
  return join(projectRoot, boundaryDir, root)
}

function getArchivedDir(projectRoot: string, config: { draftDir?: string } | null = null): string {
  return join(getDraftDir(projectRoot, config), '.archived')
}

function isValidDraftName(name: string): boolean {
  // kebab-case 或 camelCase，不含路径分隔符与扩展名
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name) && !name.includes('.') && !name.includes('/')
}

function parseDraftFileName(filename: string): { name: string; prefix: DraftPrefix | null } | null {
  if (!filename.endsWith('.md')) return null
  const base = filename.slice(0, -3)
  for (const p of DRAFT_PREFIXES) {
    if (base.startsWith(`${p}-`)) {
      return { name: base.slice(p.length + 1), prefix: p }
    }
  }
  return { name: base, prefix: null }
}

// ───────── create ─────────

export function createDraft(
  input: CreateDraftInput,
  config: { draftDir?: string } | null = null,
): CreateDraftResult | CreateDraftError {
  if (!isValidDraftName(input.name)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_INVALID_NAME',
      message: `Draft name "${input.name}" is invalid. Use kebab-case or camelCase, no path separators or extension.`,
      suggestion: 'Example: `my-design`, `MyDesign`, `rfc-0013-clarify`',
    }
  }
  if (input.prefix != null && !DRAFT_PREFIXES.includes(input.prefix)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_INVALID_PREFIX',
      message: `Draft prefix "${input.prefix}" is invalid.`,
      suggestion: `Valid prefixes: ${DRAFT_PREFIXES.join(', ')}`,
    }
  }

  const dir = getDraftDir(input.projectRoot, config)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const filename = input.prefix ? `${input.prefix}-${input.name}.md` : `${input.name}.md`
  const filePath = join(dir, filename)
  if (existsSync(filePath)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_ALREADY_EXISTS',
      message: `Draft "${filename}" already exists at ${filePath}`,
      suggestion: 'Use `oxn draft list` to see existing drafts, or pick a different name.',
    }
  }

  // v0.6.2-alpha.3: --target 模式派生 skeleton;无 --target 走空白模式（兼容 v0.6.2）
  let content = ''
  if (input.target != null) {
    const forkResult = forkDraftSkeleton(
      {
        projectRoot: input.projectRoot,
        target: input.target,
        kind: input.kind ?? null,
        name: input.name,
      },
      config,
    )
    if (!forkResult.ok) {
      return {
        ok: false,
        code: forkResult.code,
        message: forkResult.message,
        suggestion: forkResult.suggestion,
      }
    }
    content = forkResult.content
  }

  writeFileSync(filePath, content, 'utf-8')
  return { ok: true, path: filePath, name: input.name, prefix: input.prefix ?? null }
}

// ───────── list ─────────

export function listDrafts(input: ListDraftsInput, config: { draftDir?: string } | null = null): ListDraftsResult {
  const dir = getDraftDir(input.projectRoot, config)
  if (!existsSync(dir)) return { drafts: [] }

  const items: DraftItem[] = []
  const scan = (subDir: string, archived: boolean): void => {
    if (!existsSync(subDir)) return
    for (const f of readdirSync(subDir)) {
      if (!f.endsWith('.md')) continue
      const parsed = parseDraftFileName(f)
      if (!parsed) continue
      const fullPath = join(subDir, f)
      const stat = statSync(fullPath)
      items.push({
        name: f.replace(/\.md$/, ''),
        prefix: parsed.prefix,
        path: fullPath,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        archived,
      })
    }
  }

  scan(dir, false)
  if (input.includeArchived) {
    scan(getArchivedDir(input.projectRoot, config), true)
  }
  // 按 mtime 降序
  items.sort((a, b) => b.mtime.localeCompare(a.mtime))
  return { drafts: items }
}

// ───────── archive ─────────

export function archiveDraft(
  input: ArchiveDraftInput,
  config: { draftDir?: string } | null = null,
): ArchiveDraftResult | DraftOpsError {
  if (!isValidDraftName(input.name)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_INVALID_NAME',
      message: `Draft name "${input.name}" is invalid.`,
    }
  }

  const dir = getDraftDir(input.projectRoot, config)
  const archivedDir = getArchivedDir(input.projectRoot, config)

  // 解析 filePath（兼容 name 带或不带 prefix）
  const candidates = [input.name, ...DRAFT_PREFIXES.map((p) => `${p}-${input.name}`)].map((n) => `${n}.md`)
  let sourcePath: string | null = null
  let sourceFilename: string | null = null
  for (const filename of candidates) {
    const fullPath = join(dir, filename)
    if (existsSync(fullPath)) {
      sourcePath = fullPath
      sourceFilename = filename
      break
    }
  }
  if (!sourcePath || !sourceFilename) {
    return {
      ok: false,
      code: 'OXN_DRAFT_NOT_FOUND',
      message: `Draft "${input.name}" not found in ${dir}`,
      suggestion: 'Use `oxn draft list` to see existing drafts.',
    }
  }

  if (!existsSync(archivedDir)) {
    mkdirSync(archivedDir, { recursive: true })
  }

  const targetPath = join(archivedDir, sourceFilename)
  if (existsSync(targetPath)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_ALREADY_ARCHIVED',
      message: `Draft "${sourceFilename}" already exists in archive.`,
      suggestion: 'Discard the archived copy first, or rename the active draft.',
    }
  }

  renameSync(sourcePath, targetPath)
  return { ok: true, archivedPath: targetPath }
}

// ───────── discard ─────────

export function discardDraft(
  input: DiscardDraftInput,
  config: { draftDir?: string } | null = null,
): DiscardDraftResult | DraftOpsError {
  if (!input.force) {
    return {
      ok: false,
      code: 'OXN_DRAFT_NOT_FOUND',
      message: 'discard requires --force flag (safety: this is a destructive operation)',
    }
  }
  if (!isValidDraftName(input.name)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_INVALID_NAME',
      message: `Draft name "${input.name}" is invalid.`,
    }
  }

  const dir = getDraftDir(input.projectRoot, config)
  const archivedDir = getArchivedDir(input.projectRoot, config)

  // 优先从 active 目录找；找不到再从 archived 找
  const candidates = [input.name, ...DRAFT_PREFIXES.map((p) => `${p}-${input.name}`)].map((n) => `${n}.md`)
  const searchDirs = [dir, archivedDir]
  let deletedPath: string | null = null
  for (const d of searchDirs) {
    for (const filename of candidates) {
      const fullPath = join(d, filename)
      if (existsSync(fullPath)) {
        deletedPath = fullPath
        break
      }
    }
    if (deletedPath) break
  }
  if (!deletedPath) {
    return {
      ok: false,
      code: 'OXN_DRAFT_NOT_FOUND',
      message: `Draft "${input.name}" not found in active or archived directory.`,
      suggestion: 'Use `oxn draft list [--include-archived]` to see existing drafts.',
    }
  }

  unlinkSync(deletedPath)
  return { ok: true, deletedPath }
}

// ───────── unarchive (helper for future; not in CLI v1) ─────────

export function unarchiveDraft(
  input: ArchiveDraftInput,
  config: { draftDir?: string } | null = null,
): ArchiveDraftResult | DraftOpsError {
  if (!isValidDraftName(input.name)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_INVALID_NAME',
      message: `Draft name "${input.name}" is invalid.`,
    }
  }
  const dir = getDraftDir(input.projectRoot, config)
  const archivedDir = getArchivedDir(input.projectRoot, config)
  const candidates = [input.name, ...DRAFT_PREFIXES.map((p) => `${p}-${input.name}`)].map((n) => `${n}.md`)
  let sourcePath: string | null = null
  let sourceFilename: string | null = null
  for (const filename of candidates) {
    const fullPath = join(archivedDir, filename)
    if (existsSync(fullPath)) {
      sourcePath = fullPath
      sourceFilename = filename
      break
    }
  }
  if (!sourcePath || !sourceFilename) {
    return {
      ok: false,
      code: 'OXN_DRAFT_NOT_FOUND',
      message: `Draft "${input.name}" not found in archive.`,
    }
  }
  const targetPath = join(dir, sourceFilename)
  if (existsSync(targetPath)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_ALREADY_EXISTS',
      message: `Draft "${sourceFilename}" already exists in active directory.`,
    }
  }
  renameSync(sourcePath, targetPath)
  return { ok: true, archivedPath: targetPath }
}
