import { readdirSync, statSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { homedir } from 'os'
import type { Proof, CustomProofConfig } from '../types/proof'

const GLOBAL_PROOFS_PATH = join(homedir(), '.openxenon', 'custom-proofs')
const PROJECT_PROOFS_DIR = join('.openxenon', 'proofs')

export function scanProjectProofs(projectRoot: string): CustomProofConfig[] {
  const proofsPath = join(projectRoot, PROJECT_PROOFS_DIR)
  return scanProofDirectory(proofsPath, 'project', projectRoot)
}

export function scanGlobalProofs(): CustomProofConfig[] {
  return scanProofDirectory(GLOBAL_PROOFS_PATH, 'global')
}

function scanProofDirectory(
  dirPath: string, 
  category: 'project' | 'global',
  projectRoot?: string
): CustomProofConfig[] {
  const proofs: CustomProofConfig[] = []
  
  if (!existsSync(dirPath)) {
    return proofs
  }
  
  try {
    if (!statSync(dirPath).isDirectory()) {
      return proofs
    }
    
    const files = readdirSync(dirPath)
    
    for (const file of files) {
      const filePath = join(dirPath, file)
      const stat = statSync(filePath)
      
      if (stat.isDirectory()) {
        const subProofs = scanProofDirectory(filePath, category, projectRoot)
        proofs.push(...subProofs)
      } else if (stat.isFile()) {
        const ext = extname(file)
        
        if (ext === '.ts' || ext === '.js' || ext === '.sh') {
          const name = basename(file, ext)
          const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          
          proofs.push({
            id,
            name,
            path: filePath,
            category,
            timeout: 60000
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning proofs directory ${dirPath}:`, error)
  }
  
  return proofs
}

export function getAllCustomProofs(projectRoot: string): CustomProofConfig[] {
  const projectProofs = scanProjectProofs(projectRoot)
  const globalProofs = scanGlobalProofs()
  
  const projectProofIds = new Set(projectProofs.map(p => p.id))
  
  const filteredGlobalProofs = globalProofs.filter(
    proof => !projectProofIds.has(proof.id)
  )
  
  return [...projectProofs, ...filteredGlobalProofs]
}

export function findCustomProof(
  proofId: string, 
  projectRoot: string
): CustomProofConfig | undefined {
  const projectProofs = scanProjectProofs(projectRoot)
  const projectProof = projectProofs.find(p => p.id === proofId)
  
  if (projectProof) {
    return projectProof
  }
  
  const globalProofs = scanGlobalProofs()
  return globalProofs.find(p => p.id === proofId)
}

export function getGlobalProofsPath(): string {
  return GLOBAL_PROOFS_PATH
}

export function getProjectProofsPath(projectRoot: string): string {
  return join(projectRoot, PROJECT_PROOFS_DIR)
}
