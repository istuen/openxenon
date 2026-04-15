import { existsSync } from 'fs'
import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

export const fsNotExistsProof: BuiltInProofDefinition = {
  id: 'fs_not_exists',
  name: 'File System Not Exists',
  layer: 'L1',
  description: 'Check if a file or directory does not exist on the filesystem',
  
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
      
      if (!exists) {
        return {
          success: true,
          message: `Path does not exist: ${path}`,
          data: {
            path: absolutePath,
            exists: false
          }
        }
      } else {
        return {
          success: false,
          message: `Path exists when it should not: ${path}`,
          data: {
            path: absolutePath,
            exists: true
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

registerBuiltInProof(fsNotExistsProof)
