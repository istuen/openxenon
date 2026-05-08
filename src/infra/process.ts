import { spawn } from 'bun'
import { cwd } from 'process'

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
  success: boolean
}

export const process = {
  async exec(command: string, cwdArg?: string): Promise<ExecResult> {
    try {
      const proc = spawn({
        cmd: ['sh', '-c', command],
        cwd: cwdArg || cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      })

      const exitCode = proc.exitCode ?? -1
      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()

      return {
        code: exitCode,
        stdout,
        stderr,
        success: exitCode === 0
      }
    } catch (error) {
      return {
        code: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        success: false
      }
    }
  }
}