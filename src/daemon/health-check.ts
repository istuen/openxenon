import { connect } from 'bun'
import { daemonLogger } from './logger'
import { existsSync } from 'fs'

export interface HealthCheckResult {
  success: boolean
  elapsedMs: number
}

export async function waitForHealth(
  socketPath: string,
  timeout: number = 5000
): Promise<HealthCheckResult> {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    try {
      if (!existsSync(socketPath)) {
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      const socket = connect({
        socket: {
          data(_: any, data: Buffer) {
            try {
              const response = JSON.parse(data.toString())
              if (response.status === 200 || response.body?.taskId) {
                const elapsedMs = Date.now() - start
                daemonLogger.info(`Daemon health check passed in ${elapsedMs}ms`)
              }
            } catch {
              // Ignore parse errors
            }
          }
        },
        path: socketPath
      })

      socket.write(JSON.stringify({
        method: 'GET',
        path: '/api/v1/health'
      }))

      await new Promise(resolve => setTimeout(resolve, 100))
      socket.end()

      const elapsedMs = Date.now() - start
      return { success: true, elapsedMs }
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  const elapsedMs = Date.now() - start
  daemonLogger.error(`Daemon health check timed out after ${elapsedMs}ms`)
  return { success: false, elapsedMs }
}
