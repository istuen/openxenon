import { extname, basename } from 'path'
import type { CustomProofConfig } from './types/proof'

export interface ScannedFile {
  path: string
  isDirectory: boolean
}

export function resolveCustomProofs(
  scannedFiles: ScannedFile[],
  category: 'project' | 'global'
): CustomProofConfig[] {
  const proofs: CustomProofConfig[] = []

  for (const file of scannedFiles) {
    if (file.isDirectory) {
      continue
    }

    const ext = extname(file.path)

    if (ext === '.ts' || ext === '.js' || ext === '.sh') {
      const name = basename(file.path, ext)
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

      proofs.push({
        id,
        name,
        path: file.path,
        category,
        timeout: 60000
      })
    }
  }

  return proofs
}

export function resolveCustomProofsRecursive(
  scannedEntries: Array<{ path: string; isDirectory: boolean; children?: ScannedFile[] }>,
  category: 'project' | 'global'
): CustomProofConfig[] {
  const proofs: CustomProofConfig[] = []

  for (const entry of scannedEntries) {
    if (entry.isDirectory && entry.children) {
      proofs.push(...resolveCustomProofsRecursive(entry.children, category))
    } else if (!entry.isDirectory) {
      const ext = extname(entry.path)

      if (ext === '.ts' || ext === '.js' || ext === '.sh') {
        const name = basename(entry.path, ext)
        const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

        proofs.push({
          id,
          name,
          path: entry.path,
          category,
          timeout: 60000
        })
      }
    }
  }

  return proofs
}

export function mergeCustomProofs(
  projectProofs: CustomProofConfig[],
  globalProofs: CustomProofConfig[]
): CustomProofConfig[] {
  const projectProofIds = new Set(projectProofs.map(p => p.id))

  const filteredGlobalProofs = globalProofs.filter(
    proof => !projectProofIds.has(proof.id)
  )

  return [...projectProofs, ...filteredGlobalProofs]
}

export function findProofById(
  proofId: string,
  projectProofs: CustomProofConfig[],
  globalProofs: CustomProofConfig[]
): CustomProofConfig | undefined {
  return projectProofs.find(p => p.id === proofId) ||
         globalProofs.find(p => p.id === proofId)
}