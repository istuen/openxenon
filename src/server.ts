import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { DAEMON_PID_PATH, GLOBAL_BOUNDARY_PATH, DAEMON_SOCK_PATH } from './infra/global'
import { daemonLogger } from './daemon/logger'
import { startApiServer, stopApiServer } from './daemon/api/server'
import { setDaemonAddress, clearDaemonAddress } from './daemon/status'

function ensureGlobalDirectory(): void {
  if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
    const { mkdirSync } = require('fs')
    mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
  }
}

function writePidFile(): void {
  const pid = process.pid
  writeFileSync(DAEMON_PID_PATH, pid.toString(), 'utf-8')
  daemonLogger.info(`Daemon PID file created: ${pid}`)
}

function removePidFile(): void {
  if (existsSync(DAEMON_PID_PATH)) {
    unlinkSync(DAEMON_PID_PATH)
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

function handleShutdown(signal: string): void {
  daemonLogger.info(`Received ${signal}, shutting down gracefully...`)

  stopApiServer()
  clearDaemonAddressFromDb()
  removePidFile()

  daemonLogger.info('Daemon stopped')
  process.exit(0)
}

function handleFatalError(type: string, error: unknown): void {
  daemonLogger.error(`Fatal error (${type}): ${error}`)

  stopApiServer()
  clearDaemonAddressFromDb()
  removePidFile()

  process.exit(1)
}

async function main(): Promise<void> {
  ensureGlobalDirectory()

  writePidFile()
  saveDaemonAddress()

  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('uncaughtException', (error) => handleFatalError('uncaughtException', error))
  process.on('unhandledRejection', (reason) => handleFatalError('unhandledRejection', reason))

  startApiServer({
    socketPath: DAEMON_SOCK_PATH
  })

  daemonLogger.info('OpenXenon Daemon started successfully')
  daemonLogger.info(`Socket server listening on ${DAEMON_SOCK_PATH}`)

  await new Promise(() => {})
}

main().catch((error) => {
  daemonLogger.error(`Daemon failed: ${error}`)
  clearDaemonAddressFromDb()
  removePidFile()
  process.exit(1)
})
