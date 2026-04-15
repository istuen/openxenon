import { spawn } from 'bun'
import { existsSync } from 'fs'

export interface ExecuteProofOptions {
  proofPath: string
  timeout?: number
}

export interface ExecuteProofResult {
  success: boolean
  output?: string
  error?: string
}

export async function executeProof(
  proofPath: string,
  timeout: number = 60000
): Promise<ExecuteProofResult> {
  if (!existsSync(proofPath)) {
    return {
      success: false,
      error: `Proof script not found: ${proofPath}`
    }
  }

  try {
    const proc = spawn({
      cmd: ['bun', 'run', proofPath],
      stdout: 'pipe',
      stderr: 'pipe'
    })

    const timeoutPromise = new Promise<ExecuteProofResult>((_, reject) => {
      setTimeout(() => {
        proc.kill()
        reject(new Error(`Proof execution timed out after ${timeout}ms`))
      }, timeout)
    })

    const executionPromise = proc.exited.then(async (exitCode) => {
      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()

      if (exitCode === 0) {
        return {
          success: true,
          output: stdout || stderr
        }
      } else {
        return {
          success: false,
          output: stdout,
          error: stderr || `Proof exited with code ${exitCode}`
        }
      }
    })

    return Promise.race([executionPromise, timeoutPromise])
      .catch((error) => ({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }))
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function executeProofAsync(
  proofPath: string,
  timeout: number = 60000
): Promise<ExecuteProofResult> {
  return executeProof(proofPath, timeout)
}
