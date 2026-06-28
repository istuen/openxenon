import { existsSync, unlinkSync } from './filesystem'
import type { createServer } from 'net'

export interface SocketMessage {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

/**
 * v1.1 fix-p2-robustness: NDJSON + 可选 request id 路由 envelope。
 *
 * 向后兼容：老 client (无 id) → server 端用 null id 响应；新 client 收到 null id 响应时
 * 走 fallback 路径（只允许单 inflight 请求时使用）。这样既消除多响应丢消息，又
 * 不破坏老调用方。
 */
export interface SocketRequest extends SocketMessage {
  id?: string
}

export interface SocketResponse<T = unknown> {
  id: string | null
  payload: T
  error?: { code: string; message: string; category?: string; recoverable?: boolean; suggestion?: string }
}

export interface SocketServer {
  start(path: string): void
  stop(): void
}

let server: ReturnType<typeof createServer> | null = null

export const socket = {
  createServer(_onMessage: (msg: SocketMessage) => void): SocketServer {
    return {
      start(_path: string) {
        // Socket server implementation is in daemon/ipc/server.ts
        // This is just a placeholder for the infra interface
      },
      stop() {
        if (server) {
          server.close()
          server = null
        }
      },
    }
  },

  cleanup(path: string): void {
    if (existsSync(path)) {
      try {
        unlinkSync(path)
      } catch {
        // Ignore cleanup errors
      }
    }
  },
}
