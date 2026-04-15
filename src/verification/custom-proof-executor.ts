import { spawn } from 'bun'
import { existsSync } from 'fs'
import type { ProofInput, ProofOutput, ProofExecutionContext, CustomProofConfig } from '../types/proof'
import { ProofTimeoutError, ProofExecutionError } from '../types/proof'
import { serializeProofInput } from './proof-parameters'

export interface CustomProofExecutionOptions {
  proof: CustomProofConfig
  input: ProofInput
  context: ProofExecutionContext
}

export async function executeCustomProof(options: CustomProofExecutionOptions): Promise<ProofOutput> {
  const { proof, input, context } = options
  
  if (!existsSync(proof.path)) {
    throw new ProofExecutionError(
      proof.id,
      `Proof script not found: ${proof.path}`
    )
  }
  
  const timeout = proof.timeout || context.timeout || 60000
  
  try {
    const proc = spawn({
      cmd: ['bun', 'run', proof.path],
      cwd: context.projectRoot || process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'pipe',
      env: {
        ...process.env,
        ...context.env,
        PROOF_ID: proof.id
      }
    })
    
    const inputJson = serializeProofInput(input)
    const writer = proc.stdin.getWriter()
    writer.write(new TextEncoder().encode(inputJson))
    writer.close()
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill()
        reject(new ProofTimeoutError(proof.id, timeout))
      }, timeout)
    })
    
    const exitCode = await Promise.race([
      proc.exited,
      timeoutPromise
    ])
    
    if (exitCode === 0) {
      return {
        success: true,
        message: `Custom proof executed successfully: ${proof.id}`,
        data: {
          proofId: proof.id,
          path: proof.path,
          category: proof.category
        }
      }
    } else {
      const stderr = await new Response(proc.stderr).text()
      
      return {
        success: false,
        message: `Custom proof failed with exit code ${exitCode}: ${proof.id}`,
        error: stderr || `Exit code: ${exitCode}`,
        data: {
          proofId: proof.id,
          path: proof.path,
          category: proof.category,
          exitCode
        }
      }
    }
  } catch (error) {
    if (error instanceof ProofTimeoutError) {
      throw error
    }
    
    throw new ProofExecutionError(
      proof.id,
      `Execution failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function executeCustomProofSafe(
  options: CustomProofExecutionOptions
): Promise<ProofOutput> {
  try {
    return await executeCustomProof(options)
  } catch (error) {
    if (error instanceof ProofTimeoutError) {
      return {
        success: false,
        message: `Proof execution timed out after ${error.timeout}ms: ${error.proofId}`,
        error: error.message
      }
    }
    
    if (error instanceof ProofExecutionError) {
      return {
        success: false,
        message: `Proof execution failed: ${error.proofId}`,
        error: error.reason
      }
    }
    
    return {
      success: false,
      message: `Unexpected error during proof execution: ${options.proof.id}`,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
