/**
 * Draft retarget module — v0.6.2-alpha.3
 *
 * 设计来源：
 *   - .openxenon/assets/domains/oxn-draft-domain.md §inv-5 (skeleton-from-blueprint)
 *   - .openxenon/assets/domains/oxn-draft-promote-domain.md §inv-5 (retarget explicit)
 *
 * 职责：
 *   - 重新派生 skeleton with new target
 *   - 保留工程师已填的 H2/H3 内容（simplified: append 方式）
 *   - 显式 retarget（不允许直接编辑 frontmatter 改 promote-target）
 *
 * 关键约束：
 *   - 工程师已填字段保留（不覆盖）
 *   - 必填 promote-target / promote-kind 重新注入
 *   - 同步 synced-at
 */

import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { getBoundaryDir } from '@openxenon/engine/infra/oxnrc'
import { forkDraftSkeleton, type DraftTarget, type DraftAssetKind } from './skeleton'

export interface RetargetDraftInput {
  projectRoot: string
  name: string
  newTarget: DraftTarget
  newKind?: DraftAssetKind | null
}

export interface RetargetDraftResult {
  ok: true
  name: string
  oldTarget: DraftTarget | null
  oldKind: DraftAssetKind | null
  newTarget: DraftTarget
  newKind: DraftAssetKind | null
  /** 写回的 Draft 路径 */
  draftPath: string
  /** 工程师已填内容字符数（保留） */
  preservedContentChars: number
}

export interface RetargetDraftError {
  ok: false
  code:
    | 'OXN_DRAFT_NOT_FOUND'
    | 'OXN_DRAFT_TARGET_INVALID'
    | 'OXN_DRAFT_KIND_REQUIRED'
    | 'OXN_DRAFT_KIND_INVALID'
    | 'OXN_DRAFT_SKELETON_NOT_FOUND'
  message: string
  suggestion?: string
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
    if (m && m[1] && m[2] !== undefined) frontmatter[m[1]] = m[2].trim()
  }
  return { frontmatter, body }
}

/**
 * 将工程师的旧 frontmatter 字段（保留字段）插入到 skeleton 的 frontmatter 末尾。
 * 自动跳过 skeleton 已有的字段（不覆盖）。
 */
function mergeIntoSkeleton(skeletonContent: string, preservedFm: Record<string, string>): string {
  const lines = skeletonContent.split('\n')
  if (lines[0] !== '---') return skeletonContent
  const endIdx = lines.indexOf('---', 1)
  if (endIdx === -1) return skeletonContent

  const existingKeys = new Set<string>()
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i]
    if (line === undefined) continue
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (m && m[1]) existingKeys.add(m[1])
  }

  const newFmLines = Object.entries(preservedFm)
    .filter(([k]) => !existingKeys.has(k))
    .map(([k, v]) => `${k}: ${v}`)

  if (newFmLines.length === 0) return skeletonContent

  const newLines = [...lines.slice(0, endIdx), ...newFmLines, ...lines.slice(endIdx)]
  return newLines.join('\n')
}

export function retargetDraft(
  input: RetargetDraftInput,
  config: { draftDir?: string } | null = null,
): RetargetDraftResult | RetargetDraftError {
  // 1. 解析 source Draft
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
  const oldTarget = (frontmatter['promote-target'] as DraftTarget | undefined) ?? null
  const oldKind = (frontmatter['promote-kind'] as DraftAssetKind | undefined) ?? null

  // 2. fork new skeleton with preserved content
  const forkResult = forkDraftSkeleton(
    {
      projectRoot: input.projectRoot,
      target: input.newTarget,
      kind: input.newKind ?? null,
      name: input.name,
      preserveContent: body,
    },
    config,
  )

  if (!forkResult.ok) {
    return forkResult
  }

  // 3. 合并 frontmatter：保留工程师的旧 frontmatter 字段（除 promote-target / promote-kind / created-from / synced-at）
  //    这些字段由 skeleton 派生覆盖之
  const OVERRIDE_FIELDS = new Set(['promote-target', 'promote-kind', 'created-from', 'synced-at'])
  const preservedFm: Record<string, string> = {}
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!OVERRIDE_FIELDS.has(k)) {
      preservedFm[k] = v
    }
  }
  const mergedContent = mergeIntoSkeleton(forkResult.content, preservedFm)

  // 4. 写回 Draft
  writeFileSync(filePath, mergedContent, 'utf-8')

  return {
    ok: true,
    name: input.name,
    oldTarget,
    oldKind,
    newTarget: input.newTarget,
    newKind: input.newKind ?? null,
    draftPath: filePath,
    preservedContentChars: body.length,
  }
}
