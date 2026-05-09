import type { CustomProofConfig } from './types/proof'
import { scanProjectProofsSync, scanGlobalProofsSync, getGlobalProofsPath, getProjectProofsPath } from '../../infra/scanner'
import { resolveCustomProofsRecursive, mergeCustomProofs, findProofById } from './custom-proofs-resolver'

export function scanProjectProofs(projectRoot: string): CustomProofConfig[] {
  const scanned = scanProjectProofsSync(projectRoot)
  return resolveCustomProofsRecursive(scanned, 'project')
}

export function scanGlobalProofs(): CustomProofConfig[] {
  const scanned = scanGlobalProofsSync()
  return resolveCustomProofsRecursive(scanned, 'global')
}

export function getAllCustomProofs(projectRoot: string): CustomProofConfig[] {
  const projectProofs = scanProjectProofs(projectRoot)
  const globalProofs = scanGlobalProofs()
  return mergeCustomProofs(projectProofs, globalProofs)
}

export function findCustomProof(
  proofId: string,
  projectRoot: string
): CustomProofConfig | undefined {
  const projectProofs = scanProjectProofs(projectRoot)
  const globalProofs = scanGlobalProofs()
  return findProofById(proofId, projectProofs, globalProofs)
}

export { getGlobalProofsPath, getProjectProofsPath }