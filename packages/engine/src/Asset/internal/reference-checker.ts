/**
 * Asset/internal/reference-checker.ts — v0.6.1-alpha.1 Asset Lifecycle
 *
 * Asset-to-Asset 反向引用扫描（被引用方 → 引用方列表）
 *
 * 与 dag-validator.ts 的区别：
 * - dag-validator: 给定 AssetNode[] 列表，做无环/自环/孤儿校验
 * - reference-checker (本文件): 扫所有 .md 文件，提取 references[] 字段，
 *   构建反向索引（哪个 Asset 被哪些 Asset 引用）
 *
 * 用于 archive/delete 前的"无引用校验"
 *
 * v0.7.0: .oxn removed, only .md supported.
 * v0.6.4 PR-D (Q7 B 方案): references 语法统一为 bare name + parent-kind metadata 推断；
 *   `@md/{kind}/{name}` 标记 deprecated 仍兼容（向后兼容 for legacy Blueprint frontmatter）。
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { readFileSync, readdirSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { resolveAssetDir, ALL_ASSET_KINDS } from '@openxenon/engine/infra/paths'
import type { AssetKind, ProjectConfig } from '@openxenon/engine/infra/paths'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'

export interface AssetReferenceEntry {
  kind: AssetKind
  name: string
  /** 哪些 Asset 引用了我（kind+name） */
  referencedBy: Array<{ kind: AssetKind; name: string }>
}

/**
 * 🆕 v0.6.4 PR-D (Q7 B 方案): 解析单个引用字符串为 `(kind, name)`。
 * - bare name (e.g. `oxn-domain`) → 强制同 parentKind（如 parent=domain 则 target=domain）
 * - `@md/{kind}/{name}` (legacy, deprecated) → 解析为对应 kind+name
 * - 找不到对应 kind 或 name 不存在 → 返回 null（调用方报错）
 *
 * @param parentKind 调用方的 AssetKind（bare name 推断用）
 * @param refStr 引用字符串（bare name 或 `@md/{kind}/{name}`）
 * @param projectRoot 项目根目录（用于验证 name 文件存在）
 * @returns `{kind, name}` 元组或 null
 */
export function resolveReference(
  parentKind: AssetKind,
  refStr: string,
  projectRoot?: string,
): { kind: AssetKind; name: string } | null {
  const trimmed = refStr.trim().replace(/^["']|["']$/g, '')
  if (!trimmed) return null

  // 形态 1: `@md/{kind}/{name}` (legacy deprecated v0.6.4)
  const mdMatch = trimmed.match(/^@md\/([a-z]+)\/([^/]+)$/)
  if (mdMatch) {
    const [, kind, name] = mdMatch
    if (!kind || !name) return null
    if (!ALL_ASSET_KINDS.includes(kind as AssetKind)) return null
    return { kind: kind as AssetKind, name }
  }

  // 形态 2: bare name（v0.6.4 canonical）
  // 强制同 parentKind（Q7 B 决策：bare name = same kind）
  // 跨 kind 引用必须用 Blueprint ## Use 段（显式 kind: 字段）
  if (projectRoot) {
    const dir = resolveAssetDir(projectRoot, parentKind)
    const filePath = join(dir, `${trimmed}.md`)
    if (existsSync(filePath)) {
      return { kind: parentKind, name: trimmed }
    }
    return null
  }
  // 无 projectRoot 上下文时仅返回归一化结果（不校验存在）
  return { kind: parentKind, name: trimmed }
}

/**
 * 扫所有 5 AssetKind 的 .md，提取 references[] 字段，
 * 返回反向引用索引：name → referencedBy[]
 *
 * v0.6.2-alpha.0 P0b fix: 接受 caller 传入的 config（避免重复 load + 避免 caller 缓存 config 与函数实际 load 的不一致）。
 * v0.6.4 PR-D: references 解析统一为 bare name（parent-kind metadata 推断）；`@md/{kind}/{name}` deprecated 兼容。
 */
export function listAssetReferences(projectRoot: string, config?: ProjectConfig | null): AssetReferenceEntry[] {
  const kinds: AssetKind[] = [...ALL_ASSET_KINDS]
  const nodes: Array<{ kind: AssetKind; name: string; references: string[] }> = []
  const cfg = config ?? loadProjectConfig(projectRoot)

  for (const kind of kinds) {
    const dir = resolveAssetDir(projectRoot, kind, cfg)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const name = file.replace(/\.md$/, '')
      const filePath = join(dir, file)
      const content = readFileSync(filePath, 'utf-8')
      const references = extractReferences(content, kind)
      nodes.push({ kind, name, references })
    }
  }

  // Build reverse index: name -> list of {kind, name} that reference it
  // 🆕 v0.6.4 PR-D: 归一化 references key 为 `${kind}::${name}` 形式（消除 false negative）
  const reverseMap = new Map<string, Array<{ kind: AssetKind; name: string }>>()
  for (const node of nodes) {
    for (const ref of node.references) {
      if (!ref) continue
      // 🆕 v0.6.4 PR-D: 解析 bare name 或 `@md/...` 形式，归一化为 (kind, name)
      const resolved = resolveReference(node.kind, ref, projectRoot)
      if (!resolved) continue
      const key = `${resolved.kind}::${resolved.name}`
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
    referencedBy: reverseMap.get(`${node.kind}::${node.name}`) ?? [],
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
 * 从 Asset 内容提取 references[] 字段（regex）
 *
 * v0.6.4 PR-D: 新增 parentKind 参数（v0.6.4 必填）。bare name references 强制同 kind；
 *   旧单参数签名保留向后兼容（parentKind 缺省时按空字符串处理，行为退化但仍能解析 `@md/...` 形式）。
 *
 * 支持多种语法形式（.md native + .oxn 向后兼容）：
 * - references = ["X", "Y"]          （.oxn legacy）
 * - references = ["X","Y"]           （.oxn legacy，无空格）
 * - references = ["X"]               （.oxn legacy）
 * - - references: X                  （.md 列表项语法）
 * - - references: [X, Y]             （.md 列表项语法）
 *
 * 返回的 bare name 字符串保留原始写法，调用方需用 resolveReference() 进一步归一化。
 */
export function extractReferences(content: string, _parentKind?: AssetKind): string[] {
  // .oxn legacy syntax: references = [...]
  const oxnMatch = content.match(/references\s*=\s*\[([^\]]*)\]/m)
  if (oxnMatch?.[1]) {
    const inner = oxnMatch[1].trim()
    if (!inner) return []
    const refs: string[] = []
    const strRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g
    let m: RegExpExecArray | null
    while ((m = strRegex.exec(inner)) !== null) {
      if (m[1]) refs.push(m[1])
    }
    return refs
  }

  // .md syntax: - references: X 或 - references: [X, Y]
  // 注意: 不能匹配 multi-line YAML 的 continuation line (e.g. "- X")
  // 这里要求 references: 后的 value 是 inline 形式 (非 - 开头的 list item)
  const mdMatch = content.match(/(?:^|\n)[ \t]*(?:- )?references[ \t]*:[ \t]*(\[[^\]]*\]|[^\n\-[]+)\s*(?:\n|$)/m)
  if (mdMatch?.[1]) {
    const value = mdMatch[1].trim()
    // Array format: [X, Y]
    const arrayMatch = value.match(/\[([^\]]*)\]/)
    if (arrayMatch?.[1]) {
      return arrayMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/"/g, ''))
        .filter(Boolean)
    }
    // Single value: X
    if (value && !value.startsWith('[')) {
      return [value.replace(/"/g, '')]
    }
  }

  // .md multi-line YAML array:
  //   references:
  //     - X
  //     - Y
  const multiLineMatch = content.match(/(?:^|\n)([ \t]*references[ \t]*:[ \t]*)\n((?:[ \t]+-[^\n]*\n?)+)/)
  if (multiLineMatch?.[2]) {
    return multiLineMatch[2]
      .split('\n')
      .map((line) =>
        line
          .replace(/^[ \t]*-[ \t]*/, '')
          .trim()
          .replace(/^["']|["']$/g, ''),
      )
      .filter((s) => s.length > 0)
  }

  return []
}
