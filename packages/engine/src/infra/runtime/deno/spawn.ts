// =============================================================================
// Deno Runtime — spawn 适配（v0.1.6）
//
// 设计依据：arch-discussion §5.1 Deno 扩展方向
//
// Deno.command API：
//   - 返回 { code, success, stdout, stderr, signal }
//   - stdout/stderr 是 Uint8Array（v0.1.6 强制缓冲为 string）
//   - 内置 timeout / kill（v0.1.6 暂不实现，仍走 promise + setTimeout）
//
// 注：Deno 没有原生的 `kill via signal`——靠 AbortController 取消。
// v0.1.6 简化：timeout 超时后让 promise 解析 + stdout/stderr 截取
// =============================================================================

import type { SpawnOptions, SpawnResult } from '../types'
import { getDeno } from '../deno-helper'

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * v0.1.6 锁定的 spawn 实现（Deno 路径）
 */
export async function spawnDeno(cmd: string[], opts: SpawnOptions = {}): Promise<SpawnResult> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS
  const start = Date.now()
  const [bin, ...args] = cmd
  if (!bin) {
    return {
      exitCode: null,
      stdout: '',
      stderr: 'spawnDeno: empty command',
      durationMs: Date.now() - start,
      signal: null,
    }
  }
  const deno = getDeno()
  if (!deno) {
    return {
      exitCode: null,
      stdout: '',
      stderr: 'spawnDeno: Deno globalThis not available',
      durationMs: Date.now() - start,
      signal: null,
    }
  }

  // v0.1.6: 用 AbortController 实现 timeout
  const ac = new AbortController()
  const timeoutHandle = setTimeout(() => ac.abort(), timeout)
  ;(timeoutHandle as { unref?: () => void }).unref?.()

  try {
    const output = await deno.command(bin, {
      args,
      cwd: opts.cwd,
      env: opts.env,
      stdin: opts.stdin ? 'piped' : 'null',
      stdout: 'piped',
      stderr: 'piped',
    })

    clearTimeout(timeoutHandle)

    // Deno.command 返回 Uint8Array；v0.1.6 强制 buffer 为 string
    const decoder = new TextDecoder()
    return {
      exitCode: output.code,
      stdout: decoder.decode(output.stdout),
      stderr: decoder.decode(output.stderr),
      durationMs: Date.now() - start,
      // Deno.signal 是 number（POSIX signal number）；v0.1.6 RuntimePort 协议用 NodeJS.Signals 字符串。
      // 妥协：Deno 路径不暴露具体 signal name（已 abort 取消才有值），统一返 null
      signal: null,
    }
  } catch (err) {
    clearTimeout(timeoutHandle)
    return {
      exitCode: null,
      stdout: '',
      stderr: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
      signal: null,
    }
  }
}
