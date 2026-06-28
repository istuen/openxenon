/**
 * Insight module — DDD unified entry (v0.6 PR-5d续)
 *
 * E4 Insight 涌现层。
 */

// Use cases
export { formatVerdictEmoji, renderInsightHuman } from './compute'

// Types
export type {
  InsightDimension,
  ComputeProofInsightInput, ProofInsightResult,
  ComputeWorkInsightInput, WorkInsightResult,
  AuditSuggestion,
} from './types'
