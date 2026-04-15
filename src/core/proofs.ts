import { readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { COMMON_PROOFS_PATH, TEMPLATES_PATH } from './global'
import type { Proof } from '../types'

export function scanGlobalProofs(): Proof[] {
  const proofs: Proof[] = []
  
  if (scanProofDirectory(COMMON_PROOFS_PATH, 'validation', proofs)) {
    // continue scanning
  }
  
  if (scanProofDirectory(TEMPLATES_PATH, 'validation', proofs)) {
    // continue scanning
  }
  
  return proofs
}

function scanProofDirectory(
  dirPath: string, 
  defaultType: Proof['type'], 
  proofs: Proof[]
): boolean {
  try {
    if (!statSync(dirPath).isDirectory()) {
      return false
    }
    
    const files = readdirSync(dirPath)
    
    for (const file of files) {
      const filePath = join(dirPath, file)
      const stat = statSync(filePath)
      
      if (stat.isDirectory()) {
        scanProofDirectory(filePath, defaultType, proofs)
      } else if (stat.isFile()) {
        const proof = createProofFromPath(filePath)
        if (proof) {
          proofs.push(proof)
        }
      }
    }
    
    return true
  } catch {
    return false
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
