/**
 * Insight module — shared types (v0.6 PR-5d)
 *
 * E4 Insight 涌现层（v0.6 哲学占位 + 类型定义）
 * v0.7+: AI 跨 Work 综合推理
 * Module: packages/engine/src/Insight/
 */

export type InsightDimension =
  | 'consecutive-fail'
  | 'cross-proof-fail-clusters'
  | 'dag-drift'
  | 'invariant-coverage-gap'
  | 'asset-recommendation'

export interface ComputeProofInsightInput {
  proofName: string
  projectRoot: string
}

export interface ProofInsightResult {
  proofName: string
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
  evidenceChain: Array<{ probe: string; fact: string; conclusion: string }>
  probeStats: { totalRuns: number; overallPassRate: number }
  emergentPatterns: Array<{ type: string; probeType: string; occurrences: number }>
}

export interface ComputeWorkInsightInput {
  workName: string
  dimensions: InsightDimension[]
  projectRoot: string
}

export interface WorkInsightResult {
  workName: string
  totalRounds: number
  finalVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
  roundSequence: Array<{ round: number; verdict: string; failures: string[] }>
  emergentPatterns: Array<{ type: string; probeType: string; occurrences: number }>
  assetSuggestions: Array<{
    type: 'new-invariant' | 'improve-blueprint' | 'deprecate-asset'
    targetKind: 'domain' | 'blueprint' | 'stack'
    targetName: string
    suggestedContent: string
    reason: string
  }>
}

export interface AuditSuggestion {
  type: 'new-invariant' | 'improve-blueprint' | 'deprecate-asset'
  targetKind: 'domain' | 'blueprint' | 'stack'
  targetName: string
  suggestedContent: string
  reason: string
  sourcePatterns: string[]
}
