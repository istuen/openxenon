/**
 * Proof module — shared types (v0.6 PR-5c)
 *
 * E2 Work · Proof 阶段 + Proof-First 模式（OXN 独立探针验收）
 * Module: packages/engine/src/Proof/
 */
import type { AssetFormat } from '@openxenon/engine/infra/paths'

export type ProofVerdict = 'PASSED' | 'FAILED' | 'INCONCLUSIVE'

export interface CreateProofInput {
  proofName: string
  projectRoot: string
}

export interface CreateProofResult {
  proofPath: string
  content: string
  createdAt: string
}

export interface ListProofsInput {
  projectRoot: string
}

export interface ProofSummary {
  name: string
  verdict?: ProofVerdict
  frozenAt?: string
  totalProbes?: number
  passedProbes?: number
}

export interface ListProofsResult {
  proofs: ProofSummary[]
}

export interface AddProbeInput {
  proofName: string
  probeName: string
  input: Record<string, unknown>
  projectRoot: string
}

export interface AddProbeResult {
  proofName: string
  probeName: string
  proofPath: string
}

export interface RunProofInput {
  proofName: string
  projectRoot: string
  skipProbes?: string[]
  dryRun?: boolean
}

export interface RunProofResult {
  proofName: string
  verdict: ProofVerdict
  totalProbes: number
  passedProbes: number
  failedProbes: number
  inconclusiveProbes: number
  frozenPath: string
  verdictPath?: string
  duration: number
}

export interface ShowProofInput {
  proofName: string
  projectRoot: string
}

export interface ShowProofResult {
  proofName: string
  verdict: ProofVerdict
  probes: Array<{
    probe: string
    passed: boolean
    output: unknown
    errorMessage?: string
  }>
  frozenAt: string
  contentHash: string
}

export interface VerifyProofInput {
  proofName: string
  projectRoot: string
}

export interface VerifyProofResult {
  valid: boolean
  contentHashMatch: boolean
  workHashMatch?: boolean
  tamperDetected: boolean
}

export interface DescribeProbeInput {
  probeName: string
}

export interface DescribeProbeResult {
  name: string
  description: string
  requiredInputs: string[]
  examples: Array<Record<string, unknown>>
}

export interface ListProbesResult {
  probes: Array<{ name: string; description: string }>
}
