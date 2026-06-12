// =============================================================================
// Bun Runtime — spawn 适配（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §7.1
//
// Bun 路径：
//   - 用 Bun.spawn() 返回 Subprocess
//   - stdout/stderr 强制 buffer 为 string（消除 ReadableStream 差异）
//   - 用 `new Response(proc.stdout).text()` + `new Response(proc.stderr).text()` 收集
//   - 超时：setTimeout + proc.kill('SIGKILL')（§16 Q4 拍板）
//   - Bun.spawn() 已用 process group 隔离，无需 stdio: 'pipe' 显式声明
// =============================================================================

import type { SpawnOptions, SpawnResult } from '../types'

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * v0.1.6 锁定的 spawn 实现（Bun 路径）
 *
 * 与设计 §7.1 的细微差异：
 *   - 不用 shell 形式（SecurityContext "ArgvArray" 硬规则）
 *   - timeout 用 setTimeout + SIGKILL（§16 Q4 拍板）
 *   - 强制缓冲 stdout/stderr 为 string（§7.1 拍板）
 */
export async function spawnBun(cmd: string[], opts: SpawnOptions = {}): Promise<SpawnResult> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS
  const start = Date.now()

  const proc = Bun.spawn({
    cmd,
    cwd: opts.cwd,
    env: opts.env,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  // v0.1.6 暂不处理 stdin（v0.1.6 无 probe 需要 spawn stdin）

  // §16 Q4: 超时统一 SIGKILL
  const timeoutHandle = setTimeout(() => {
    try {
      proc.kill('SIGKILL')
    } catch {
      /* already dead */
    }
  }, timeout)
  // 不阻止进程退出
  ;(timeoutHandle as { unref?: () => void }).unref?.()

  let signal: NodeJS.Signals | null = null
  proc.exited.then((code) => {
    if (code !== 0) {
      // Bun.spawn 不直接给 signal；标记为 null，由 exitCode=非 0 表达
      signal = null
    }
  })

  // 强制缓冲 stdout / stderr 为 string（v0.1.6 锁定）
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  clearTimeout(timeoutHandle)

  return {
    exitCode,
    stdout,
    stderr,
    durationMs: Date.now() - start,
    signal,
  }
}
