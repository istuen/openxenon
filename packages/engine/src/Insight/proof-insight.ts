/**
 * Insight module — proof-insight compute (v0.6 阶段5)
 *
 * Wraps L0 kernel computeInsightFromInputs for single-proof emergent patterns.
 */
import type { ComputeProofInsightInput, ProofInsightResult } from './types'

export function computeProofInsight(input: ComputeProofInsightInput): ProofInsightResult {
  // v0.6: delegates to L0 kernel at call site (import from '@openxenon/engine/kernel')
  // This wrapper exposes the typed API for Engine consumers.
  return {
    proofName: input.proofName,
    verdict: 'FAILED', // placeholder — real computation delegates to L0 kernel
    evidenceChain: [],
    probeStats: { totalRuns: 0, overallPassRate: 0 },
    emergentPatterns: [],
  }
}
