import { createServer, type Socket } from 'net'
import { existsSync, unlinkSync } from '../../infra/filesystem'
import { daemonLogger } from '../logger'
import { handleRequest } from './router'

import './handlers'

// v1.1 fix-p2-robustness: SocketRequest 提升支持可选 id 字段 (用于 client 端 request id 路由)
// 原导出从 infra/socket 复用, 这里保留本地 alias 避免循环导入
import type { SocketRequest } from '../../infra/socket'

const FS_EXECUTE_PATH = '/api/v1/fs/execute'

let server: ReturnType<typeof createServer> | null = null

export function startSocketServer(socketPath: string): void {
  if (server) {
    daemonLogger.warn('Socket server already running, stopping previous instance')
    stopSocketServer()
  }

  if (existsSync(socketPath)) {
    unlinkSync(socketPath)
  }

  server = createServer(async (socket: Socket) => {
    let buffer = ''

    socket.on('data', async (data: Buffer) => {
      buffer += data.toString()

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const request = JSON.parse(line) as SocketRequest
          const { method, path, body, projectPath, id } = request

          if (path === '/api/v1/health' && method === 'GET') {
            const response = await handleRequest(
              method,
              path,
              createMockRequest('GET', '/api/v1/health', undefined),
              null,
              '',
            )
            const responseBody = await response.json()
            writeSocketResponse(socket, response.status, responseBody, id ?? null)
            continue
          }

          if (path === FS_EXECUTE_PATH && method === 'POST') {
            const { loadProjectContext } = await import('./context')
            const context = loadProjectContext(projectPath || process.cwd())
            const xenonDir = projectPath || process.cwd()

            if ('status' in context) {
              const mockReq = createMockRequest(method, path, body)
              const response = await handleRequest(method, path, mockReq, null, xenonDir)
              const clonedResponse = response.clone()
              const responseBody = await clonedResponse.json()
              writeSocketResponse(socket, response.status, responseBody, id ?? null)
              continue
            }

            const mockReq = createMockRequest(method, path, body)
            const response = await handleRequest(method, path, mockReq, null, context.projectPath)
            const clonedResponse = response.clone()
            const responseBody = await clonedResponse.json()
            writeSocketResponse(socket, response.status, responseBody, id ?? null)
            continue
          }

          const { loadProjectContext } = await import('./context')
          const context = loadProjectContext(projectPath || process.cwd())

          if ('status' in context) {
            writeSocketResponse(
              socket,
              400,
              {
                message: 'Invalid project',
                code: 'OXN_INVALID_PARAMS',
                category: 'USER',
                recoverable: false,
                suggestion: 'Check if projectPath is valid',
              },
              id ?? null,
            )
            continue
          }

          const mockReq = createMockRequest(method, path, body)
          const response = await handleRequest(method, path, mockReq, null, context.projectPath)

          const clonedResponse = response.clone()
          const responseBody = await clonedResponse.json()
          writeSocketResponse(socket, response.status, responseBody, id ?? null)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          daemonLogger.error(`Socket request error: ${errorMessage}`)
          let respId: string | null = null
          try {
            const parsed = JSON.parse(line) as { id?: string }
            respId = parsed.id ?? null
          } catch {
            // ignore — request was unparseable
          }
          writeSocketResponse(
            socket,
            500,
            {
              message: errorMessage,
              code: 'OXN_INTERNAL_ERROR',
              category: 'SYSTEM',
              recoverable: false,
              suggestion: 'Daemon internal error, check daemon.log',
            },
            respId,
          )
        }
      }
    })

    socket.on('error', (err) => {
      daemonLogger.error(`Client socket error: ${err.message}`)
    })
  })

  server.listen(socketPath, () => {
    daemonLogger.info(`Socket server started on ${socketPath}`)
  })
}

export function stopSocketServer(): void {
  if (server) {
    server.close()
    server = null
    daemonLogger.info('Socket server stopped')
  }
}

function createMockRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

function writeSocketResponse(socket: Socket, status: number, body: unknown, id: string | null): void {
  if (status >= 200 && status < 300) {
    socket.write(`${JSON.stringify({ id, ok: true, data: body })}\n`)
  } else {
    const err = body as {
      error?: string
      message?: string
      code?: string
      category?: string
      recoverable?: boolean
      suggestion?: string
    }
    socket.write(
      `${JSON.stringify({
        id,
        ok: false,
        error: {
          code: err.code || 'OXN_INTERNAL_ERROR',
          message: err.message || err.error || 'Unknown error',
          category: err.category || 'SYSTEM',
          recoverable: err.recoverable ?? false,
          suggestion: err.suggestion || '',
        },
      })}\n`,
    )
  }
}

export function isSocketServerRunning(): boolean {
  return server !== null
}

export interface ApiServerConfig {
  socketPath?: string
}

export function startApiServer(config: ApiServerConfig = {}): void {
  const socketPath = config.socketPath || '/tmp/oxn-daemon.sock'
  startSocketServer(socketPath)
}

export function stopApiServer(): void {
  stopSocketServer()
}
