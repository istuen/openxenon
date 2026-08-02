/**
 * Draft skeleton fork module — v0.6.2-alpha.3
 *
 * 设计来源：
 *   - .openxenon/drafts/draft-system-design-grilling.md §DraftSkeleton
 *   - .openxenon/assets/domains/oxn-draft-promote-domain.md §SkeletonForking
 *   - .openxenon/assets/workflows/draft-skeleton-fork.md
 *
 * 职责：
 *   - 从 `.openxenon/assets/blueprints/draft-skeletons/<target>[-<kind>].md` 派生 skeleton
 *   - 注入 frontmatter 字段（promote-target / promote-kind / created-from / synced-at）
 *   - 不写文件本身（由 caller 写）
 *
 * 7 个 skeleton 模板（v0.6.2-alpha.3 全建）：
 *   - rfc.md
 *   - asset-domain.md / asset-workflow.md / asset-stack.md / asset-blueprint.md / asset-roadmap.md
 *   - work.md
 *
 * 关键约束：
 *   - skeleton 模板不存在 → 报 OXN_DRAFT_SKELETON_NOT_FOUND（不静默降级）
 *   - promote-target=asset 但缺 --kind → 报 OXN_DRAFT_KIND_REQUIRED
 *   - promote-target ∉ {rfc, asset, work} → 报 OXN_DRAFT_TARGET_INVALID
 *   - ASCII / UTF-8 frontmatter 注入必须保留换行格式
 */

import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { getBoundaryDir } from '@openxenon/engine/infra/oxnrc'

export const DRAFT_TARGETS = ['rfc', 'asset', 'work'] as const
export type DraftTarget = (typeof DRAFT_TARGETS)[number]

export const ASSET_KINDS = ['domain', 'workflow', 'stack', 'blueprint', 'roadmap'] as const
export type DraftAssetKind = (typeof ASSET_KINDS)[number]

export interface ForkSkeletonInput {
  projectRoot: string
  target: DraftTarget
  kind?: DraftAssetKind | null
  name: string
  /** 是否保留工程师已填的 H2/H3 内容（仅 retarget 场景） */
  preserveContent?: string
}

export interface ForkSkeletonResult {
  ok: true
  /** 完整 skeleton 字符串（含 frontmatter + body） */
  content: string
  /** 注入的 frontmatter 字段 */
  injectedFrontmatter: {
    'promote-target': DraftTarget
    'promote-kind': DraftAssetKind | null
    'created-from': string
    'synced-at': string
  }
  /** skeleton 模板源路径（用于 debug） */
  templatePath: string
}

export interface ForkSkeletonError {
  ok: false
  code:
    | 'OXN_DRAFT_TARGET_INVALID'
    | 'OXN_DRAFT_KIND_REQUIRED'
    | 'OXN_DRAFT_KIND_INVALID'
    | 'OXN_DRAFT_SKELETON_NOT_FOUND'
  message: string
  suggestion?: string
}

const SKELETON_DIR = 'assets/blueprints/draft-skeletons'
const WORKFLOW_VERSION = 'draft-skeleton-fork@0.1.0'

function isDraftTarget(value: string): value is DraftTarget {
  return (DRAFT_TARGETS as readonly string[]).includes(value)
}

function isAssetKind(value: string): value is DraftAssetKind {
  return (ASSET_KINDS as readonly string[]).includes(value)
}

function getSkeletonPath(projectRoot: string, target: DraftTarget, kind?: DraftAssetKind | null): string {
  const boundaryDir = getBoundaryDir(null as never)
  const filename = target === 'asset' && kind ? `asset-${kind}.md` : `${target}.md`
  return join(projectRoot, boundaryDir, SKELETON_DIR, filename)
}

function getSyncedAt(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * 简单 YAML frontmatter 注入（仅追加，不破坏原有结构）。
 * 注：不解析/合并已有 frontmatter —— caller 自己负责协调。
 */
function injectFrontmatter(content: string, fields: Record<string, string>): string {
  const lines = content.split('\n')
  if (lines[0] === '---') {
    // 找到 frontmatter 结束
    let endIdx = lines.indexOf('---', 1)
    if (endIdx === -1) return content
    // 在 frontmatter 末尾插入新字段
    const newLines = [
      ...lines.slice(0, endIdx),
      ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`),
      ...lines.slice(endIdx),
    ]
    return newLines.join('\n')
  }
  // 无 frontmatter，注入新的
  const fm = ['---', ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`), '---', ''].join('\n')
  return fm + content
}

export function forkDraftSkeleton(
  input: ForkSkeletonInput,
  _config: { draftDir?: string } | null = null,
): ForkSkeletonResult | ForkSkeletonError {
  if (!isDraftTarget(input.target)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_TARGET_INVALID',
      message: `Draft target "${input.target}" is invalid.`,
      suggestion: `Valid targets: ${DRAFT_TARGETS.join(', ')}`,
    }
  }

  if (input.target === 'asset' && !input.kind) {
    return {
      ok: false,
      code: 'OXN_DRAFT_KIND_REQUIRED',
      message: 'Draft target=asset requires --kind (5 AssetKind).',
      suggestion: `Valid kinds: ${ASSET_KINDS.join(', ')}`,
    }
  }

  if (input.kind != null && !isAssetKind(input.kind)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_KIND_INVALID',
      message: `Draft kind "${input.kind}" is invalid.`,
      suggestion: `Valid kinds: ${ASSET_KINDS.join(', ')}`,
    }
  }

  const templatePath = getSkeletonPath(input.projectRoot, input.target, input.kind)
  if (!existsSync(templatePath)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_SKELETON_NOT_FOUND',
      message: `Skeleton template not found at ${templatePath}`,
      suggestion: `Create the skeleton at .openxenon/assets/blueprints/draft-skeletons/${input.target === 'asset' && input.kind ? `asset-${input.kind}.md` : `${input.target}.md`}`,
    }
  }

  const template = readFileSync(templatePath, 'utf-8')
  const syncedAt = getSyncedAt()
  const injectedFields: Record<string, string> = {
    'promote-target': input.target,
    'created-from': WORKFLOW_VERSION,
    'synced-at': syncedAt,
  }
  if (input.target === 'asset' && input.kind) {
    injectedFields['promote-kind'] = input.kind
  }

  let content = injectFrontmatter(template, injectedFields)

  // retarget 场景：保留工程师已填的 H2/H3 内容
  // 简化策略：append 保留的内容到 skeleton 末尾（用户后续手动合并）
  // 完整实现需 mdast 重写 —— v0.6.2-alpha.3 走简化
  if (input.preserveContent && input.preserveContent.trim()) {
    content = `${content}\n\n<!-- engineer-preserved-content -->\n${input.preserveContent}\n`
  }

  return {
    ok: true,
    content,
    injectedFrontmatter: {
      'promote-target': input.target,
      'promote-kind': input.target === 'asset' ? (input.kind ?? null) : null,
      'created-from': WORKFLOW_VERSION,
      'synced-at': syncedAt,
    },
    templatePath,
  }
}
