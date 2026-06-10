// =============================================================================
// Kernel Probe Verdict Strategies (v0.1.2 → v1.1 清理)
//
// 纯洁性约束（IAP 三轴分离）：
//   - 本模块零 IO：fs.* / net.* / child_process / process.cwd() 都不允许
//   - 只接受 Infra 物理观测（ProbeObservation）作为输入
//   - 输出 ProbeVerdict（passed + message + actual + params）
//
// 设计：策略注册表。每个 probe 类型对应一个纯函数策略。
//   fs_exists     → "命中文件数 >= expected (默认 1) → PASS"
//   fs_not_exists → "命中文件数 == 0 → PASS"
//   fs_match      → "output.matched === true → PASS" (v1.1 数据契约修复)
//   fs_parseable  → "output.parsed === true → PASS" (v1.1 新增)
//   shell_exec    → "exitCode === 0 → PASS"
//
// v1.1 清理：移除 exec_exit_zero / exec_output_match 遗留别名
//   （这两个与 shell_exec / fs_match 完全重复，仅为旧 Infra 兼容）
//   向后兼容：migrate-probe-refs.ts 保留映射表，标注 deprecated
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

/** fs_parseable: 期望 output.parsed === true（v1.1） */
const fsParseableStrategy: ProbeStrategy = (observation, params) => {
  let parsed = false
  let format: string | undefined
  let topLevelKeys: string[] | undefined
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      parsed?: boolean
      format?: string
      topLevelKeys?: string[]
    }
    parsed = obj.parsed === true
    format = obj.format
    topLevelKeys = obj.topLevelKeys
  } catch {
    parsed = false
  }

  const passed = parsed && !observation.error
  return {
    passed,
    message: passed
      ? `fs-parseable: ${format ?? 'parsed'} valid${topLevelKeys ? ` (${topLevelKeys.length} keys)` : ''}`
      : `fs-parseable: ${observation.error ?? 'parse failed'}`,
    actual: { format, topLevelKeys },
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : (observation.error ?? 'JSON parse failed'),
  }
}

/** test_pass: 期望 output.passed === true（v1.1 P1 probe）
 *
 * 关键：AI 写的代码如果测试不通过，verdict 必须 FAIL——这是 Proof 轴
 * 阻止"AI 假完成"的核心场景。
 */
const testPassStrategy: ProbeStrategy = (observation, params) => {
  let passed = false
  let exitCode: number | null = null
  let summary: { passed: number; failed: number; total: number } | undefined
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      passed?: boolean
      exitCode?: number | null
      summary?: { passed: number; failed: number; total: number }
    }
    passed = obj.passed === true
    exitCode = obj.exitCode ?? null
    summary = obj.summary
  } catch {
    passed = false
  }

  const ok = passed && !observation.error
  return {
    passed: ok,
    message: ok
      ? `test-pass: all tests passed${summary ? ` (${summary.passed}/${summary.total})` : ''}`
      : `test-pass: ${observation.error ?? (summary ? `${summary.failed} failed` : 'tests failed')}`,
    actual: { exitCode, summary },
    params,
    duration: observation.executedAt,
    failureMessage: ok ? undefined : (observation.error ?? `${summary?.failed ?? '?'} test(s) failed`),
  }
}
/** deps_resolved: 期望 output.missing.length === 0（v1.1 P1 probe）
 *
 * AI 经常幻觉依赖项——声称装了某个包但 package.json 没声明。
 * 这个 probe 阻止"AI 假完成依赖安装"。
 */
const depsResolvedStrategy: ProbeStrategy = (observation, params) => {
  let missing: string[] = []
  let declaredCount = 0
  let resolvedCount = 0
  let lockfilePath: string | undefined
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      missing?: string[]
      declaredCount?: number
      resolvedCount?: number
      lockfilePath?: string
    }
    missing = obj.missing ?? []
    declaredCount = obj.declaredCount ?? 0
    resolvedCount = obj.resolvedCount ?? 0
    lockfilePath = obj.lockfilePath
  } catch {
    // ignore
  }

  const passed = missing.length === 0 && !observation.error
  return {
    passed,
    message: passed
      ? `deps-resolved: all ${declaredCount} deps resolved${lockfilePath ? ` via ${lockfilePath}` : ''}`
      : `deps-resolved: ${missing.length} missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`,
    actual: { declaredCount, resolvedCount, missing, lockfilePath },
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `${missing.length} dep(s) declared but not resolved: ${missing.join(', ')}`,
  }
}

/** ts_compiles: 期望 output.passed === true（v1.1 P1 probe） */
const tsCompilesStrategy: ProbeStrategy = (observation, params) => {
  let passed = false
  let exitCode: number | null = null
  let errorCount: number | undefined
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      passed?: boolean
      exitCode?: number | null
      errorCount?: number
    }
    passed = obj.passed === true
    exitCode = obj.exitCode ?? null
    errorCount = obj.errorCount
  } catch {
    passed = false
  }

  const ok = passed && !observation.error
  return {
    passed: ok,
    message: ok
      ? `ts-compiles: type check passed`
      : `ts-compiles: ${errorCount !== undefined ? `${errorCount} error(s)` : (observation.error ?? 'type check failed')}`,
    actual: { exitCode, errorCount },
    params,
    duration: observation.executedAt,
    failureMessage: ok ? undefined : (observation.error ?? `${errorCount ?? '?'} type error(s)`),
  }
}

/** lint_check: 期望 output.passed === true（v1.1 P1 probe）
 *
 * 注意：biome 是 devDep——若用户项目没装 biome，verdict 走 'error' 兜底 FAIL。
 * Catalog description 已明示"需要 biome"。
 */
const lintCheckStrategy: ProbeStrategy = (observation, params) => {
  let passed = false
  let exitCode: number | null = null
  let issueCount: number | undefined
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      passed?: boolean
      exitCode?: number | null
      issueCount?: number
    }
    passed = obj.passed === true
    exitCode = obj.exitCode ?? null
    issueCount = obj.issueCount
  } catch {
    passed = false
  }

  const ok = passed && !observation.error
  return {
    passed: ok,
    message: ok
      ? `lint-check: no issues`
      : `lint-check: ${issueCount !== undefined ? `${issueCount} issue(s)` : (observation.error ?? 'lint failed')}`,
    actual: { exitCode, issueCount },
    params,
    duration: observation.executedAt,
    failureMessage: ok ? undefined : (observation.error ?? `${issueCount ?? '?'} lint issue(s)`),
  }
}

/** http_responds: 期望 output.status === output.expectedStatus（v1.1 P1 probe）
 *
 * 安全：默认 timeout 5s；不缓存；Bun fetch 内部做连接池管理。
 */
const httpRespondsStrategy: ProbeStrategy = (observation, params) => {
  let passed = false
  let status: number | null = null
  let durationMs: number | undefined
  const expectedStatus: number = Number(params.expectedStatus ?? 200)
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      passed?: boolean
      status?: number | null
      durationMs?: number
    }
    passed = obj.passed === true
    status = obj.status ?? null
    durationMs = obj.durationMs
  } catch {
    passed = false
  }

  const ok = passed && !observation.error
  return {
    passed: ok,
    message: ok
      ? `http-responds: status ${status} === expected ${expectedStatus} (${durationMs ?? '?'}ms)`
      : `http-responds: ${observation.error ?? `status ${status} !== expected ${expectedStatus}`}`,
    actual: { status, expectedStatus, durationMs },
    params,
    duration: observation.executedAt,
    failureMessage: ok ? undefined : (observation.error ?? `status ${status ?? 'null'} !== expected ${expectedStatus}`),
  }
}

/** file_exports: 期望 exports.length > 0（v1.1 P1 probe）
 *
 * 进程隔离 runtime import（spawn bun run tmp script）——零新依赖，
 * Bun 原生支持 TS。结果绝对准确（运行时真相）。
 */
const fileExportsStrategy: ProbeStrategy = (observation, params) => {
  let exports: string[] = []
  let exportCount = 0
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      exports?: string[]
      exportCount?: number
    }
    exports = obj.exports ?? []
    exportCount = obj.exportCount ?? exports.length
  } catch {
    // ignore
  }

  const passed = exports.length > 0 && !observation.error
  return {
    passed,
    message: passed
      ? `file-exports: ${exportCount} exports found${exports.length > 0 ? ` (e.g. ${exports.slice(0, 3).join(', ')})` : ''}`
      : `file-exports: ${observation.error ?? 'no exports found'}`,
    actual: { exports, exportCount },
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : (observation.error ?? 'no exports found'),
  }
}

/** git_clean: 期望 output.clean === true（v1.2 probe，PoC: git-workflow）
 *
 * 不接受 includeUntracked=true 的宽容判定：ci 流水线不应漏检 untracked
 */
const gitCleanStrategy: ProbeStrategy = (observation, params) => {
  let clean = false
  let dirtyFiles: string[] = []
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      clean?: boolean
      dirtyFiles?: string[]
    }
    clean = obj.clean === true
    dirtyFiles = obj.dirtyFiles ?? []
  } catch {
    clean = false
  }

  const passed = clean && !observation.error
  return {
    passed,
    message: passed
      ? `git-clean: working tree clean`
      : `git-clean: ${dirtyFiles.length} dirty file(s)${dirtyFiles.length > 0 ? ` (e.g. ${dirtyFiles.slice(0, 3).join(', ')})` : ''}`,
    actual: { clean, dirtyFiles },
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `${dirtyFiles.length} dirty file(s) found`,
  }
}

/** git_branch_exists: 期望 output.exists === true（v1.2 probe） */
const gitBranchExistsStrategy: ProbeStrategy = (observation, params) => {
  let exists = false
  try {
    const obj = JSON.parse(observation.output ?? '{}') as { exists?: boolean }
    exists = obj.exists === true
  } catch {
    exists = false
  }

  const passed = exists && !observation.error
  return {
    passed,
    message: passed
      ? `git-branch-exists: branch "${params.branch ?? ''}" found`
      : `git-branch-exists: branch "${params.branch ?? ''}" not found`,
    actual: { exists, branch: params.branch },
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `branch "${params.branch ?? ''}" not found`,
  }
}

/** git_status_clean: 与 git_clean 同义（v1.2 probe，verbose alias） */
const gitStatusCleanStrategy: ProbeStrategy = (observation, params) => {
  let clean = false
  let dirtyFiles: string[] = []
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      clean?: boolean
      dirtyFiles?: string[]
    }
    clean = obj.clean === true
    dirtyFiles = obj.dirtyFiles ?? []
  } catch {
    clean = false
  }

  const passed = clean && !observation.error
  return {
    passed,
    message: passed ? `git-status-clean: working tree clean` : `git-status-clean: ${dirtyFiles.length} dirty file(s)`,
    actual: { clean, dirtyFiles },
    params,
    duration: observation.executedAt,
    failureMessage: passed ? undefined : `${dirtyFiles.length} dirty file(s) found`,
  }
}

/** git_merge_feasible: 期望 status ∈ {can_ff_merge, can_merge_clean}（v1.2 probe，PoC 核心）
 *
 * 关键：Kernel 不碰 git。Infra 跑 git merge-tree 算法（纯观察），
 * Kernel 只看 Infra JSON-stringify 出的 status 字段做判定。
 *
 * 状态映射：
 *   can_ff_merge       → PASS（fast-forward 可行）
 *   can_merge_clean    → PASS（需 --no-ff 创 merge commit；OXN 不替人 merge，但方案可行）
 *   has_conflicts      → FAIL（冲突文件列表非空，工程师需手动 resolve）
 *   dirty_worktree     → FAIL（worktree 有未提交改动，应先 clean）
 *   unknown            → FAIL（git 报错 / 分支不存在；YIELD_TO_HUMAN）
 */
const gitMergeFeasibleStrategy: ProbeStrategy = (observation, params) => {
  let status: string = 'unknown'
  let conflictFiles: string[] = []
  let targetCommit: string | null = null
  let workCommit: string | null = null
  try {
    const obj = JSON.parse(observation.output ?? '{}') as {
      status?: string
      conflictFiles?: string[]
      targetCommit?: string | null
      workCommit?: string | null
    }
    status = obj.status ?? 'unknown'
    conflictFiles = obj.conflictFiles ?? []
    targetCommit = obj.targetCommit ?? null
    workCommit = obj.workCommit ?? null
  } catch {
    status = 'unknown'
  }

  const passed = (status === 'can_ff_merge' || status === 'can_merge_clean') && !observation.error
  return {
    passed,
    message: passed
      ? `git-merge-feasible: ${status}`
      : `git-merge-feasible: ${status}${conflictFiles.length > 0 ? ` (${conflictFiles.length} conflict file(s))` : ''}`,
    actual: { status, conflictFiles, targetCommit, workCommit },
    params,
    duration: observation.executedAt,
    failureMessage: passed
      ? undefined
      : status === 'has_conflicts'
        ? `${conflictFiles.length} conflict file(s): ${conflictFiles.slice(0, 3).join(', ')}`
        : status === 'dirty_worktree'
          ? 'working tree has uncommitted changes'
          : status === 'unknown'
            ? 'merge feasibility could not be determined (check branch names / git state)'
            : `unexpected status: ${status}`,
  }
}
// ---------- registry ----------

export const PROBE_VERDICT_STRATEGIES: Record<string, ProbeStrategy> = {
  fs_exists: fsExistsStrategy,
  fs_not_exists: fsNotExistsStrategy,
  fs_match: fsMatchStrategy,
  fs_parseable: fsParseableStrategy,
  test_pass: testPassStrategy,
  deps_resolved: depsResolvedStrategy,
  ts_compiles: tsCompilesStrategy,
  lint_check: lintCheckStrategy,
  http_responds: httpRespondsStrategy,
  file_exports: fileExportsStrategy,
  shell_exec: shellExecStrategy,
  // v1.2: git-* builtin probes（PoC: git-workflow Blueprint）
  git_clean: gitCleanStrategy,
  git_branch_exists: gitBranchExistsStrategy,
  git_status_clean: gitStatusCleanStrategy,
  git_merge_feasible: gitMergeFeasibleStrategy,
  // v1.1: exec_exit_zero 与 exec_output_match 移除（迁移到 shell_exec / fs-content-match）
  // 老 ref 通过 src/cli/migrate-probe-refs.ts 翻译；STRATEGIES 不再注册
}

export const PROBE_VERDICT_ALIASES: Record<string, string> = {
  'fs-exists': 'fs_exists',
  'fs-not-exists': 'fs_not_exists',
  'fs-content-match': 'fs_match',
  'exec-exit-zero': 'shell_exec',
  'shell-exec': 'shell_exec',
  // v1.2: git-* aliases
  'git-clean': 'git_clean',
  'git-branch-exists': 'git_branch_exists',
  'git-status-clean': 'git_status_clean',
  'git-merge-feasible': 'git_merge_feasible',
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
