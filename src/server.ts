import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { DAEMON_PID_PATH, GLOBAL_BOUNDARY_PATH } from './core/global'
import { daemonLogger } from './daemon/logger'
import { startApiServer, stopApiServer } from './api/server'
import './api/handlers'

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

function handleShutdown(signal: string): void {
  daemonLogger.info(`Received ${signal}, shutting down gracefully...`)
  
  stopApiServer()
  removePidFile()
  
  daemonLogger.info('Daemon stopped')
  process.exit(0)
}

async function main(): Promise<void> {
  ensureGlobalDirectory()
  
  writePidFile()
  
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
  process.on('SIGINT', () => handleShutdown('SIGINT'))
  
  startApiServer({
    port: 8420,
    hostname: '127.0.0.1'
  })
  
  daemonLogger.info('Xenonix Daemon started successfully')
  daemonLogger.info('API server listening on 127.0.0.1:8420')
  
  await new Promise(() => {})
}

main().catch((error) => {
  daemonLogger.error(`Daemon failed: ${error}`)
  removePidFile()
  process.exit(1)
})
