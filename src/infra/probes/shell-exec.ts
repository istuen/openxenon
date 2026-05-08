import { spawn } from 'child_process'
import { join } from 'path'

export interface ProbeContext {
  projectRoot: string
}

export interface ShellExecResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export function executeShellExec(
  command: string,
  context: ProbeContext
): Promise<ShellExecResult> {
  return new Promise((resolve) => {
    const isAbsolute = command.startsWith('/')
    const fullCommand = isAbsolute ? command : join(context.projectRoot, command)

    const proc = spawn(fullCommand, [], {
      shell: true,
      cwd: context.projectRoot
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code
      })
    })

    proc.on('error', (err: Error) => {
      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: null
      })
    })
  })
}
