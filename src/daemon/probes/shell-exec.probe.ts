import { spawn } from 'bun'
import type { ProbeResult } from '../../common/types/task-state'

export interface ShellExecInput {
  command: string
  cwd?: string
}

export function shellExec(input: ShellExecInput): ProbeResult {
  const { command, cwd } = input

  try {
    const proc = spawn({
      cmd: ['sh', '-c', command],
      cwd: cwd || process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe'
    })

    const exitCode = proc.exitCode

    if (exitCode === 0) {
      return { success: true, probeType: 'shell_exec' }
    } else {
      return {
        success: false,
        probeType: 'shell_exec',
        error: `Command exited with code ${exitCode}`
      }
    }
  } catch (error) {
    return {
      success: false,
      probeType: 'shell_exec',
      error: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}