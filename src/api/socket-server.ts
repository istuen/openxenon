import { createServer, type Socket } from 'net'
import { handleRequest } from './router'
import { daemonLogger } from '../daemon/logger'
import { existsSync, unlinkSync } from 'fs'

export interface SocketRequest {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

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
          const { method, path, body, projectPath } = request

          if (path === '/api/v1/health' && method === 'GET') {
            const response = await handleRequest(method, path, createMockRequest(body), null!, '')
            const responseBody = await response.json()
            socket.write(JSON.stringify({ status: response.status, body: responseBody }) + '\n')
            continue
          }

          const { loadProjectContext } = await import('./context')
          const context = loadProjectContext(projectPath || null)

          if ('status' in context) {
            socket.write(JSON.stringify({ status: 400, body: { error: 'Invalid project' } }) + '\n')
            continue
          }

          const mockReq = createMockRequest(body)
          const response = await handleRequest(
            method,
            path,
            mockReq,
            context.db,
            context.projectPath
          )

          const clonedResponse = response.clone()
          const responseBody = await clonedResponse.json()
          socket.write(JSON.stringify({ status: response.status, body: responseBody }) + '\n')

          context.db.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          daemonLogger.error(`Socket request error: ${errorMessage}`)
          socket.write(JSON.stringify({ status: 500, body: { error: 'InternalError', message: errorMessage } }) + '\n')
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

function createMockRequest(body?: unknown): Request {
  return new Request('http://localhost', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' }
  })
}

export function isSocketServerRunning(): boolean {
  return server !== null
}