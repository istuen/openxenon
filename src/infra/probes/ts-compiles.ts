// =============================================================================
// ts-compiles handler (v1.1 P1 probe)
//
// 跑 `tsc --noEmit [path] --project [tsconfig]` + 解析退出码。
// 复 ProgramContext.SourceFile term（与 lint-check 共享此 term）。
// =============================================================================

import { existsSync } from 'fs'
import { join } from 'path'
import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContextBase } from '../../kernel/contracts/probe-port'

export interface ProbeContext extends ProbeContextBase {}

export interface TsCompilesParams {
  /** 要编译的文件或目录（默认项目根） */
  path?: string
  /** tsconfig 路径（默认 ./tsconfig.json，缺失则用项目根） */
  tsconfig?: string
  /** 超时（毫秒，默认 120000） */
  timeout?: number
}

export interface TsCompilesResult {
  /** exit code 0 = 类型检查通过 */
  passed: boolean
  /** 整体 exit code */
  exitCode: number | null
  /** tsc 输出的错误数（简易解析） */
  errorCount?: number
  /** tsc stdout（部分） */
  stdout?: string
  /** tsc stderr */
  stderr?: string
  /** 错误信息 */
  error?: string
}

export async function executeTsCompiles(params: TsCompilesParams, context: ProbeContext): Promise<TsCompilesResult> {
  // 自动检测 tsconfig
  let tsconfigPath = params.tsconfig
  if (!tsconfigPath) {
    const candidates = [join(context.projectRoot, 'tsconfig.json'), join(context.projectRoot, 'tsconfig.build.json')]
    for (const c of candidates) {
      if (existsSync(c)) {
        tsconfigPath = c
        break
      }
    }
  }

  // 构造命令
  const args: string[] = ['npx', 'tsc', '--noEmit']
  if (tsconfigPath) {
    args.push('--project', tsconfigPath)
  }
  if (params.path) {
    args.push(params.path)
  }
  const command = args.join(' ')

  const shellResult: ShellExecResult = await executeShellExec(
    command,
    context as ProbeContext,
    params.timeout ?? 120000,
  )

  // 简易解析：tsc 输出 "Found N error(s)." 或 "error TS\d+: ..."
  const combined = (shellResult.stdout ?? '') + '\n' + (shellResult.stderr ?? '')
  const foundMatch = combined.match(/Found (\d+) error/i)
  const foundErrorCount = foundMatch ? Number.parseInt(foundMatch[1] ?? '0', 10) : undefined
  // 兜底：扫 "error TS\d+:" 行数
  const tsErrorLines = combined.match(/error TS\d+:/g)
  const fallbackCount = tsErrorLines ? tsErrorLines.length : 0
  const finalErrorCount = foundErrorCount ?? (fallbackCount > 0 ? fallbackCount : undefined)

  return {
    passed: shellResult.exitCode === 0,
    exitCode: shellResult.exitCode,
    errorCount: finalErrorCount,
    stdout: shellResult.stdout,
    stderr: shellResult.stderr,
    error: shellResult.error,
  }
}
