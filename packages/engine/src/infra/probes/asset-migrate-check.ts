// =============================================================================
// asset-migrate-check probe (RFC-0015 D6.3)
//
// 验证 .openxenon/.archived/assets/<kind>s/<name>.md 的完整性:
//   1. 同名 .metadata.json 存在 (archiveAt ISO / reason / sourceKind / sourceName)
//   2. .md body 含 ## Archival H2 (archived marker)
//   3. 当前 active asset registry 无 forward ref (违反 "无引用方可归档" 契约)
//
// 一等公民 verdict: archive 不完整或被 forward ref 是 silent drift 风险。
//
// L1-Infra: 读 .md/.json 用 L1 filesystem 接口
// =============================================================================

import { existsSync, readdirSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { listAssetReferences, extractReferences } from '@openxenon/engine/Asset/internal/reference-checker'
import { resolveAssetDir } from '@openxenon/engine/infra/paths'
import { ALL_ASSET_KINDS } from '@openxenon/engine/infra/paths'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface AssetMigrateCheckParams {
  /** 项目根（默认 process.cwd()） */
  root?: string
}

export interface AssetMigrateCheckResult {
  /** exit 0 = 无问题 */
  passed: boolean
  /** 检查归档数 */
  archiveCount: number
  /** 不完整归档数 */
  incompleteCount: number
  /** stale archive refs 数 */
  staleRefCount: number
  /** 不完整归档详情 */
  incompleteArchives: Array<{
    kind: string
    name: string
    issue: 'metadata-missing' | 'metadata-fields' | 'archival-marker-missing'
    detail: string
  }>
  /** stale archive refs (被 active asset 引用的归档) */
  staleArchiveRefs: Array<{
    kind: string
    name: string
    referencedBy: Array<{ kind: string; name: string }>
  }>
}

const ARCHIVED_BASE = '.openxenon/.archived/assets'
const ASSET_KINDS = ['domains', 'workflows', 'blueprints', 'stacks', 'assetmaps'] as const

interface ParsedMetadata {
  archiveAt?: string
  reason?: string
  sourceKind?: string
  sourceName?: string
}

function parseMetadata(content: string): { ok: boolean; parsed: ParsedMetadata; missingFields: string[] } {
  // 简单 YAML key: value parser (支持引号)
  const parsed: ParsedMetadata = {}
  const missingFields: string[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?)\s*$/)
    if (!m) continue
    const [, key, rawValue] = m
    const value = (rawValue ?? '').replace(/^["']|["']$/g, '').trim()
    if (key === 'archiveAt') parsed.archiveAt = value
    else if (key === 'reason') parsed.reason = value
    else if (key === 'sourceKind') parsed.sourceKind = value
    else if (key === 'sourceName') parsed.sourceName = value
  }
  if (!parsed.archiveAt) missingFields.push('archiveAt')
  if (!parsed.reason) missingFields.push('reason')
  if (!parsed.sourceKind) missingFields.push('sourceKind')
  if (!parsed.sourceName) missingFields.push('sourceName')
  return { ok: missingFields.length === 0, parsed, missingFields }
}

function checkArchivalMarker(content: string): boolean {
  // ## Archival 段 (H2)
  return /^##\s+Archival/m.test(content)
}

/** 简化版 reference 提取 (用于 active assets 扫引用) */
// D6.3 修复: 删除 extractReferencesForCheck 自实现 (~40 行),
//   复用 reference-checker.extractReferences 已有的 export (单一实现源).

export async function executeAssetMigrateCheck(
  params: AssetMigrateCheckParams,
  context: ProbeContext,
): Promise<AssetMigrateCheckResult> {
  const root = params.root ?? context.projectRoot
  const result: AssetMigrateCheckResult = {
    passed: true,
    archiveCount: 0,
    incompleteCount: 0,
    staleRefCount: 0,
    incompleteArchives: [],
    staleArchiveRefs: [],
  }

  // 复用 listAssetReferences 找被 active assets 引用的归档（违规的 forward ref）
  const allRefs = listAssetReferences(root)
  // archived 资产 = name 在 active refs 中无对应 entry，但仍是被引用目标
  // 简化: 我们从 listAssetReferences 的反向索引 + 物理 archived 目录对照
  const allArchived = new Map<string, { kind: string; name: string }>()
  for (const kind of ASSET_KINDS) {
    const dir = join(root, ARCHIVED_BASE, kind)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      const name = f.replace(/\.md$/, '')
      const key = `${kind.replace(/s$/, '')}:${name}` // 单数 kind for AssetKey consistency
      allArchived.set(key, { kind: kind.replace(/s$/, ''), name })
    }
  }

  // 检查 1+2: 不完整归档
  for (const [, archived] of allArchived) {
    result.archiveCount++
    const mdPath = join(root, ARCHIVED_BASE, `${archived.kind}s`, `${archived.name}.md`)
    const metaPath = join(root, ARCHIVED_BASE, `${archived.kind}s`, `${archived.name}.metadata.json`)

    if (!existsSync(metaPath)) {
      result.incompleteArchives.push({
        kind: archived.kind,
        name: archived.name,
        issue: 'metadata-missing',
        detail: `${metaPath} not found`,
      })
      continue
    }

    const metaContent = readFileSync(metaPath, 'utf-8')
    const { ok, missingFields } = parseMetadata(metaContent)
    if (!ok) {
      result.incompleteArchives.push({
        kind: archived.kind,
        name: archived.name,
        issue: 'metadata-fields',
        detail: `missing fields: ${missingFields.join(', ')}`,
      })
    }

    if (!checkArchivalMarker(readFileSync(mdPath, 'utf-8'))) {
      result.incompleteArchives.push({
        kind: archived.kind,
        name: archived.name,
        issue: 'archival-marker-missing',
        detail: '.md body does not contain ## Archival H2',
      })
    }
  }

  // 检查 3: stale archive refs (被 active assets 引用 — 违反 "无引用方可归档" 契约)
  // 直接扫 active assets 的 references[], 检查是否有引用 archived name
  const allActiveNames = new Set(allRefs.map((r) => r.name))
  for (const kind of ALL_ASSET_KINDS) {
    const dir = resolveAssetDir(root, kind, null)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      const name = f.replace(/\.md$/, '')
      const content = readFileSync(join(dir, f), 'utf-8')
      // 复用 reference-checker 提取 (通过直接 regex, 因为 export 不对外)
      const refs = extractReferences(content)
      for (const ref of refs) {
        // ref 指向 archived (active 列表中不存在该 name, 但 archived 列表中存在) → stale
        if (!allActiveNames.has(ref) && allArchived.has(`${kind}:${ref}`)) {
          const archivedInfo = allArchived.get(`${kind}:${ref}`)
          if (archivedInfo) {
            result.staleArchiveRefs.push({
              kind: archivedInfo.kind,
              name: archivedInfo.name,
              referencedBy: [{ kind: kind.replace(/s$/, ''), name }],
            })
          }
        }
      }
    }
  }

  result.incompleteCount = result.incompleteArchives.length
  result.staleRefCount = result.staleArchiveRefs.length
  result.passed = result.incompleteCount === 0 && result.staleRefCount === 0
  return result
}
