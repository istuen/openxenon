import { existsSync, statSync } from 'fs'
import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../types/proof'
import { registerBuiltInProof } from './built-in-proofs-registry'

export const fsExistsProof: BuiltInProofDefinition = {
  id: 'fs_exists',
  name: 'File System Exists',
  layer: 'L1',
  description: 'Check if a file or directory exists on the filesystem',
  
  validateInput(input: ProofInput): boolean {
    return typeof input.path === 'string' && input.path.length > 0
  },
  
  async execute(input: ProofInput, context: ProofExecutionContext): Promise<ProofOutput> {
    const path = input.path as string
    
    try {
      const absolutePath = context.projectRoot 
        ? `${context.projectRoot}/${path}` 
        : path
      
      const exists = existsSync(absolutePath)
      
      if (exists) {
        const stats = statSync(absolutePath)
        const type = stats.isDirectory() ? 'directory' : 'file'
        
        return {
          success: true,
          message: `${type} exists: ${path}`,
          data: {
            path: absolutePath,
            type,
            exists: true
          }
        }
      } else {
        return {
          success: false,
          message: `Path does not exist: ${path}`,
          data: {
            path: absolutePath,
            exists: false
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error checking path: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

registerBuiltInProof(fsExistsProof)
