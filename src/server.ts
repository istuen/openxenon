import { fileExists, ensureDirectory, writeFile, deleteFile } from './infra/fs'
import { DAEMON_PID_PATH, GLOBAL_BOUNDARY_PATH, DAEMON_SOCK_PATH } from './infra/global'
import { daemonLogger } from './daemon/logger'
import { startApiServer, stopApiServer } from './daemon/ipc/server'
import { setDaemonAddress, clearDaemonAddress } from './daemon/status'
import { fileWatcher, type WatchEvent } from './daemon/watcher'
import { taskCircuitBreaker } from './daemon/circuit-breaker'
import { recoveryManager } from './daemon/recovery'
import { daemonSupervisor } from './daemon/supervisor'

function ensureGlobalDirectory(): void {
  if (!fileExists(GLOBAL_BOUNDARY_PATH)) {
    ensureDirectory(GLOBAL_BOUNDARY_PATH)
  }
}

function writePidFile(): void {
  const pid = process.pid
  writeFile(DAEMON_PID_PATH, pid.toString())
  daemonLogger.info(`Daemon PID file created: ${pid}`)
}

function removePidFile(): void {
  if (fileExists(DAEMON_PID_PATH)) {
    deleteFile(DAEMON_PID_PATH)
    daemonLogger.info('Daemon PID file removed')
  }
}

function saveDaemonAddress(): void {
  try {
    setDaemonAddress(DAEMON_SOCK_PATH)
    daemonLogger.info(`Daemon address saved: ${DAEMON_SOCK_PATH}`)
  } catch (error) {
    daemonLogger.error(`Failed to save daemon address: ${error}`)
  }
}

function clearDaemonAddressFromDb(): void {
  try {
    clearDaemonAddress()
    daemonLogger.info('Daemon address cleared')
  } catch (error) {
    daemonLogger.error(`Failed to clear daemon address: ${error}`)
  }
}

function startFileWatcher(): void {
  try {
    fileWatcher.addCallback(handleFileChange)
    fileWatcher.start()
    daemonLogger.info('File watcher started')
  } catch (error) {
    daemonLogger.error(`Failed to start file watcher: ${error}`)
  }
}

function handleFileChange(event: WatchEvent): void {
  daemonLogger.info(`File changed: ${event.path} (${event.type})`)

  if (event.type === 'update' && event.path.endsWith('.blueprint.frozen.yaml')) {
    daemonLogger.info('Blueprint file changed, may trigger task revalidation')
  }
}

function stopFileWatcher(): void {
  try {
    fileWatcher.stop()
    daemonLogger.info('File watcher stopped')
  } catch (error) {
    daemonLogger.error(`Failed to stop file watcher: ${error}`)
  }
}

function handleShutdown(signal: string): void {
  daemonLogger.info(`Received ${signal}, shutting down gracefully...`)

  stopFileWatcher()
  daemonSupervisor.destroy()
  stopApiServer()
  clearDaemonAddressFromDb()
  removePidFile()

  daemonLogger.info('Daemon stopped')
  process.exit(0)
}

function handleFatalError(type: string, error: unknown): void {
  daemonLogger.error(`Fatal error (${type}): ${error}`)

  stopFileWatcher()
  daemonSupervisor.destroy()
  stopApiServer()
  clearDaemonAddressFromDb()
  removePidFile()

  process.exit(1)
}

async function main(): Promise<void> {
  ensureGlobalDirectory()

  writePidFile()
  saveDaemonAddress()

  startFileWatcher()

  daemonSupervisor.startDaemon('./src/server.ts')

  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('uncaughtException', (error) => handleFatalError('uncaughtException', error))
  process.on('unhandledRejection', (reason) => handleFatalError('unhandledRejection', reason))

  startApiServer({
    socketPath: DAEMON_SOCK_PATH
  })

  daemonLogger.info('OpenXenon Daemon started successfully')
  daemonLogger.info(`Socket server listening on ${DAEMON_SOCK_PATH}`)
  daemonLogger.info(`Circuit breaker state: ${taskCircuitBreaker.getState()}`)

  await new Promise(() => {})
}

main().catch((error) => {
  daemonLogger.error(`Daemon failed: ${error}`)
  clearDaemonAddressFromDb()
  removePidFile()
  process.exit(1)
})

export { taskCircuitBreaker, recoveryManager, fileWatcher }