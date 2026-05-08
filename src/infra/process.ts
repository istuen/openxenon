import { spawn } from 'bun'

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
  success: boolean
}

export const process = {
  exec(command: string, cwd?: string): ExecResult {
    try {
      const proc = spawn({
        cmd: ['sh', '-c', command],
        cwd: cwd || process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      })

      const exitCode = proc.exitCode
      let stdout = ''
      let stderr = ''

      try {
        stdout = new Response(proc.stdout).text()
        stderr = new Response(proc.stderr).text()
      } catch {
        // Ignore read errors
      }

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