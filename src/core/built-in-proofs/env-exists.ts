import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

export const envExistsProof: BuiltInProofDefinition = {
  id: 'env_exists',
  name: 'Environment Variable Exists',
  layer: 'L3',
  description: 'Check if an environment variable exists in process.env or .env file',
  
  validateInput(input: ProofInput): boolean {
    return typeof input.key === 'string' && input.key.length > 0
  },
  
  async execute(input: ProofInput, context: ProofExecutionContext): Promise<ProofOutput> {
    const key = input.key as string
    
    try {
      if (process.env[key] !== undefined) {
        return {
          success: true,
          message: `Environment variable exists: ${key}`,
          data: {
            key,
            source: 'process.env',
            exists: true
          }
        }
      }
      
      if (context.projectRoot) {
        const envPath = join(context.projectRoot, '.env')
        
        if (existsSync(envPath)) {
          const envContent = readFileSync(envPath, 'utf-8')
          const lines = envContent.split('\n')
          
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('#')) {
              const [envKey] = trimmed.split('=')
              if (envKey && envKey.trim() === key) {
                return {
                  success: true,
                  message: `Environment variable exists in .env file: ${key}`,
                  data: {
                    key,
                    source: '.env',
                    exists: true
                  }
                }
              }
            }
          }
        }
      }
      
      return {
        success: false,
        message: `Environment variable does not exist: ${key}`,
        data: {
          key,
          exists: false
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error checking environment variable: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

registerBuiltInProof(envExistsProof)
