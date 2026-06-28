/**
 * Proof module — path utilities (v0.6 阶段4: 导出链)
 *
 * Extracted from src/cli/proof.ts for reuse.
 */
import { join } from 'path'
import { BOUNDARY_DIR, PROOFS_DIR, PROOF_OXN_FILE, PROOF_FROZEN_JSON, PROOF_MD_FILE, PROOF_WORK_HASH_FILE } from '@openxenon/engine/kernel'

export function getProofDir(projectRoot: string, name: string): string {
  return join(projectRoot, BOUNDARY_DIR, PROOFS_DIR, name)
}

export function getProofOxnPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), PROOF_OXN_FILE)
}

export function getProofFrozenPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON)
}

export function getProofMdPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), PROOF_MD_FILE)
}

export function getProofWorkHashPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), PROOF_WORK_HASH_FILE)
}

export function resolveWorkPath(proofOxnPath: string, target: string): string {
  if (target.startsWith('/')) return target
  const proofDir = join(proofOxnPath, '..')
  return join(proofDir, target)
}
