// =============================================================================
// Kernel Probe Verdict Strategies (v0.1.2)
//
// 纯洁性约束（IAP 三轴分离）：
//   - 本模块零 IO：fs.* / net.* / child_process / process.cwd() 都不允许
//   - 只接受 Infra 物理观测（ProbeObservation）作为输入
//   - 输出 ProbeVerdict（passed + message + actual + params）
//
// 设计：策略注册表。每个 probe 类型对应一个纯函数策略。
//   fs_exists     → "命中文件数 >= expected (默认 1) → PASS"
//   fs_not_exists → "命中文件数 == 0 → PASS"
//   fs_match      → "observation.error 为空 → PASS（Infra 失败即 FAIL）"
//   shell_exec    → "exitCode === 0 → PASS"
//   exec_exit_zero → 同 shell_exec
//   exec_output_match → 同 fs_match（Infra 已 execute，错误即 FAIL）
//
// 新增策略只需往 STRATEGIES 加一条，无需改 infra。
// =============================================================================

import type { ProbeObservation, ProbeStrategy, ProbeVerdict } from '../contracts/probe-port'

/** 把 expected 归一化为 number（默认 1，用于 fs_exists 命中数阈值） */
function expectedAsNumber(expected: unknown): number {
  if (typeof expected === 'number') return expected
  if (typeof expected === 'string') {
    const n = Number(expected)
    if (!Number.isNaN(n)) return n
  }
  return 1
}

function expectedAsString(expected: unknown): string | undefined {
  if (typeof expected === 'string') return expected
  if (expected === undefined || expected === null) return undefined
  return String(expected)
}

// ---------- strategies ----------

/** fs_exists: 期望命中文件数 >= expected (默认 1) */
const fsExistsStrategy: ProbeStrategy = (observation, params) => {
  const expected = expectedAsNumber(params.expected ?? params.min)
  // Infra 返回的 output 是 "file1\nfile2\n..."，行数 = 命中数
  const hits = observation.output ? observation.output.split('\n').filter((l) => l.trim().length > 0) : []
  const passed = hits.length >= expected
  return {
    passed,
    message: passed
      ? `fs-exists: hit ${hits.length} file(s) >= expected ${expected}`
      : `fs-exists: hit ${hits.length} file(s) < expected ${expected}`,
    actual: hits,
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `expected >= ${expected} hit(s), got ${hits.length}`,
  }
}

/** fs_not_exists: 期望命中文件数 == 0 */
const fsNotExistsStrategy: ProbeStrategy = (observation, params) => {
  const hits = observation.output ? observation.output.split('\n').filter((l) => l.trim().length > 0) : []
  const passed = hits.length === 0
  return {
    passed,
    message: passed ? 'fs-not-exists: no matching file' : `fs-not-exists: found ${hits.length} matching file(s)`,
    actual: hits,
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `expected 0 hit(s), got ${hits.length}`,
  }
}

/** fs_match: 期望 output.matched === true（v1.1 数据契约修复）
 *
 * 修复前：verdict 只检查 `observation.output?.length > 0`——Infra 返回的 'Pattern
 *          not found' 字符串长度 > 0，所以任何 file read 成功都 PASS。完全忽略
 *          Infra 实际计算的 `matched` 布尔。
 *
 * 修复后：Infra JSON-stringify `{ matched, content, pattern }`，Kernel JSON.parse
 *          并读 `matched` 字段作为唯一判定依据。`content` 进入 `actual` 供
 *          frozen.json 审计。
 */
const fsMatchStrategy: ProbeStrategy = (observation, params) => {
  let matched = false
  let content: string | undefined
  let pattern: string | undefined
  try {
    const parsed = JSON.parse(observation.output ?? '{}') as {
      matched?: boolean
      content?: string
      pattern?: string
    }
    matched = parsed.matched === true
    content = parsed.content
    pattern = parsed.pattern
  } catch {
    // 旧格式 / 损坏数据 → 走兜底 FAIL（不再 'length > 0' 假 PASS）
    matched = false
  }

  const passed = matched && !observation.error
  const expectedStr = expectedAsString(params.expected ?? params.pattern ?? pattern)
  return {
    passed,
    message: passed
      ? `fs-match: matched "${pattern ?? expectedStr ?? ''}"`
      : `fs-match: ${observation.error ?? (pattern ? `pattern not found` : 'no match')}`,
    actual: content,
    params: { ...params, expected: expectedStr, pattern },
    duration: observation.executedAt,
    failureMessage: passed ? undefined : (observation.error ?? `pattern "${pattern ?? expectedStr ?? ''}" not found`),
  }
}

/** shell_exec / exec_exit_zero: 期望 exitCode === 0 */
const shellExecStrategy: ProbeStrategy = (observation, params) => {
  const passed = observation.exitCode === 0
  return {
    passed,
    message: passed
      ? `shell-exec: exit 0`
      : `shell-exec: exit ${observation.exitCode ?? 'unknown'}${observation.error ? ` (${observation.error})` : ''}`,
    actual: { exitCode: observation.exitCode, stdout: observation.output, stderr: observation.error },
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `exit code ${observation.exitCode ?? 'unknown'}`,
  }
}

/** exec_output_match: 期望 output 包含 expected 字符串 */
const execOutputMatchStrategy: ProbeStrategy = (observation, params) => {
  const expected = expectedAsString(params.expected ?? params.contains) ?? ''
  const output = observation.output ?? ''
  const passed = !observation.error && output.includes(expected)
  return {
    passed,
    message: passed ? `exec-output-match: output contains "${expected}"` : `exec-output-match: no match`,
    actual: output,
    params: { ...params, expected },
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `expected to contain "${expected}"`,
  }
}

// ---------- registry ----------

export const PROBE_VERDICT_STRATEGIES: Record<string, ProbeStrategy> = {
  fs_exists: fsExistsStrategy,
  fs_not_exists: fsNotExistsStrategy,
  fs_match: fsMatchStrategy,
  shell_exec: shellExecStrategy,
  exec_exit_zero: shellExecStrategy,
  exec_output_match: execOutputMatchStrategy,
}

export const PROBE_VERDICT_ALIASES: Record<string, string> = {
  'fs-exists': 'fs_exists',
  'fs-not-exists': 'fs_not_exists',
  'fs-content-match': 'fs_match',
  'exec-exit-zero': 'shell_exec',
  'shell-exec': 'shell_exec',
}

export function getVerdictStrategy(observationType: string): ProbeStrategy | null {
  const normalized = PROBE_VERDICT_ALIASES[observationType] ?? observationType
  return PROBE_VERDICT_STRATEGIES[normalized] ?? null
}

/** Kernel 入口：根据 observationType 路由到对应纯函数 strategy */
export function judge(observation: ProbeObservation, params: Record<string, unknown>): ProbeVerdict {
  const strategy = getVerdictStrategy(observation.probeType)
  if (!strategy) {
    return {
      passed: false,
      message: `no verdict strategy for probe type: ${observation.probeType}`,
      params,
      failureMessage: `unknown probe type: ${observation.probeType}`,
    }
  }
  return strategy(observation, params)
}
