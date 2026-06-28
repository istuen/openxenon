// =============================================================================
// file-exports handler (v1.1 P1 probe) — Runtime import 方案
//
// 通过动态 import() 加载模块，提取 Object.keys 作为 exports 列表。
// 复 ProgramContext.Module term。
//
// 关键决策：用 await import(path) 运行时分析（你的方案 A）。
// 优点：零新依赖；Bun 原生支持 TS/JS；结果绝对准确（运行时真相）。
// 缺点：有副作用（执行模块顶层代码）——AI 须知道这点，文档中标注。
//
// v1.1 简化版：默认 spawn 进程隔离（bun --bun run tmp-script.ts），
// 防止顶层副作用污染主 probe runner。
// =============================================================================

import { existsSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { executeShellExec, type ShellExecResult } from './shell-exec'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface FileExportsParams {
  /** 要分析的文件路径（.ts / .js） */
  path: string
}

export interface FileExportsResult {
  /** 提取的导出名列表（包含 default） */
  exports: string[]
  /** 加载错误（如果有） */
  error?: string
  /** 加载耗时（ms） */
  durationMs: number
  /** 是否使用进程隔离（v1.1 默认 true） */
  isolated: boolean
}

export async function executeFileExports(params: FileExportsParams, context: ProbeContext): Promise<FileExportsResult> {
  const start = Date.now()
  const filePath = params.path.startsWith('/') ? params.path : join(context.projectRoot, params.path)

  if (!existsSync(filePath)) {
    return {
      exports: [],
      error: `File not found: ${filePath}`,
      durationMs: Date.now() - start,
      isolated: true,
    }
  }

  // 进程隔离：写一个 tmp script 加载目标模块并打印 Object.keys，
  // bun run 跑这个 tmp script → 主 runner 不被副作用污染。
  const tmpScript = join(context.projectRoot, `.openxenon/.tmp-export-probe-${Date.now()}.ts`)
  const scriptContent = `import * as mod from '${filePath}'
const exports = Object.keys(mod)
console.log(JSON.stringify({ exports, isolated: true }))
`
  try {
    const { writeFileSync, unlinkSync } = await import('fs')
    writeFileSync(tmpScript, scriptContent, 'utf-8')

    const shellResult: ShellExecResult = await executeShellExec(
      `bun run "${tmpScript}"`,
      context as ProbeContext,
      10000,
    )

    try {
      unlinkSync(tmpScript)
    } catch {
      // ignore cleanup errors
    }

    if (shellResult.exitCode !== 0 || shellResult.error) {
      return {
        exports: [],
        error: shellResult.error ?? shellResult.stderr ?? 'bun run failed',
        durationMs: Date.now() - start,
        isolated: true,
      }
    }

    // 解析输出（取最后一行 JSON）
    const lines = (shellResult.stdout ?? '').trim().split('\n')
    const lastLine = lines[lines.length - 1] ?? '{}'
    const parsed = JSON.parse(lastLine) as { exports: string[]; isolated: boolean }
    return {
      exports: parsed.exports ?? [],
      durationMs: Date.now() - start,
      isolated: parsed.isolated ?? true,
    }
  } catch (err) {
    return {
      exports: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
      isolated: true,
    }
  }
}
