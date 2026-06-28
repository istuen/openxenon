/**
 * Insight module — work-insight compute (v0.6 阶段5)
 *
 * Reads Round history from WorkspaceState for cross-round IAP summary.
 * v0.6: Thin wrapper over Round history. v0.7+: Cross-Work emergence reasoning.
 */
import { loadWorkState } from '../../../src/work/dual-state-io'
import type { ComputeWorkInsightInput, WorkInsightResult } from './types'

export function computeWorkInsight(input: ComputeWorkInsightInput): WorkInsightResult {
  const state = loadWorkState(input.projectRoot, input.workName)
  const rounds = state?.roundHistory ?? []
  const finalVerdict = state?.status === 'passed' ? 'PASSED' as const
    : state?.status === 'failed' ? 'FAILED' as const
    : 'INCONCLUSIVE' as const

  return {
    workName: input.workName,
    totalRounds: rounds.length,
    finalVerdict,
    roundSequence: rounds
      .filter((r) => r.verdict !== 'PENDING')
      .map((r) => ({
        round: r.round,
        verdict: r.verdict,
        failures: r.failures ?? [],
      })),
    emergentPatterns: [],
    assetSuggestions: [],
  }
}
