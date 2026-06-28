// =============================================================================
// ts-compiles handler (v1.1 P1 probe)
//
// 跑 `tsc --noEmit` + 解析退出码。复 ProgramContext.SourceFile term（与 lint-check 共享此 term）。
//
// v1.1 P1 修复：path + --project 不再触发 TS5042
//   tsc 不允许 `--project <tsc> <file>`（file 会被当成命令行源文件与 project 互斥）。
//   策略：当 path + tsconfig 共存时，写临时 tsconfig `{ extends: 原tsc, files: [path] }`，
//         用 `tsc --noEmit --project <临时tsc>` 跑；跑完 try/finally 清理临时文件。
//   path-only 模式：自动检测 ./tsconfig.json 并加 --project（保留项目配置，与"只传 tsconfig"等价）。
// =============================================================================

import { existsSync, unlinkSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { createHash, randomUUID } from 'crypto'
import { join, resolve } from 'path'
import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

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

  // v1.1 P1：当 path + tsconfig 共存时，必须写临时 tsconfig（extends 原 + files=[path]）
  // 否则 tsc 会报 TS5042（--project 不能与源文件混用）
  let tempTsconfig: string | null = null
  let projectPath = tsconfigPath
  try {
    if (params.path && tsconfigPath) {
      const absPath = resolve(context.projectRoot, params.path)
      const hash = createHash('sha256')
        .update(`${params.path}:${tsconfigPath}:${Date.now()}:${randomUUID()}`)
        .digest('hex')
        .slice(0, 12)
      tempTsconfig = join(context.projectRoot, `.tsconfig.oxn-${hash}.json`)
      // v1.1 P1 关键：extends 会继承父配置的 include（additive），仅写 files: [path] 不够。
      // 必须同时把 include 限制到该 path，否则父 tsconfig 的 include glob 仍会
      // 把同目录下的其他 .ts 也纳进来，跑 tsc 时其它文件的错误一并报出。
      const content = JSON.stringify(
        {
          extends: tsconfigPath,
          files: [absPath],
          include: [absPath],
        },
        null,
        2,
      )
      writeFileSync(tempTsconfig, content, 'utf-8')
      projectPath = tempTsconfig
    }

    // 构造命令
    // - path + tsconfig: 已经把 path 写入临时 tsconfig.files，只传 --project
    // - path only: 自动检测到 tsconfig 后也传 --project（避免丢项目配置）
    // - tsconfig only: 走默认
    const args: string[] = ['npx', 'tsc', '--noEmit']
    if (projectPath) {
      args.push('--project', projectPath)
    } else if (params.path) {
      // 既无 tsconfig 也无 path → 退化 tsc <path>（不写临时文件）
      args.push(params.path)
    }
    const command = args.join(' ')

    const shellResult: ShellExecResult = await executeShellExec(
      command,
      context as ProbeContext,
      params.timeout ?? 120000,
    )

    // 简易解析：tsc 输出 "Found N error(s)." 或 "error TS\d+: ..."
    const combined = `${shellResult.stdout ?? ''}\n${shellResult.stderr ?? ''}`
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
  } finally {
    // P0 契约：清理临时 tsconfig（无论成功还是异常）
    if (tempTsconfig && existsSync(tempTsconfig)) {
      try {
        unlinkSync(tempTsconfig)
      } catch {
        // 清理失败不影响 verdict 返回
      }
    }
  }
}
