// =============================================================================
// test-coverage probe (RFC-0016 D2)
//
// 验证测试覆盖率（lines / branches / functions）≥ 阈值。
//
// 一等公民 verdict: shell-exec 只能拿到 exit code (反映 pass/fail),
//   无法做数值阈值比较。本 probe 主动解析 coverage-summary.json 做精确比较。
//
// v0.6.2: 仅支持 bun runner (OXN 内置默认); jest/vitest 通过
//   [RFC-0015 D5.1 StackToolInfo](./RFC-0015-proof-system-overhaul.html#d51-handler-读-stacktoolinfo-覆盖硬编码命令)
//   模式扩展 (v0.7.0 范围)。
//
// L1-Infra: 跑 `bun test --coverage` 走 ShellProvider (复用 shell_exec);
//   解析 coverage-summary.json 走 L1 filesystem 接口。
// =============================================================================

import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'
import { resolveToolCommand } from './_tool-resolver'

export interface ProbeContext extends ProbeContextBase {}

export type TestCoverageRunner = 'bun' | 'jest' | 'vitest'

export interface TestCoverageParams {
  /** lines 覆盖率下限 (0-100, 必填) */
  minLinesPct: number
  /** branches 覆盖率下限 (0-100, 可选) */
  minBranchesPct?: number
  /** functions 覆盖率下限 (0-100, 可选) */
  minFunctionsPct?: number
  /** test runner（默认 'bun'，v0.7.0 扩展 jest/vitest） */
  runner?: TestCoverageRunner
}

export interface CoverageMetricResult {
  /** 实际值 */
  actual: number
  /** 阈值 */
  threshold: number
  /** 是否满足 */
  passed: boolean
}

export interface TestCoverageResult {
  /** exit code 0 = 全部阈值满足 */
  passed: boolean
  /** lines 指标 */
  lines: CoverageMetricResult
  /** branches 指标（未配置阈值时为 null） */
  branches: CoverageMetricResult | null
  /** functions 指标（未配置阈值时为 null） */
  functions: CoverageMetricResult | null
  /** exit code（bun test --coverage 退出码） */
  exitCode: number | null
  /** 覆盖率文件路径 */
  summaryPath?: string
  /** 错误信息（runner 失败 / 文件缺失） */
  error?: string
}

interface CoverageSummary {
  total?: {
    lines?: { pct: number }
    branches?: { pct: number }
    functions?: { pct: number }
  }
}

/**
 * v0.6.2 仅支持 bun runner。RFC-0015 D5.1 模式: 通过 ProbeContext.stackTools
 * 派生 `bun test --coverage` command (项目可 override 为 jest/vitest)。
 */
export async function executeTestCoverage(
  params: TestCoverageParams,
  context: ProbeContext,
): Promise<TestCoverageResult> {
  if (typeof params.minLinesPct !== 'number' || params.minLinesPct < 0 || params.minLinesPct > 100) {
    return {
      passed: false,
      lines: { actual: 0, threshold: params.minLinesPct, passed: false },
      branches: null,
      functions: null,
      exitCode: null,
      error: `invalid minLinesPct: ${params.minLinesPct} (must be 0-100)`,
    }
  }

  const runner = params.runner ?? 'bun'
  const baseCommand = resolveToolCommand(context, {
    toolName: `${runner}-test`,
    roleKeyword: ['test', 'coverage'],
    fallback: runner === 'bun' ? 'bun test --coverage' : `${runner} --coverage`,
  })

  // 跑测试 + 解析覆盖率
  let exitCode = 1
  try {
    const proc = Bun.spawn(baseCommand.split(' '), {
      cwd: context.projectRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const exit = await proc.exited
    exitCode = exit
  } catch (err) {
    return {
      passed: false,
      lines: { actual: 0, threshold: params.minLinesPct, passed: false },
      branches: null,
      functions: null,
      exitCode: null,
      error: err instanceof Error ? err.message : `failed to spawn: ${baseCommand}`,
    }
  }

  // 解析 coverage-summary.json
  const summaryPath = join(context.projectRoot, 'coverage', 'coverage-summary.json')
  if (!existsSync(summaryPath)) {
    return {
      passed: false,
      lines: { actual: 0, threshold: params.minLinesPct, passed: false },
      branches: null,
      functions: null,
      exitCode,
      summaryPath,
      error: `coverage summary not found at ${summaryPath} (did --coverage produce output?)`,
    }
  }

  let summary: CoverageSummary
  try {
    summary = JSON.parse(readFileSync(summaryPath, 'utf-8'))
  } catch (err) {
    return {
      passed: false,
      lines: { actual: 0, threshold: params.minLinesPct, passed: false },
      branches: null,
      functions: null,
      exitCode,
      summaryPath,
      error: err instanceof Error ? `JSON parse failed: ${err.message}` : 'JSON parse failed',
    }
  }

  const total = summary.total ?? {}
  const linesPct = total.lines?.pct ?? 0
  const branchesPct = total.branches?.pct
  const functionsPct = total.functions?.pct

  const lines: CoverageMetricResult = {
    actual: linesPct,
    threshold: params.minLinesPct,
    passed: linesPct >= params.minLinesPct,
  }
  const branches: CoverageMetricResult | null =
    typeof params.minBranchesPct === 'number' && typeof branchesPct === 'number'
      ? { actual: branchesPct, threshold: params.minBranchesPct, passed: branchesPct >= params.minBranchesPct }
      : null
  const functions: CoverageMetricResult | null =
    typeof params.minFunctionsPct === 'number' && typeof functionsPct === 'number'
      ? { actual: functionsPct, threshold: params.minFunctionsPct, passed: functionsPct >= params.minFunctionsPct }
      : null

  const passed = lines.passed && (branches?.passed ?? true) && (functions?.passed ?? true)

  return { passed, lines, branches, functions, exitCode, summaryPath }
}
