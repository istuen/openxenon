/**
 * Draft promote module — v0.6.2-alpha.3
 *
 * 设计来源：
 *   - .openxenon/assets/domains/oxn-draft-promote-domain.md §PromoteLifecycle
 *   - .openxenon/assets/blueprints/draft-promote-router.md §Boundaries
 *   - .openxenon/assets/blueprints/promote-target-aware-workflow.md
 *
 * 4 阶段生命周期：
 *   1. gather              — 读 Draft frontmatter + body
 *   2. validate-skeleton   — 校验 frontmatter 字段 + H2 段
 *   3. fork-missing        — 补全缺字段
 *   4. dispatch-target     — 路由到 promote-target-aware-workflow Blueprint
 *
 * 关键约束：
 *   - Source mtime 不变（不修改原 Draft）
 *   - draft-promote-router 唯一入口，CLI 不允许直拼
 *   - 4 阶段顺序强制（无 short-circuit）
 */

import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { getBoundaryDir } from '@openxenon/engine/infra/oxnrc'
import { DRAFT_TARGETS, ASSET_KINDS, type DraftTarget, type DraftAssetKind } from './skeleton'
import { dispatchPromote } from './promote-dispatch'

export const SUB_TARGETS = [
  'promote-rfc',
  'promote-asset-domain',
  'promote-asset-workflow',
  'promote-asset-stack',
  'promote-asset-blueprint',
  'promote-asset-roadmap',
  'promote-work',
] as const
export type SubTarget = (typeof SUB_TARGETS)[number]

export interface PromoteDraftInput {
  projectRoot: string
  name: string
  /** 若指定 --target 显式覆盖 frontmatter promote-target */
  targetOverride?: DraftTarget | 'auto'
  /** 是否在 promote 完成后自动 archive 原 Draft */
  archiveAfter?: boolean
  /** v0.6.3 NG6: 实际写目标文件 (默认 false=v0.6.2-alpha.3 行为) */
  commit?: boolean
  /** 覆盖已存在的目标文件 */
  force?: boolean
  /** v0.6.3 Fix #2: 目标目录覆盖（相对 projectRoot） */
  targetDirOverride?: string
}

export interface PromoteDraftResult {
  ok: true
  name: string
  target: DraftTarget
  kind: DraftAssetKind | null
  subTarget: SubTarget
  /** 落盘到的目标路径 */
  targetPath: string
  /** v0.6.3 NG6: RFC 编号 (仅 target=rfc) */
  rfcNumber: string | null
  /** 4 阶段执行详情 */
  phases: {
    gather: { frontmatter: Record<string, string>; bodyChars: number }
    validate: { valid: true; missingFields: string[] }
    fork: { forked: boolean; fieldsAdded: string[] }
    dispatch: { subTarget: SubTarget; workCreated: boolean }
    /** v0.6.3 NG6: 实际写文件结果 */
    commit?: { filePath: string; bytesWritten: number; created: boolean }
  }
  /** 是否已 archive 原 Draft */
  archived: boolean
}

export interface PromoteDraftError {
  ok: false
  code:
    | 'OXN_DRAFT_NOT_FOUND'
    | 'OXN_DRAFT_PROMOTE_TARGET_MISSING'
    | 'OXN_DRAFT_PROMOTE_TARGET_UNKNOWN'
    | 'OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH'
    | 'OXN_DRAFT_PROMOTE_VALIDATE_FAILED'
    | 'OXN_DRAFT_FRONTMATTER_INVALID'
    | 'OXN_DRAFT_PROMOTE_TARGET_EXISTS'
    | 'OXN_DRAFT_PROMOTE_TARGET_DIR_CREATE_FAILED'
    | 'OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID'
  message: string
  suggestion?: string
  detail?: Record<string, unknown>
}

function getDraftDir(projectRoot: string, config: { draftDir?: string } | null = null): string {
  const boundaryDir = getBoundaryDir((config ?? null) as never)
  const root = config?.draftDir ?? 'drafts'
  return join(projectRoot, boundaryDir, root)
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const lines = content.split('\n')
  if (lines[0] !== '---') return { frontmatter: {}, body: content }
  const endIdx = lines.indexOf('---', 1)
  if (endIdx === -1) return { frontmatter: {}, body: content }

  const fmLines = lines.slice(1, endIdx)
  const body = lines.slice(endIdx + 1).join('\n')
  const frontmatter: Record<string, string> = {}
  for (const line of fmLines) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (m && m[1] && m[2] !== undefined) {
      frontmatter[m[1]] = m[2].trim()
    }
  }
  return { frontmatter, body }
}

function resolveSubTarget(target: DraftTarget, kind: DraftAssetKind | null): SubTarget {
  if (target === 'rfc') return 'promote-rfc'
  if (target === 'work') return 'promote-work'
  // target=asset
  if (!kind) throw new Error('Internal: target=asset with null kind should be rejected upstream')
  switch (kind) {
    case 'domain':
      return 'promote-asset-domain'
    case 'workflow':
      return 'promote-asset-workflow'
    case 'stack':
      return 'promote-asset-stack'
    case 'blueprint':
      return 'promote-asset-blueprint'
    case 'roadmap':
      return 'promote-asset-roadmap'
    default:
      throw new Error(`Internal: unknown kind ${kind}`)
  }
}

function computeTargetPath(target: DraftTarget, kind: DraftAssetKind | null, name: string): string {
  const { join } = require('node:path') as typeof import('node:path')
  if (target === 'rfc') {
    return join('docs', 'rfc', 'zh-cn', `RFC-XXXX-${name}.md`)
  }
  if (target === 'work') {
    return join('.openxenon', 'works', name, 'work.md')
  }
  // target=asset
  if (!kind) throw new Error('Internal: target=asset with null kind')
  const dir = kind === 'roadmap' ? 'assetmaps' : `${kind}s`
  return join('.openxenon', 'assets', dir, `${name}.md`)
}

/**
 * Config passed to promoteDraft. Extends the project-level config with the
 * new `draftPromote` field introduced in v0.6.3 (Fix #2).
 */
export interface PromoteDraftConfig {
  draftDir?: string
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
}

export function promoteDraft(
  input: PromoteDraftInput,
  config: PromoteDraftConfig | null = null,
): PromoteDraftResult | PromoteDraftError {
  // ── Phase 1: gather ──
  const dir = getDraftDir(input.projectRoot, config)
  const filePath = join(dir, `${input.name}.md`)
  if (!existsSync(filePath)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_NOT_FOUND',
      message: `Draft "${input.name}" not found at ${filePath}`,
      suggestion: 'Use `oxn draft list` to see existing drafts.',
    }
  }

  const raw = readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = parseFrontmatter(raw)
  if (Object.keys(frontmatter).length === 0) {
    return {
      ok: false,
      code: 'OXN_DRAFT_FRONTMATTER_INVALID',
      message: 'Draft has no frontmatter or frontmatter is malformed.',
      suggestion: 'Use `oxn draft create --target <rfc|asset|work>` to fork a skeleton with frontmatter.',
    }
  }

  // ── Phase 2: select-target ──
  const targetRaw =
    input.targetOverride && input.targetOverride !== 'auto'
      ? input.targetOverride
      : (frontmatter['promote-target'] ?? undefined)
  if (!targetRaw) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_TARGET_MISSING',
      message: 'Draft frontmatter has no promote-target, and no --target override provided.',
      suggestion: `Add 'promote-target: <rfc|asset|work>' to frontmatter, or pass --target <value>. Valid: ${DRAFT_TARGETS.join(', ')}`,
    }
  }
  if (!(DRAFT_TARGETS as readonly string[]).includes(targetRaw)) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_TARGET_UNKNOWN',
      message: `promote-target="${targetRaw}" is not supported.`,
      detail: { validTargets: DRAFT_TARGETS },
      suggestion: `Valid: ${DRAFT_TARGETS.join(', ')}`,
    }
  }
  const target = targetRaw as DraftTarget
  const kindRaw = frontmatter['promote-kind']
  let kind: DraftAssetKind | null = null
  if (target === 'asset') {
    if (!kindRaw) {
      return {
        ok: false,
        code: 'OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH',
        message: 'promote-target=asset requires promote-kind.',
        detail: { validKinds: ASSET_KINDS },
        suggestion: `Add 'promote-kind: <${ASSET_KINDS.join('|')}>, or use oxn draft retarget --kind <kind>'.`,
      }
    }
    if (!(ASSET_KINDS as readonly string[]).includes(kindRaw)) {
      return {
        ok: false,
        code: 'OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH',
        message: `promote-kind="${kindRaw}" is not a valid AssetKind.`,
        detail: { validKinds: ASSET_KINDS },
        suggestion: `Valid: ${ASSET_KINDS.join(', ')}`,
      }
    }
    kind = kindRaw as DraftAssetKind
  } else if (kindRaw) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH',
      message: `promote-target=${target} should not have promote-kind="${kindRaw}".`,
      detail: { target, kindRaw },
      suggestion: `promote-kind is only valid with promote-target=asset. Remove promote-kind or use --retarget to change target.`,
    }
  }

  // ── Phase 3: validate-skeleton (simplified) ──
  const requiredFields: string[] = ['promote-target']
  if (target === 'asset') requiredFields.push('promote-kind')
  const missingFields = requiredFields.filter((f) => !frontmatter[f])
  if (missingFields.length > 0) {
    return {
      ok: false,
      code: 'OXN_DRAFT_PROMOTE_VALIDATE_FAILED',
      message: `Draft frontmatter missing required fields: ${missingFields.join(', ')}`,
      detail: { missingFields, requiredFields },
      suggestion: 'Run `oxn draft retarget` to re-fork skeleton, or add fields manually.',
    }
  }

  // ── Phase 4: fork-missing (simplified: no-op since gather validated already) ──
  // 完整实现：在 fork-missing 调 forkDraftSkeleton 补全字段并写文件
  // v0.6.2-alpha.3 简化：仅当校验失败时才有意义（已上一步报错）

  // ── Phase 5: dispatch-target ──
  const subTarget = resolveSubTarget(target, kind)
  const targetPath = computeTargetPath(target, kind, input.name)

  // v0.6.3 NG6: 实际写文件
  let commitInfo: { filePath: string; bytesWritten: number; created: boolean } | undefined
  let rfcNumber: string | null = null

  if (input.commit) {
    const dispatchResult = dispatchPromote({
      projectRoot: input.projectRoot,
      name: input.name,
      target,
      kind,
      subTarget,
      draftFrontmatter: frontmatter,
      draftBody: body,
      force: input.force,
      targetDirOverride: input.targetDirOverride,
      config,
    })
    if (!dispatchResult.ok) {
      return dispatchResult
    }
    commitInfo = {
      filePath: dispatchResult.targetPath,
      bytesWritten: dispatchResult.bytesWritten,
      created: dispatchResult.created,
    }
    rfcNumber = dispatchResult.rfcNumber
  }

  return {
    ok: true,
    name: input.name,
    target,
    kind,
    subTarget,
    targetPath,
    rfcNumber,
    phases: {
      gather: { frontmatter, bodyChars: body.length },
      validate: { valid: true, missingFields: [] },
      fork: { forked: false, fieldsAdded: [] },
      dispatch: { subTarget, workCreated: input.commit ?? false },
      ...(commitInfo ? { commit: commitInfo } : {}),
    },
    archived: false,
  }
}
