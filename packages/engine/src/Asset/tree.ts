/**
 * Asset module — tree use case (v0.6.2-alpha.0)
 *
 * 展示 Asset 依赖图（forward + reverse）：
 * - forward: 我引用了谁
 * - reverse: 谁引用了我
 * - both: 双向
 *
 * 输出格式：文本树（人类可读）+ JSON（机器可读）
 *
 * 限制：
 * - depth 默认 3，防止循环引用栈溢出
 * - 不实现可视化（DOT/Graphviz），仅文本树
 * - forward 引用走 regex 提取（同 validateAssetReferences 的实现）
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { readFileSync, existsSync, readdirSync } from '@openxenon/engine/infra/filesystem'
import { resolveAssetDir, ALL_ASSET_KINDS, type ProjectConfig, type AssetKind } from '@openxenon/engine/infra/paths'
import { join } from 'node:path'
import { listAssetReferences } from './internal/reference-checker'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'
import type { TreeInput, TreeNode, TreeResult } from './types'

/**
 * 提取 Asset 文件中的 references（regex，与 validate.ts 中实现一致）
 */
function extractReferencesFromContent(content: string): string[] {
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

  const mdMatch = content.match(/references:\s*(.+)/m)
  if (mdMatch?.[1]) {
    const value = mdMatch[1].trim()
    const arrayMatch = value.match(/\[([^\]]*)\]/)
    if (arrayMatch?.[1]) {
      return arrayMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/"/g, ''))
        .filter(Boolean)
    }
    if (value && !value.startsWith('[')) {
      return [value.replace(/"/g, '')]
    }
  }

  return []
}

/**
 * 扫所有 5 类 Asset 目录，构建完整节点表
 */
function buildAllNodes(projectRoot: string, config: ProjectConfig | null): TreeNode[] {
  const nodes: TreeNode[] = []
  const reverseRefs = listAssetReferences(projectRoot, config)
  const reverseMap = new Map<string, Array<{ kind: AssetKind; name: string }>>()
  for (const r of reverseRefs) {
    reverseMap.set(`${r.kind}::${r.name}`, r.referencedBy)
  }

  for (const kind of ALL_ASSET_KINDS) {
    const dir = resolveAssetDir(projectRoot, kind, config)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const name = file.replace(/\.md$/, '')
      const content = readFileSync(join(dir, file), 'utf-8')
      const references = extractReferencesFromContent(content)
      nodes.push({
        kind,
        name,
        references,
        referencedBy: reverseMap.get(`${kind}::${name}`) ?? [],
      })
    }
  }

  return nodes
}

/**
 * 渲染文本树（带缩进）
 */
function renderTree(
  startKind: AssetKind,
  startName: string,
  forwardEdges: Map<string, string[]>,
  reverseEdges: Map<string, string[]>,
  direction: 'forward' | 'reverse' | 'both',
  maxDepth: number,
): string {
  const lines: string[] = []
  const visited = new Set<string>()

  function walk(kind: AssetKind, name: string, depth: number, prefix: string): void {
    const key = `${kind}::${name}`
    if (visited.has(key) || depth > maxDepth) {
      lines.push(`${prefix}↻ ${kind}:${name} (cycle or depth limit)`)
      return
    }
    visited.add(key)

    lines.push(`${prefix}${kind}:${name}`)

    if (depth >= maxDepth) return

    const next: Array<{ kind: AssetKind; name: string; edge: '→' | '←' }> = []

    if (direction === 'forward' || direction === 'both') {
      const refs = forwardEdges.get(key) ?? []
      for (const ref of refs) {
        // ref 是字符串格式 "name" 或 "@kind/name" — 简化：只解析 name，无 kind 信息的视为同 kind 待解析
        // 本项目实际 Asset 之间引用都用 plain name（同 kind），不跨 kind
        next.push({ kind, name: ref, edge: '→' })
      }
    }

    if (direction === 'reverse' || direction === 'both') {
      const refs = reverseEdges.get(key) ?? []
      for (const ref of refs) {
        const [rKind, rName] = ref.split('::')
        if (!rKind || !rName) continue
        next.push({ kind: rKind as AssetKind, name: rName, edge: '←' })
      }
    }

    next.forEach((n, i) => {
      const isLast = i === next.length - 1
      const childPrefix = prefix + (isLast ? '  ' : '│ ')
      const edgePrefix = prefix + (isLast ? '└─' : '├─')
      const edgeSymbol = n.edge === '→' ? '→' : '←'
      lines.push(`${edgePrefix}${edgeSymbol} `)
      walk(n.kind, n.name, depth + 1, childPrefix)
    })
  }

  walk(startKind, startName, 0, '')
  return lines.join('\n')
}

export async function tree(input: TreeInput, config?: ProjectConfig | null): Promise<TreeResult> {
  const cfg = config ?? loadProjectConfig(input.projectRoot)
  const maxDepth = input.depth ?? 3
  const direction = input.direction ?? 'forward'

  const allNodes = buildAllNodes(input.projectRoot, cfg)

  // 如果指定了 root，从 root 开始；否则把所有"无引用方"的节点视为 root
  let roots: TreeNode[]
  if (input.root) {
    const found = allNodes.find((n) => n.kind === input.root!.kind && n.name === input.root!.name)
    if (!found) {
      return {
        ok: false,
        nodes: [],
        humanTree: `Asset ${input.root.kind}:${input.root.name} not found`,
        message: `Asset '${input.root.name}' (${input.root.kind}) not found in project`,
      }
    }
    roots = [found]
  } else {
    // 默认 root 集合：没有 referencedBy 的节点（即不被任何 Asset 引用）
    roots = allNodes.filter((n) => n.referencedBy.length === 0)
  }

  // 构建 edge maps（仅 forward 用 kind=kind 的近似映射，reverse 用 kind+name）
  const forwardEdges = new Map<string, string[]>()
  const reverseEdges = new Map<string, string[]>()
  for (const node of allNodes) {
    forwardEdges.set(`${node.kind}::${node.name}`, node.references)
    reverseEdges.set(
      `${node.kind}::${node.name}`,
      node.referencedBy.map((r) => `${r.kind}::${r.name}`),
    )
  }

  const treeLines: string[] = []
  for (const root of roots) {
    treeLines.push(renderTree(root.kind, root.name, forwardEdges, reverseEdges, direction, maxDepth))
  }

  return {
    ok: true,
    nodes: allNodes,
    humanTree: treeLines.join('\n\n'),
    message: `Found ${allNodes.length} Assets, ${roots.length} root(s)`,
  }
}
