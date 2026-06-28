/**
 * md-pipeline/transformers/proof.ts — v0.4 PR-C2 unified-native Proof 抽取
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Proof IR 类型
// ========================

export interface ProofProbeIR {
  probeName: string
  ref: string
  params: Record<string, unknown>
}

export interface ProofIR {
  entity: 'proof'
  name: string
  description: string
  probes: ProofProbeIR[]
  // v0.4 PR-B Q4-A: proof ↔ work 快照机制
  proofsTargetWork?: string
  proofsTargetFrozen?: string
}

// ========================
// 核心抽取函数
// ========================

export function extractProofIR(root: Root, frontmatter: Record<string, unknown> = {}): ProofIR {
  // 优先用传入的 frontmatter, 否则自动从 mdast 提取 (避免 caller 必须先 parse frontmatter)
  const fm = Object.keys(frontmatter).length > 0 ? frontmatter : extractYamlFromTree(root)

  const contexts = collectHeadingContexts(root)

  let description = ''
  const probes: ProofProbeIR[] = []

  for (const ctx of contexts) {
    if (!ctx.h2) continue
    if (ctx.h2 === 'Description' && ctx.h3 === 'primary' && ctx.h3List) {
      const fields = collectListFields(ctx.h3List)
      const descField = fields.find((f) => f.key === 'value' || f.key === 'desc')
      if (typeof descField?.value === 'string') {
        description = descField.value
      }
    } else if (ctx.h2 === 'Probes' && ctx.h3) {
      const fields = ctx.h3List ? collectListFields(ctx.h3List) : []
      probes.push(extractProbeFromFields(ctx.h3, fields))
    }
  }

  // v0.3 T11: proof.oxn frontmatter 可能有 proofs-target-work / proofs-target-frozen
  const proofsTargetWork =
    typeof fm['proofs-target-work'] === 'string' ? (fm['proofs-target-work'] as string) : undefined
  const proofsTargetFrozen =
    typeof fm['proofs-target-frozen'] === 'string' ? (fm['proofs-target-frozen'] as string) : undefined

  return {
    entity: 'proof',
    name: typeof fm.name === 'string' ? fm.name : '',
    description,
    probes,
    ...(proofsTargetWork ? { proofsTargetWork } : {}),
    ...(proofsTargetFrozen ? { proofsTargetFrozen } : {}),
  }
}

function extractProbeFromFields(name: string, fields: ListField[]): ProofProbeIR {
  const refField = fields.find((f) => f.key === 'ref')
  const paramsField = fields.find((f) => f.key === 'params')

  // params 是嵌套 list, 这里简化为 { raw: '...' }
  const params: Record<string, unknown> = {}
  if (paramsField) {
    params._raw = paramsField.raw
  }

  return {
    probeName: name,
    ref: stripQuotes(typeof refField?.value === 'string' ? refField.value : ''),
    params,
  }
}

/** 去除 raw 文本值的引号 (e.g. `"foo"` → `foo`, `'foo'` → `foo`) */
function stripQuotes(s: string): string {
  if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
    return s.slice(1, -1)
  }
  return s
}

// ========================
// unified plugin
// ========================

export function remarkProofExtractor(): (tree: Root) => void {
  return (tree) => {
    const frontmatter = extractYamlFromTree(tree)
    tree.data ??= {}
    ;(tree.data as Record<string, unknown>).proof = extractProofIR(tree, frontmatter)
  }
}
