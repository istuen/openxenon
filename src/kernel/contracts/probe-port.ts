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
  { handler: 'fs_parseable', strategy: 'fs_parseable', observationType: 'fs_parseable' },
  { handler: 'test_pass', strategy: 'test_pass', observationType: 'test_pass' },
  { handler: 'deps_resolved', strategy: 'deps_resolved', observationType: 'deps_resolved' },
  { handler: 'ts_compiles', strategy: 'ts_compiles', observationType: 'ts_compiles' },
  { handler: 'shell_exec', strategy: 'shell_exec', observationType: 'shell_exec' },
  // v1.1: exec_exit_zero / exec_output_match 移除
  // 老 ref 通过 src/cli/migrate-probe-refs.ts 翻译到 shell_exec / fs-content-match
]
