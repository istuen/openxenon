import { spawn } from 'child_process'
import type { ProbeContextBase } from '../../kernel/contracts/probe-port'

export interface ProbeContext extends ProbeContextBase {}

export interface ShellExecResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  error?: string
}

function validateCommand(command: string): boolean {
  if (!command || command.trim().length === 0) return false
  if (command.length > 4096) return false
  const dangerousPatterns = [/\0/, /\r?\n(?=[^])/]
  return !dangerousPatterns.some((pattern) => pattern.test(command))
}

export function executeShellExec(command: string, context: ProbeContext): Promise<ShellExecResult> {
  return new Promise((resolve) => {
    if (!validateCommand(command)) {
      resolve({
        success: false,
        stdout: '',
        stderr: 'Invalid command: empty, too long, or contains null bytes',
        exitCode: null,
      })
      return
    }

    const proc = spawn(command, [], {
      shell: true,
      cwd: context.projectRoot,
    })

    const timeout = setTimeout(() => {
      proc.kill()
      resolve({
        success: false,
        stdout: '',
        stderr: 'Command timed out (30s)',
        exitCode: null,
      })
    }, 30000)

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null) => {
      clearTimeout(timeout)
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code,
      })
    })

    proc.on('error', (err: Error) => {
      clearTimeout(timeout)
      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: null,
      })
    })
  })
}
