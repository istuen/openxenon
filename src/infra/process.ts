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
        stderr: 'pipe',
      })

      const exitCode = proc.exitCode ?? -1
      const stdoutChunks: string[] = []
      const stderrChunks: string[] = []

      if (proc.stdout) {
        for await (const chunk of proc.stdout) {
          stdoutChunks.push(chunk instanceof Uint8Array ? new TextDecoder().decode(chunk) : String(chunk))
        }
      }
      if (proc.stderr) {
        for await (const chunk of proc.stderr) {
          stderrChunks.push(chunk instanceof Uint8Array ? new TextDecoder().decode(chunk) : String(chunk))
        }
      }

      return {
        code: exitCode,
        stdout: stdoutChunks.join(''),
        stderr: stderrChunks.join(''),
        success: exitCode === 0,
      }
    } catch (error) {
      return {
        code: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        success: false,
      }
    }
  },
}
