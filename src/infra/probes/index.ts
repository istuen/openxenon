import { executeFsExists } from './fs-exists'
import { executeFsNotExists } from './fs-not-exists'
import { executeFsMatch, type FsMatchParams } from './fs-match'
import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContext } from './fs-exists'

export type ProbeHandler = (
  params: Record<string, unknown>,
  context: ProbeContext
) => Promise<unknown>

export interface ProbeResult {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  executedAt: number
}

export const probeHandlers: Record<string, ProbeHandler> = {
  fs_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsExists(pattern, context)
    return {
      probeType: 'fs_exists',
      result: files.length > 0 ? 'PASSED' : 'FAILED',
      output: files.join('\n'),
      executedAt: Date.now()
    } as ProbeResult
  },

  fs_not_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsNotExists(pattern, context)
    return {
      probeType: 'fs_not_exists',
      result: files.length === 0 ? 'PASSED' : 'FAILED',
      output: files.join('\n'),
      executedAt: Date.now()
    } as ProbeResult
  },

  fs_match: async (params, context) => {
    const matchParams = params as unknown as FsMatchParams
    const result = await executeFsMatch(matchParams, context)
    return {
      probeType: 'fs_match',
      result: result.matched ? 'PASSED' : 'FAILED',
      output: result.content,
      error: result.error,
      executedAt: Date.now()
    } as ProbeResult
  },

  shell_exec: async (params, context) => {
    const command = params.command as string
    const result: ShellExecResult = await executeShellExec(command, context)
    return {
      probeType: 'shell_exec',
      result: result.success ? 'PASSED' : 'FAILED',
      output: result.stdout || result.stderr,
      error: result.success ? undefined : `Exit code: ${result.exitCode}`,
      executedAt: Date.now()
    } as ProbeResult
  },

  exec_exit_zero: async (params, context) => {
    const command = params.command as string
    const result: ShellExecResult = await executeShellExec(command, context)
    const passed = result.exitCode === 0
    return {
      probeType: 'exec_exit_zero',
      result: passed ? 'PASSED' : 'FAILED',
      output: result.stdout || result.stderr,
      error: passed ? undefined : `Exit code: ${result.exitCode}`,
      executedAt: Date.now()
    } as ProbeResult
  }
}

export function hasProbeHandler(type: string): boolean {
  return type in probeHandlers
}

export function getProbeHandler(type: string): ProbeHandler | null {
  return probeHandlers[type] || null
}

export { executeFsExists, executeFsNotExists, executeFsMatch, executeShellExec }
export type { ProbeContext, ShellExecResult }
