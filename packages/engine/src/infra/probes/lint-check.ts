// =============================================================================
// lint-check handler (v1.1 P1 probe)
//
// 跑 `biome check [path]` 验证代码风格。
// 复 ProgramContext.SourceFile term（与 ts-compiles 共享）。
// 注意：biome 是 devDep——若用户项目没装 biome，verdict 走 'error' 兜底 FAIL。
// =============================================================================

import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface LintCheckParams {
  /** 要 lint 的路径（默认项目根） */
  path?: string
  /** 是否自动修复（--apply，默认 false） */
  apply?: boolean
  /** 超时（毫秒，默认 60000） */
  timeout?: number
}

export interface LintCheckResult {
  /** exit 0 = 无 lint error */
  passed: boolean
  /** 整体 exit code */
  exitCode: number | null
  /** biome 报告的 issues 数（简易解析） */
  issueCount?: number
  /** biome stdout */
  stdout?: string
  /** biome stderr */
  stderr?: string
  /** 错误信息（spawn 失败等） */
  error?: string
}

export async function executeLintCheck(params: LintCheckParams, context: ProbeContext): Promise<LintCheckResult> {
  // biome check [--apply] [path]
  const args: string[] = ['npx', 'biome', 'check']
  if (params.apply) args.push('--apply')
  if (params.path) args.push(params.path)
  const command = args.join(' ')

  const shellResult: ShellExecResult = await executeShellExec(command, context as ProbeContext, params.timeout ?? 60000)

  // 解析 biome 输出：可能含 "Found N error(s)" 或 "X issues"
  const combined = `${shellResult.stdout ?? ''}\n${shellResult.stderr ?? ''}`
  const issueMatch = combined.match(/(?:Found|Found)\s+(\d+)\s+(?:error|issue)/i)
  const issueCount = issueMatch ? Number.parseInt(issueMatch[1] ?? '0', 10) : undefined

  return {
    passed: shellResult.exitCode === 0,
    exitCode: shellResult.exitCode,
    issueCount,
    stdout: shellResult.stdout,
    stderr: shellResult.stderr,
    error: shellResult.error,
  }
}
