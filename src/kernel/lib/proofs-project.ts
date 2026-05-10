import { readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { getProjectProofsPath } from '../../infra/scanner'
import { scanGlobalProofs } from './proofs'
export { scanGlobalProofs }
import type { Proof } from './types'

export function scanProjectProofs(projectRoot: string): Proof[] {
  const proofs: Proof[] = []
  const projectProofsPath = getProjectProofsPath(projectRoot)
  
  scanProofDirectory(projectProofsPath, proofs)
  
  const globalProofs = scanGlobalProofs()
  
  const projectProofIds = new Set(proofs.map(p => p.id))
  for (const globalProof of globalProofs) {
    if (!projectProofIds.has(globalProof.id)) {
      proofs.push(globalProof)
    }
  }
  
  return proofs
}

function scanProofDirectory(dirPath: string, proofs: Proof[]): void {
  try {
    if (!statSync(dirPath).isDirectory()) {
      return
    }
    
    const files = readdirSync(dirPath)
    
    for (const file of files) {
      const filePath = join(dirPath, file)
      const stat = statSync(filePath)
      
      if (stat.isDirectory()) {
        scanProofDirectory(filePath, proofs)
      } else if (stat.isFile()) {
        const proof = createProofFromPath(filePath)
        if (proof) {
          proofs.push(proof)
        }
      }
    }
  } catch {
    // ignore errors
  }
}

function createProofFromPath(filePath: string): Proof | null {
  const ext = extname(filePath)
  
  if (ext !== '.ts' && ext !== '.js' && ext !== '.sh') {
    return null
  }
  
  const name = filePath.split('/').pop()?.replace(ext, '') || ''
  const id = name.toLowerCase().replace(/\s+/g, '-')
  
  const type = inferProofType(filePath)
  
  return {
    id,
    name,
    type,
    path: filePath
  }
}

function inferProofType(filePath: string): Proof['type'] {
  const lowerPath = filePath.toLowerCase()
  
  if (lowerPath.includes('lint') || lowerPath.includes('eslint')) {
    return 'lint'
  }
  
  if (lowerPath.includes('test') || lowerPath.includes('spec')) {
    return 'test'
  }
  
  return 'validation'
}
