export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
  exitCode?: number | null
}

export interface ProbeResult extends ProbeObservation {
  result: 'PASSED' | 'FAILED'
  params?: Record<string, unknown>
  actual?: unknown
  failureMessage?: string
  duration?: number
}

export type ProbeStrategy = (observation: ProbeObservation, params: Record<string, unknown>) => ProbeVerdict

export interface ProbeVerdict {
  passed: boolean
  message: string
  actual?: unknown
  params?: Record<string, unknown>
  duration?: number
  failureMessage?: string
}

export interface ProbeContextBase {
  projectRoot: string
}

export interface ProbeDefinition {
  type: string
  params: Record<string, unknown>
  expected?: unknown
}

export interface ProbeStrategyMapping {
  handler: string
  strategy: string
  observationType: string
}

export type ProbeHandler = (params: Record<string, unknown>, context: ProbeContextBase) => Promise<ProbeObservation>

export const PROBE_STRATEGY_MAPPINGS: ProbeStrategyMapping[] = [
  { handler: 'fs_exists', strategy: 'fs_exists', observationType: 'fs_exists' },
  { handler: 'fs_not_exists', strategy: 'fs_not_exists', observationType: 'fs_not_exists' },
  { handler: 'fs_match', strategy: 'fs_match', observationType: 'fs_match' },
  { handler: 'shell_exec', strategy: 'shell_exec', observationType: 'shell_exec' },
  { handler: 'exec_exit_zero', strategy: 'exec_exit_zero', observationType: 'exec_exit_zero' },
  { handler: 'exec_output_match', strategy: 'exec_output_match', observationType: 'exec_output_match' },
]
