import { readFileSync, existsSync } from 'fs'
import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

export const fsContentMatchProof: BuiltInProofDefinition = {
  id: 'fs_content_match',
  name: 'File Content Match',
  layer: 'L1',
  description: 'Check if file content matches a regex pattern',
  
  validateInput(input: ProofInput): boolean {
    return (
      typeof input.path === 'string' && 
      input.path.length > 0 &&
      typeof input.pattern === 'string' &&
      input.pattern.length > 0
    )
  },
  
  async execute(input: ProofInput, context: ProofExecutionContext): Promise<ProofOutput> {
    const path = input.path as string
    const pattern = input.pattern as string
    
    try {
      const absolutePath = context.projectRoot 
        ? `${context.projectRoot}/${path}` 
        : path
      
      if (!existsSync(absolutePath)) {
        return {
          success: false,
          message: `File does not exist: ${path}`
        }
      }
      
      const content = readFileSync(absolutePath, 'utf-8')
      const regex = new RegExp(pattern)
      const matches = regex.test(content)
      
      if (matches) {
        const matchResult = content.match(regex)
        return {
          success: true,
          message: `Pattern matched in file: ${path}`,
          data: {
            path: absolutePath,
            pattern,
            matched: true,
            match: matchResult ? matchResult[0] : null
          }
        }
      } else {
        return {
          success: false,
          message: `Pattern not matched in file: ${path}`,
          data: {
            path: absolutePath,
            pattern,
            matched: false
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error matching content: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

registerBuiltInProof(fsContentMatchProof)
