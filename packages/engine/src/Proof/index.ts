/**
 * Proof module — DDD unified entry (v0.6 PR-5c续)
 *
 * E2 Work · Proof 阶段 + Proof-First 独立验收。
 */

// Use cases
export { parseProofFile } from './parse'
export { computeFileHash } from './hash'
export { nextProbeName, escapeString } from './probe-utils'
export { renderVerdictHuman, renderShowHuman } from './render'
export type { RenderVerdictParams, RenderShowParams } from './render'

// Types
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
  ParseProofResult, FileHashResult,
} from './types'
