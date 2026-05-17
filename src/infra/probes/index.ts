import { executeFsExists } from './fs-exists'
import { executeFsNotExists } from './fs-not-exists'
import { executeFsMatch, type FsMatchParams } from './fs-match'
import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContext } from './fs-exists'

export type ProbeHandler = (
  params: Record<string, unknown>,
  context: ProbeContext
) => Promise<unknown>

export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
}

export interface ProbeResult extends ProbeObservation {
  result: 'PASSED' | 'FAILED'
}

export const probeHandlers: Record<string, ProbeHandler> = {
  fs_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsExists(pattern, context)
    return {
      probeType: 'fs_exists',
      output: files.join('\n'),
      executedAt: Date.now()
    } as ProbeObservation
  },

  fs_not_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsNotExists(pattern, context)
    return {
      probeType: 'fs_not_exists',
      output: files.join('\n'),
      executedAt: Date.now()
    } as ProbeObservation
  },

  fs_match: async (params, context) => {
    const matchParams = params as unknown as FsMatchParams
    const result = await executeFsMatch(matchParams, context)
    return {
      probeType: 'fs_match',
      output: result.content,
      error: result.error,
      executedAt: Date.now()
    } as ProbeObservation
  },

  shell_exec: async (params, context) => {
    const command = params.command as string
    const result: ShellExecResult = await executeShellExec(command, context)
    return {
      probeType: 'shell_exec',
      output: result.stdout || result.stderr,
      error: result.error,
      executedAt: Date.now(),
      exitCode: result.exitCode
    } as ProbeObservation & { exitCode: number | null }
  },

  exec_exit_zero: async (params, context) => {
    const command = params.command as string
    const result: ShellExecResult = await executeShellExec(command, context)
    return {
      probeType: 'exec_exit_zero',
      output: result.stdout || result.stderr,
      error: result.error,
      executedAt: Date.now(),
      exitCode: result.exitCode
    } as ProbeObservation & { exitCode: number | null }
  },

  exec_output_match: async (params, context) => {
    const command = params.command as string
    const result: ShellExecResult = await executeShellExec(command, context)
    return {
      probeType: 'exec_output_match',
      output: result.stdout || result.stderr,
      error: result.error,
      executedAt: Date.now(),
      exitCode: result.exitCode
    } as ProbeObservation & { exitCode: number | null }
  }
}

class ProbeRegistry {
  private handlers: Map<string, ProbeHandler> = new Map()
  private builtinHandlers: Record<string, ProbeHandler> = probeHandlers

  constructor() {
    for (const [type, handler] of Object.entries(probeHandlers)) {
      this.handlers.set(type, handler)
    }
  }

  register(type: string, handler: ProbeHandler): void {
    this.handlers.set(type, handler)
  }

  get(type: string): ProbeHandler | null {
    return this.handlers.get(type) || null
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys())
  }
}

export const probeRegistry = new ProbeRegistry()

export function hasProbeHandler(type: string): boolean {
  return probeRegistry.has(type)
}

export function getProbeHandler(type: string): ProbeHandler | null {
  return probeRegistry.get(type)
}

export function registerProbeHandler(type: string, handler: ProbeHandler): void {
  probeRegistry.register(type, handler)
}

export { executeFsExists, executeFsNotExists, executeFsMatch, executeShellExec }
export type { ProbeContext, ShellExecResult }
