/**
 * Asset/internal/reference-checker.ts — v0.6.1-alpha.1 Asset Lifecycle
 *
 * Asset-to-Asset 反向引用扫描（被引用方 → 引用方列表）
 *
 * 与 dag-validator.ts 的区别：
 * - dag-validator: 给定 AssetNode[] 列表，做无环/自环/孤儿校验
 * - reference-checker (本文件): 扫所有 .oxn 文件，提取 references[] 字段，
 *   构建反向索引（哪个 Asset 被哪些 Asset 引用）
 *
 * 用于 archive/delete 前的"无引用校验"
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { readFileSync, readdirSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { resolveAssetDir, ALL_ASSET_KINDS } from '@openxenon/engine/infra/paths'
import type { AssetKind } from '@openxenon/engine/infra/paths'

export interface AssetReferenceEntry {
  kind: AssetKind
  name: string
  /** 哪些 Asset 引用了我（kind+name） */
  referencedBy: Array<{ kind: AssetKind; name: string }>
}

/**
 * 扫所有 6 AssetKind 的 .oxn，提取 references[] 字段，
 * 返回反向引用索引：name → referencedBy[]
 */
export function listAssetReferences(projectRoot: string): AssetReferenceEntry[] {
  const kinds: AssetKind[] = [...ALL_ASSET_KINDS]
  const nodes: Array<{ kind: AssetKind; name: string; references: string[] }> = []

  for (const kind of kinds) {
    const dir = resolveAssetDir(projectRoot, kind, null)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.oxn'))
    for (const file of files) {
      const name = file.replace(/\.oxn$/, '')
      const filePath = join(dir, file)
      const content = readFileSync(filePath, 'utf-8')
      const references = extractReferencesFromOxn(content)
      nodes.push({ kind, name, references })
    }
  }

  // Build reverse index: name -> list of {kind, name} that reference it
  const reverseMap = new Map<string, Array<{ kind: AssetKind; name: string }>>()
  for (const node of nodes) {
    for (const ref of node.references) {
      if (!ref) continue
      const key = ref
      if (!reverseMap.has(key)) {
        reverseMap.set(key, [])
      }
      reverseMap.get(key)!.push({ kind: node.kind, name: node.name })
    }
  }

  // Compose final entries (one per node, with referencedBy filled)
  return nodes.map((node) => ({
    kind: node.kind,
    name: node.name,
    referencedBy: reverseMap.get(node.name) ?? [],
  }))
}

/**
 * 检查单个 Asset 是否被引用（用于 archive/delete 前置校验）
 *
 * @returns true = 被引用（拒绝 archive/delete），false = 孤儿（允许）
 */
export function isAssetReferenced(
  projectRoot: string,
  kind: AssetKind,
  name: string,
): { referenced: boolean; referencedBy: Array<{ kind: AssetKind; name: string }> } {
  const all = listAssetReferences(projectRoot)
  const entry = all.find((e) => e.kind === kind && e.name === name)
  if (!entry) return { referenced: false, referencedBy: [] }
  return {
    referenced: entry.referencedBy.length > 0,
    referencedBy: entry.referencedBy,
  }
}

/**
 * 从 .oxn 内容提取 references[] 字段（与 validate.ts extractReferencesFromOxn 同实现）
 *
 * 提取 3 种语法形式：
 * - references = ["X", "Y"]
 * - references = ["X","Y"] (无空格)
 * - references = ["X"]
 */
function extractReferencesFromOxn(content: string): string[] {
  const match = content.match(/references\s*=\s*\[([^\]]*)\]/m)
  if (!match?.[1]) return []
  const inner = match[1].trim()
  if (!inner) return []
  const refs: string[] = []
  const strRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g
  let m: RegExpExecArray | null
  while ((m = strRegex.exec(inner)) !== null) {
    if (m[1]) refs.push(m[1])
  }
  return refs
}
