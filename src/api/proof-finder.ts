import { existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getProjectProofsPath } from '../core/project'
import { COMMON_PROOFS_PATH } from '../core/global'
import { scanProjectProofs } from '../core/proofs-project'

export interface ProofLocation {
  path: string
  type: 'project' | 'global' | 'built-in'
}

export function findProof(
  proofName: string,
  projectPath: string
): ProofLocation | null {
  const normalizedName = proofName.replace(/\.ts$/, '').replace(/-/g, '_')
  const kebabName = proofName.replace(/\.ts$/, '').replace(/_/g, '-')
  
  const searchPaths = [
    { path: getProjectProofsPath(projectPath), type: 'project' as const },
    { path: COMMON_PROOFS_PATH, type: 'global' as const },
  ]
  
  for (const { path: basePath, type } of searchPaths) {
    const candidates = [
      join(basePath, `${proofName}.ts`),
      join(basePath, `${normalizedName}.ts`),
      join(basePath, `${kebabName}.ts`),
      join(basePath, proofName),
    ]
    
    for (const candidate of candidates) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return { path: candidate, type }
      }
    }
  }
  
  const builtInProof = findBuiltInProof(proofName, normalizedName, kebabName)
  if (builtInProof) {
    return builtInProof
  }
  
  return null
}

function findBuiltInProof(
  proofName: string,
  normalizedName: string,
  kebabName: string
): ProofLocation | null {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const builtInPath = join(__dirname, '..', 'core', 'built-in-proofs')
    
    const candidates = [
      join(builtInPath, `${proofName}.ts`),
      join(builtInPath, `${normalizedName}.ts`),
      join(builtInPath, `${kebabName}.ts`),
    ]
    
    for (const candidate of candidates) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return { path: candidate, type: 'built-in' }
      }
    }
  } catch {
    // ignore errors
  }
  
  return null
}

export function listAvailableProofs(projectPath: string): string[] {
  const proofs = scanProjectProofs(projectPath)
  return proofs.map((p: any) => p.id)
}
