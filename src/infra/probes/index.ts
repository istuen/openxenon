import type { ProbeContext } from './fs-exists'
import { executeFsExists } from './fs-exists'
import { executeFsMatch, type FsMatchParams } from './fs-match'
import { executeFsNotExists } from './fs-not-exists'
import { executeShellExec, type ShellExecResult } from './shell-exec'

export type ProbeHandler = (params: Record<string, unknown>, context: ProbeContext) => Promise<unknown>

export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
}

export interface ProbeResult extends ProbeObservation {
  result: 'PASSED' | 'FAILED'
  params?: Record<string, unknown>
  actual?: unknown
  failureMessage?: string
  duration?: number
}

export const probeHandlers: Record<string, ProbeHandler> = {
  fs_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsExists(pattern, context)
    return {
      probeType: 'fs_exists',
      output: files.join('\n'),
      executedAt: Date.now(),
    } as ProbeObservation
  },

  fs_not_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsNotExists(pattern, context)
    return {
      probeType: 'fs_not_exists',
      output: files.join('\n'),
      executedAt: Date.now(),
    } as ProbeObservation
  },

  fs_match: async (params, context) => {
    const matchParams = params as unknown as FsMatchParams
    const result = await executeFsMatch(matchParams, context)
    return {
      probeType: 'fs_match',
      output: result.content,
      error: result.error,
      executedAt: Date.now(),
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
      exitCode: result.exitCode,
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
      exitCode: result.exitCode,
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
      exitCode: result.exitCode,
    } as ProbeObservation & { exitCode: number | null }
  },
}

class ProbeRegistry {
  private handlers: Map<string, ProbeHandler> = new Map()

  private aliases: Record<string, string> = {
    'fs-exists': 'fs_exists',
    'fs-not-exists': 'fs_not_exists',
    'fs-content-match': 'fs_match',
    'exec-exit-zero': 'shell_exec',
  }

  constructor() {
    for (const [type, handler] of Object.entries(probeHandlers)) {
      this.handlers.set(type, handler)
    }
    for (const [alias, target] of Object.entries(this.aliases)) {
      const handler = this.handlers.get(target)
      if (handler) {
        this.handlers.set(alias, handler)
      }
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

  addAlias(alias: string, target: string): void {
    this.aliases[alias] = target
    const handler = this.handlers.get(target)
    if (handler) {
      this.handlers.set(alias, handler)
    }
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

export type { ProbeContext, ShellExecResult }
export { executeFsExists, executeFsMatch, executeFsNotExists, executeShellExec }
