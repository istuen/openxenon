import { spawn } from 'bun'
import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

export const execExitZeroProof: BuiltInProofDefinition = {
  id: 'exec_exit_zero',
  name: 'Execute Exit Zero',
  layer: 'L2',
  description: 'Execute a command and check if it exits with code 0',
  
  validateInput(input: ProofInput): boolean {
    return typeof input.command === 'string' && input.command.length > 0
  },
  
  async execute(input: ProofInput, context: ProofExecutionContext): Promise<ProofOutput> {
    const command = input.command as string
    const cwd = input.cwd ? input.cwd as string : context.projectRoot
    const timeout = context.timeout || 60000
    
    try {
      const cmdParts = command.split(' ')
      const cmd = cmdParts[0]
      const args = cmdParts.slice(1)

      if (!cmd) {
        return {
          success: false,
          message: `Empty command provided`,
          data: { command }
        }
      }

      const proc = spawn({
        cmd: [cmd, ...args],
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          ...context.env
        }
      })
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          proc.kill()
          reject(new Error(`Command timed out after ${timeout}ms`))
        }, timeout)
      })
      
      const exitCode = await Promise.race([
        proc.exited,
        timeoutPromise
      ])
      
      if (exitCode === 0) {
        return {
          success: true,
          message: `Command executed successfully: ${command}`,
          data: {
            command,
            exitCode,
            cwd
          }
        }
      } else {
        return {
          success: false,
          message: `Command failed with exit code ${exitCode}: ${command}`,
          data: {
            command,
            exitCode,
            cwd
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        data: {
          command,
          cwd
        }
      }
    }
  }
}

registerBuiltInProof(execExitZeroProof)
