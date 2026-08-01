// =============================================================================
// docs-build handler (v0.6.2 probe)
//
// 跑 `bun run docs:build`（vitepress build docs）验证文档站点构建通过。
// DRY: 复用 shell-exec 内部 API（避免重复 spawn 逻辑）。
// =============================================================================

import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'
import { resolveToolCommand } from './_tool-resolver'

export interface ProbeContext extends ProbeContextBase {}

export interface DocsBuildParams {
  /** 超时（毫秒，默认 180000 = 3 分钟） */
  timeout?: number
}

export interface DocsBuildResult {
  /** exit code 0 = 构建通过 */
  passed: boolean
  /** exit code 整体 */
  exitCode: number | null
  /** stdout */
  stdout?: string
  /** stderr */
  stderr?: string
  /** 系统错误（spawn 失败等） */
  error?: string
  /** 简易解析的 summary */
  summary?: string
}

export async function executeDocsBuild(params: DocsBuildParams, context: ProbeContext): Promise<DocsBuildResult> {
  // RFC-0015 D5: 从 ProbeContext.stackTools 派生 docs builder command.
  //   - 优先 tool.name='vitepress' (或 'docs-build') 精确匹配
  //   - role 容错匹配 'doc' / 'docs' / 'site' 关键词
  //   - fallback: 'bun run docs:build' (BWC)
  const command = resolveToolCommand(context, {
    toolName: 'vitepress',
    roleKeyword: ['doc', 'docs', 'site builder', 'documentation'],
    fallback: 'bun run docs:build',
  })

  const shellResult: ShellExecResult = await executeShellExec(
    command,
    context as ProbeContext,
    params.timeout ?? 180000,
  )

  return {
    passed: shellResult.exitCode === 0,
    exitCode: shellResult.exitCode,
    stdout: shellResult.stdout,
    stderr: shellResult.stderr,
    error: shellResult.error,
    summary: buildSummary(shellResult),
  }
}

/**
 * 从 vitepress build 输出提取关键信息（built in / pages）。
 */
function buildSummary(result: ShellExecResult): string | undefined {
  if (!result.stdout) return undefined
  const out: string[] = []
  for (const line of result.stdout.split('\n')) {
    if (/built in|pages generated/i.test(line)) {
      out.push(line.trim())
    }
  }
  return out.length > 0 ? out.join(' | ') : undefined
}
