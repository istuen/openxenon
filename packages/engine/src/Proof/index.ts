/**
 * Proof module — DDD unified entry (v0.6 PR-5c)
 *
 * E2 Work · Proof 阶段 + Proof-First 独立验收。
 * import type { CreateProofInput, RunProofResult } from '@openxenon/engine/Proof'
 */
export type {
  ProofVerdict,
  CreateProofInput, CreateProofResult,
  ListProofsInput, ListProofsResult, ProofSummary,
  AddProbeInput, AddProbeResult,
  RunProofInput, RunProofResult,
  ShowProofInput, ShowProofResult,
  VerifyProofInput, VerifyProofResult,
  DescribeProbeInput, DescribeProbeResult,
  ListProbesResult,
} from './types'
