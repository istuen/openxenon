export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
  exitCode?: number | null
  /** v0.2 T4: Infra 层填充的信号污染标记（YELLOW 透传 / RED 短路 INCONCLUSIVE） */
  interference?: { flags: import('./io-primitive').InterferenceFlag[] }
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
  /**
   * v0.2 T4: verdict 三态（必填）
   * - PASS: 命中
   * - FAIL: 未命中
   * - INCONCLUSIVE: 信号污染（任一 RED flag 短路返回）
   */
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'
  /** 保留兼容字段：PASS / INCONCLUSIVE 都映射 passed: false（除 PASS 仍 passed: true） */
  passed: boolean
  message: string
  actual?: unknown
  params?: Record<string, unknown>
  duration?: number
  failureMessage?: string
  /** v0.2 T4: YELLOW flag 透传记录（无 flag 时缺省） */
  interferenceFlags?: import('./io-primitive').InterferenceFlag[]
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
  { handler: 'lint_check', strategy: 'lint_check', observationType: 'lint_check' },
  { handler: 'http_responds', strategy: 'http_responds', observationType: 'http_responds' },
  { handler: 'file_exports', strategy: 'file_exports', observationType: 'file_exports' },
  { handler: 'shell_exec', strategy: 'shell_exec', observationType: 'shell_exec' },
  // v1.2: git-* builtin probes（PoC: git-workflow Blueprint 用）
  { handler: 'git_clean', strategy: 'git_clean', observationType: 'git_clean' },
  { handler: 'git_branch_exists', strategy: 'git_branch_exists', observationType: 'git_branch_exists' },
  { handler: 'git_status_clean', strategy: 'git_status_clean', observationType: 'git_status_clean' },
  { handler: 'git_merge_feasible', strategy: 'git_merge_feasible', observationType: 'git_merge_feasible' },
  // v1.1: exec_exit_zero / exec_output_match 移除
  // 老 ref 通过 src/cli/migrate-probe-refs.ts 翻译到 shell_exec / fs-content-match
]
