// =============================================================================
// test-pass handler (v1.1 P1 probe)
//
// 跑 `bun test [pattern]` + 解析退出码。
// DRY: 复用 shell-exec 内部 API（避免重复 spawn 逻辑）。
// =============================================================================

import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'
import { resolveToolCommand } from './_tool-resolver'

export interface ProbeContext extends ProbeContextBase {}

export interface TestPassParams {
  /** 测试文件路径或目录（默认项目根） */
  path?: string
  /** bun test 接受的过滤 pattern（可选） */
  pattern?: string
  /** 超时（毫秒，默认 120000 = 2 分钟） */
  timeout?: number
}

export interface TestPassResult {
  /** exit code 0 = 全部通过 */
  passed: boolean
  /** exit code 整体 */
  exitCode: number | null
  /** stdout（bun test 输出，可能含 pass/fail 计数） */
  stdout?: string
  /** stderr */
  stderr?: string
  /** 系统错误（spawn 失败等） */
  error?: string
  /** 解析出的 pass/fail 计数（如果能从 stdout 解析） */
  summary?: { passed: number; failed: number; total: number }
}

export async function executeTestPass(params: TestPassParams, context: ProbeContext): Promise<TestPassResult> {
  // RFC-0015 D5: 从 ProbeContext.stackTools 派生 test runner command.
  //   - 优先 tool.name='bun-test' 精确匹配 (e.g. 'bun test' / 'bun test --bail')
  //   - role 容错匹配 'test' 关键词 (e.g. 'role: runtime + test runner')
  //   - fallback: 'bun test [pattern] [path]' (BWC, 项目未配置时不变)
  const baseCommand = resolveToolCommand(context, {
    toolName: 'bun-test',
    roleKeyword: ['test runner', 'tester'],
    fallback: 'bun test',
  })
  const args: string[] = [baseCommand]
  if (params.path) args.push(params.path)
  if (params.pattern) args.push(params.pattern)
  const command = args.join(' ')

  const shellResult: ShellExecResult = await executeShellExec(
    command,
    context as ProbeContext,
    params.timeout ?? 120000,
  )

  // 简易解析：扫 stdout 看 (pass/fail) 计数（bun test 默认输出格式）
  const summary = parseBunTestSummary(shellResult.stdout ?? '')

  return {
    passed: shellResult.exitCode === 0,
    exitCode: shellResult.exitCode,
    stdout: shellResult.stdout,
    stderr: shellResult.stderr,
    error: shellResult.error,
    summary,
  }
}

/**
 * 从 bun test stdout 解析 pass/fail 计数（最佳努力）。
 * bun test 默认输出：
 *   (bun:test) test/foo.test.ts:
 *   (pass) test 1
 *   (fail) test 2
 *   2 pass
 *   2 fail
 */
function parseBunTestSummary(stdout: string): { passed: number; failed: number; total: number } | undefined {
  let passed = 0
  let failed = 0
  for (const line of stdout.split('\n')) {
    const p = line.match(/\(pass\)\s+(\d+)/)
    if (p) passed++
    const f = line.match(/\(fail\)\s+(\d+)/)
    if (f) failed++
  }
  if (passed === 0 && failed === 0) return undefined
  return { passed, failed, total: passed + failed }
}
