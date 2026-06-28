/**
 * Proof module — probe-to-IR conversion (v0.6 阶段4: 导出链)
 */
import type { ProofDeclaration, ProofProbeDecl } from '@openxenon/engine/oxl'

export interface ProofProbeIR {
  probeName: string
  ref: string
  params: Record<string, unknown>
}

function literalToString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value && typeof value === 'object' && '$cstNode' in (value as Record<string, unknown>)) {
    const text = (value as { $cstNode: { text: string } }).$cstNode.text
    if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
      return text.slice(1, -1)
    }
    return text
  }
  return String(value)
}

export function proofProbesToIR(proof: ProofDeclaration): ProofProbeIR[] {
  return (proof.probes ?? []).map((p: ProofProbeDecl) => {
    const params: Record<string, unknown> = {}
    if (p.params) {
      for (const pair of p.params.pairs) {
        params[pair.key] = literalToString(pair.value)
      }
    }
    return { probeName: p.name, ref: p.ref, params }
  })
}
