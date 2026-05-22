import { createConnection } from 'net'
import { daemonLogger } from './logger'
import { existsSync } from '../infra/filesystem'

export interface HealthCheckResult {
  success: boolean
  elapsedMs: number
}

export async function waitForHealth(socketPath: string, timeout: number = 10000): Promise<HealthCheckResult> {
  const start = Date.now()

  return new Promise((resolve) => {
    let resolved = false
    let attempts = 0

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true
        const elapsedMs = Date.now() - start
        daemonLogger.error(`Daemon health check timed out after ${elapsedMs}ms`)
        resolve({ success: false, elapsedMs })
      }
    }, timeout)

    const tryConnect = () => {
      if (resolved) return

      attempts++
      daemonLogger.info(`Health check attempt ${attempts}...`)

      if (!existsSync(socketPath)) {
        daemonLogger.info(`Socket not found at ${socketPath}, waiting...`)
        setTimeout(tryConnect, 200)
        return
      }

      daemonLogger.info(`Socket found, attempting connection...`)

      try {
        const socket = createConnection(socketPath, () => {
          if (resolved) {
            socket.end()
            return
          }
          daemonLogger.info('Socket connected')
        })

        let buffer = ''

        socket.on('data', (data: Buffer) => {
          buffer += data.toString()
          const lines = buffer.split('\n')

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const response = JSON.parse(line)
              daemonLogger.info(`Health check response: ${JSON.stringify(response)}`)
              if (response.ok === true && response.data?.status === 'ok') {
                const elapsedMs = Date.now() - start
                daemonLogger.info(`Daemon health check passed in ${elapsedMs}ms`)
                clearTimeout(timeoutId)
                socket.end()
                resolved = true
                resolve({ success: true, elapsedMs })
              }
            } catch {
              // Continue parsing
            }
          }
        })

        socket.on('error', (err) => {
          if (!resolved) {
            daemonLogger.error(`Health check socket error: ${err.message}`)
            setTimeout(tryConnect, 200)
          }
        })

        socket.on('close', () => {
          if (!resolved) {
            daemonLogger.info('Socket closed, retrying...')
            setTimeout(tryConnect, 200)
          }
        })

        const request =
          JSON.stringify({
            method: 'GET',
            path: '/api/v1/health',
          }) + '\n'

        socket.write(request)
      } catch (error) {
        if (!resolved) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          daemonLogger.error(`Health check connection error: ${errorMessage}`)
          setTimeout(tryConnect, 200)
        }
      }
    }

    daemonLogger.info('Starting health check...')
    tryConnect()
  })
}
