// =============================================================================
// Node Runtime — spawn 适配（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §7.1
//
// Node 18+ 路径：
//   - 用 child_process.spawn() 返回 ChildProcess
//   - stdout/stderr 用 .on('data', ...) 累积为 string（强制缓冲）
//   - close 事件触发 resolve
//   - 超时：spawn({ timeout }) + 手动 SIGKILL 兜底（§16 Q4 拍板）
// =============================================================================

import { spawn as nodeSpawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import type { SpawnOptions, SpawnResult } from '../types'

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * v0.1.6 锁定的 spawn 实现（Node 18+ 路径）
 *
 * 与设计 §7.1 的细微差异：
 *   - 不用 shell 形式（SecurityContext "ArgvArray" 硬规则）
 *   - timeout 用 spawn({ timeout }) + 手动 SIGKILL 双保险（§16 Q4 拍板）
 *   - 强制缓冲 stdout/stderr 为 string（§7.1 拍板）
 */
export async function spawnNode(cmd: string[], opts: SpawnOptions = {}): Promise<SpawnResult> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS
  const start = Date.now()

  return new Promise<SpawnResult>((resolve) => {
    // 显式声明 stdio 让 TS 推出 ChildProcessWithoutNullStreams（避免类型 intersection 变 never）
    // v0.1.6 备注：node:child_process.spawn(string, ...) 第一个参数是 shell 形式；
    // 但 v0.1.6 不用 shell（SecurityContext 硬规则），改用 (cmd, args) 形式
    const [bin, ...args] = cmd
    if (!bin) {
      resolve({
        exitCode: null,
        stdout: '',
        stderr: 'spawnNode: empty command',
        durationMs: Date.now() - start,
        signal: null,
      })
      return
    }
    const proc: ChildProcessWithoutNullStreams = nodeSpawn(bin, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // §16 Q4: 手动 SIGKILL 兜底（spawn timeout 后双保险）
    const sigkillHandle = setTimeout(() => {
      try {
        proc.kill('SIGKILL')
      } catch {
        /* already dead */
      }
    }, timeout + 500)
    ;(sigkillHandle as { unref?: () => void }).unref?.()

    let stdout = ''
    let stderr = ''
    let resolved = false

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      if (resolved) return
      resolved = true
      clearTimeout(sigkillHandle)
      resolve({
        exitCode: code,
        stdout,
        stderr,
        durationMs: Date.now() - start,
        signal,
      })
    })

    proc.on('error', (err: Error) => {
      if (resolved) return
      resolved = true
      clearTimeout(sigkillHandle)
      resolve({
        exitCode: null,
        stdout: '',
        stderr: err.message,
        durationMs: Date.now() - start,
        signal: null,
      })
    })
  })
}
