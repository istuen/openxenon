import { join } from 'path'
import type { CustomProofConfig } from './types/proof'
import { resolveCustomProofsRecursive, mergeCustomProofs, findProofById } from './custom-proofs-resolver'

const GLOBAL_PROOFS_DIR = '.openxenon/custom-proofs'

export function getGlobalProofsDir(): string {
  return GLOBAL_PROOFS_DIR
}

export function getProjectProofsDir(projectRoot: string): string {
  return join(projectRoot, '.openxenon', 'proofs')
}

export function scanProjectProofs(scannedEntries: ReturnType<typeof import('../../infra/scanner').scanProjectProofsSync>, projectRoot: string): CustomProofConfig[] {
  return resolveCustomProofsRecursive(scannedEntries, 'project')
}

export function scanGlobalProofs(scannedEntries: ReturnType<typeof import('../../infra/scanner').scanGlobalProofsSync>): CustomProofConfig[] {
  return resolveCustomProofsRecursive(scannedEntries, 'global')
}

export function getAllCustomProofs(
  projectScanned: ReturnType<typeof import('../../infra/scanner').scanProjectProofsSync>,
  globalScanned: ReturnType<typeof import('../../infra/scanner').scanGlobalProofsSync>
): CustomProofConfig[] {
  const projectProofs = resolveCustomProofsRecursive(projectScanned, 'project')
  const globalProofs = resolveCustomProofsRecursive(globalScanned, 'global')
  return mergeCustomProofs(projectProofs, globalProofs)
}

export function findCustomProof(
  proofId: string,
  projectScanned: ReturnType<typeof import('../../infra/scanner').scanProjectProofsSync>,
  globalScanned: ReturnType<typeof import('../../infra/scanner').scanGlobalProofsSync>
): CustomProofConfig | undefined {
  const projectProofs = resolveCustomProofsRecursive(projectScanned, 'project')
  const globalProofs = resolveCustomProofsRecursive(globalScanned, 'global')
  return findProofById(proofId, projectProofs, globalProofs)
}