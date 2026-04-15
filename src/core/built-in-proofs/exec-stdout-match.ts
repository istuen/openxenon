import { spawn } from 'bun'
import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

export const execStdoutMatchProof: BuiltInProofDefinition = {
  id: 'exec_stdout_match',
  name: 'Execute Stdout Match',
  layer: 'L2',
  description: 'Execute a command and check if stdout matches a regex pattern',
  
  validateInput(input: ProofInput): boolean {
    return (
      typeof input.command === 'string' && 
      input.command.length > 0 &&
      typeof input.pattern === 'string' &&
      input.pattern.length > 0
    )
  },
  
  async execute(input: ProofInput, context: ProofExecutionContext): Promise<ProofOutput> {
    const command = input.command as string
    const pattern = input.pattern as string
    const cwd = input.cwd ? input.cwd as string : context.projectRoot
    const timeout = context.timeout || 60000
    
    try {
      const cmdParts = command.split(' ')
      const cmd = cmdParts[0]
      const args = cmdParts.slice(1)
      
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
      
      const stdout = await new Response(proc.stdout).text()
      const regex = new RegExp(pattern)
      const matches = regex.test(stdout)
      
      if (matches) {
        const matchResult = stdout.match(regex)
        return {
          success: true,
          message: `Pattern matched in stdout: ${pattern}`,
          data: {
            command,
            pattern,
            matched: true,
            match: matchResult ? matchResult[0] : null,
            stdout: stdout.substring(0, 1000),
            exitCode,
            cwd
          }
        }
      } else {
        return {
          success: false,
          message: `Pattern not matched in stdout: ${pattern}`,
          data: {
            command,
            pattern,
            matched: false,
            stdout: stdout.substring(0, 1000),
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
          pattern,
          cwd
        }
      }
    }
  }
}

registerBuiltInProof(execStdoutMatchProof)
