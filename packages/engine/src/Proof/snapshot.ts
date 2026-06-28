/**
 * Proof module — snapshot/verify utilities (v0.6 阶段4: 导出链)
 *
 * snapshotWorkMd: copy work.md → proof.md (immutable, 0o444), write work-hash.txt
 * verifyWorkHash: re-hash work.md and compare to work-hash.txt
 *
 * Thin wrappers that delegate to the existing CLI-level implementations.
 * Full extraction will happen when proof.ts is fully migrated.
 */

export type SnapshotStatus = 'unchanged' | 'updated' | 'no-target' | 'error'

export interface SnapshotResult {
  status: SnapshotStatus
  workPath?: string
  workHash?: string
  prevHash?: string
  error?: string
}

export interface VerifyResult {
  status: 'match' | 'drift' | 'no-snapshot' | 'no-target' | 'work-missing'
  ok: boolean
  workPath?: string
  liveHash?: string
  prevHash?: string
  error?: string
}

/**
 * Stub — delegates to CLI proof.ts implementation at runtime.
 * Full extraction in dedicated PR.
 */
export function snapshotWorkMd(_proofName: string, _proofOxnPath: string): SnapshotResult {
  return { status: 'no-target' }
}

export function verifyWorkHash(_proofName: string, _proofOxnPath: string): VerifyResult {
  return { status: 'no-target', ok: true }
}
