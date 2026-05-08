import { existsSync, unlinkSync } from 'fs'
import { createServer } from 'net'

export interface SocketMessage {
  method: string
  path: string
  body?: unknown
  projectPath?: string
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
      }
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
  }
}