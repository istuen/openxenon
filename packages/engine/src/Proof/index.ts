/**
 * Proof module — DDD unified entry (v0.6 阶段4: 导出链完成)
 *
 * 10 个函数 + 类型全部在此入口。
 */

// Use cases
export { parseProofFile } from './parse'
export { computeFileHash } from './hash'
export { nextProbeName, escapeString } from './probe-utils'
export { renderVerdictHuman, renderShowHuman } from './render'
export { proofProbesToIR } from './probe-ir'
export { snapshotWorkMd, verifyWorkHash } from './snapshot'
export {
  getProofDir, getProofOxnPath, getProofFrozenPath,
  getProofMdPath, getProofWorkHashPath, resolveWorkPath,
} from './path-utils'

// Types
export type { RenderVerdictParams, RenderShowParams } from './render'
export type { ProofProbeIR } from './probe-ir'
export type { SnapshotStatus, SnapshotResult, VerifyResult } from './snapshot'
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
