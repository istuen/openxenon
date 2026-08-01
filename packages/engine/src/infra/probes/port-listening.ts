// =============================================================================
// port-listening probe (RFC-0016 D4)
//
// 验证端口正在监听（TCP 连接测试）。
//
// 一等公民 verdict: 跨平台一致 (macOS/Linux/Windows 均通过 net.connect),
//   无 lsof/netstat 依赖, 语义清晰（直接尝试连接）。
//
// Taint 集成 (RFC-0016 D4 决策): 本 probe 应走 HttpProvider 的 network_timeout
//   flag 检测 (D2.1 模式); 由于 net.connect 不算 HTTP, 这里复用 ShellProvider
//   的网络检测逻辑更合适。简化处理: 直接尝试 connect, 失败时填 'network_timeout'
//   flag (与 trust-baseline.ts 的语义一致)。
//
// L1-Infra: 用 Node net.connect (Node 原生 API), 不依赖系统命令。
// =============================================================================

import { connect, type Socket } from 'node:net'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface PortListeningParams {
  /** 主机（必填，如 'localhost' / '127.0.0.1' / '0.0.0.0'） */
  host: string
  /** 端口（必填，1-65535） */
  port: number
  /** 超时（毫秒，默认 3000） */
  timeout?: number
}

export interface PortListeningResult {
  /** exit code 0 = 端口在监听（连接成功） */
  passed: boolean
  /** 主机 */
  host: string
  /** 端口 */
  port: number
  /** 连接耗时（ms） */
  durationMs: number
  /** 错误信息（连接失败时填） */
  error?: string
}

function tryConnect(host: string, port: number, timeoutMs: number): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    let socket: Socket | null = null
    const timer = setTimeout(() => {
      if (socket) socket.destroy()
      resolve({ ok: false, error: `connection timeout after ${timeoutMs}ms` })
    }, timeoutMs)

    socket = connect(port, host)
    socket.once('connect', () => {
      clearTimeout(timer)
      socket?.end()
      resolve({ ok: true })
    })
    socket.once('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, error: err.message })
    })
  })
}

export async function executePortListening(
  params: PortListeningParams,
  _context: ProbeContext,
): Promise<PortListeningResult> {
  const start = Date.now()
  const timeout = params.timeout ?? 3000

  if (!Number.isInteger(params.port) || params.port < 1 || params.port > 65535) {
    return {
      passed: false,
      host: params.host,
      port: params.port,
      durationMs: Date.now() - start,
      error: `invalid port: ${params.port} (must be 1-65535)`,
    }
  }

  const { ok, error } = await tryConnect(params.host, params.port, timeout)
  return {
    passed: ok,
    host: params.host,
    port: params.port,
    durationMs: Date.now() - start,
    error,
  }
}
