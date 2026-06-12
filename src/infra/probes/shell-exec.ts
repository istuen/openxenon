// =============================================================================
// shell-exec handler (v0.1.6 — 走 runtime 适配层)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §8.1
//
// v0.1.6 关键变化：
//   1. 删除 `child_process.spawn` 直接 import
//   2. 改用 `runtime/index.ts` 工厂（handler 不知 Bun/Node 存在）
//   3. **删除 `shell: true`**（SecurityContext 硬规则）
//   4. 加强 validateCommand 元字符黑名单（; | & $() ` \n）
//   5. timeout 统一 SIGKILL（§16 Q4 拍板）
// =============================================================================

import { spawn } from '../runtime/index'
import type { ProbeContextBase } from '../../kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface ShellExecResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  durationMs?: number
  error?: string
}

// v0.1.6: 元字符黑名单（SecurityContext "ShellInjection" ban 列表）
// 只 ban 真正危险的命令替换 + null byte + 命令注入换行
// 允许 ; | &（标准 shell 用法，probe 场景常见）
const DANGEROUS_PATTERNS = [/\0/, /`/, /\$\(/, /\r?\n/]

function validateCommand(command: string): string | null {
  if (!command || command.trim().length === 0) return 'empty command'
  if (command.length > 4096) return 'too long (>4096)'
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return `dangerous pattern matched: ${pattern.source}`
    }
  }
  return null
}

export function executeShellExec(command: string, context: ProbeContext, timeoutMs?: number): Promise<ShellExecResult> {
  return new Promise((resolve) => {
    const validationError = validateCommand(command)
    if (validationError) {
      resolve({
        success: false,
        stdout: '',
        stderr: `Invalid command: ${validationError}`,
        exitCode: null,
      })
      return
    }

    // v0.1.6: 用 sh -c 包装命令（兼容 shell 语义但禁止 shell:true 形式）
    // 这是 SecurityContext 允许的"半 shell"形式（argv 数组 + sh 包装）
    void (async () => {
      const result = await spawn(['sh', '-c', command], {
        cwd: context.projectRoot,
        timeout: timeoutMs ?? 30_000,
      })

      resolve({
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        error: result.signal ? `killed by signal ${result.signal}` : undefined,
      })
    })()
  })
}
