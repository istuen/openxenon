import { startSocketServer, stopSocketServer, isSocketServerRunning } from './socket-server'
import { DAEMON_SOCK_PATH } from '../infra/global'
import { daemonLogger } from '../daemon/logger'

export interface ApiServerConfig {
  socketPath?: string
}

export function startApiServer(config: ApiServerConfig = {}): void {
  const socketPath = config.socketPath || DAEMON_SOCK_PATH

  if (isSocketServerRunning()) {
    daemonLogger.warn('API server already running')
    return
  }

  try {
    startSocketServer(socketPath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    daemonLogger.error(`Failed to start API server: ${errorMessage}`)
    throw error
  }
}

export function stopApiServer(): void {
  stopSocketServer()
}

export function isApiServerRunning(): boolean {
  return isSocketServerRunning()
}

export function getApiServer(): null {
  return null
}