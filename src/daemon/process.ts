import { existsSync, unlinkSync, writeFileSync } from '../infra/filesystem'
import { DAEMON_PID_PATH, GLOBAL_BOUNDARY_PATH, DAEMON_SOCK_PATH } from '../infra/global'
import { daemonLogger } from './logger'
import { waitForHealth } from './health-check'
import { isDaemonRunning, type DaemonProcessInfo } from '../infra/daemon-probe'

export type { DaemonProcessInfo }

export interface StartDaemonResult {
  success: boolean
  pid?: number
  error?: string
  healthCheckMs?: number
}

export const DAEMON_ADDRESS = DAEMON_SOCK_PATH

export { isDaemonRunning }

export function startDaemon(serverPath: string): StartDaemonResult {
  const { isRunning, pid: existingPid } = isDaemonRunning()

  if (isRunning) {
    return {
      success: false,
      error: `Daemon already running with PID ${existingPid}`,
    }
  }

  if (existsSync(DAEMON_PID_PATH)) {
    daemonLogger.info('Cleaning up stale PID file')
    try {
      unlinkSync(DAEMON_PID_PATH)
    } catch (error) {
      daemonLogger.error(`Failed to remove stale PID file: ${error}`)
    }
  }

  try {
    if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
      const { mkdirSync } = require('fs')
      mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
    }

    const proc = Bun.spawn(['bun', 'run', serverPath], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
      cwd: process.cwd(),
    })

    proc.unref()

    const pid = proc.pid
    writeFileSync(DAEMON_PID_PATH, pid.toString(), 'utf-8')

    daemonLogger.info(`Daemon started with PID ${pid}`)

    return {
      success: true,
      pid,
      healthCheckMs: 0,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    daemonLogger.error(`Failed to start daemon: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

export async function startDaemonWithHealthCheck(serverPath: string): Promise<StartDaemonResult> {
  const result = startDaemon(serverPath)

  if (!result.success) {
    return result
  }

  const healthResult = await waitForHealth(DAEMON_ADDRESS)

  if (!healthResult.success) {
    daemonLogger.error('Health check failed, cleaning up')

    if (existsSync(DAEMON_PID_PATH)) {
      try {
        unlinkSync(DAEMON_PID_PATH)
      } catch (error) {
        daemonLogger.error(`Failed to remove PID file: ${error}`)
      }
    }

    return {
      success: false,
      error: 'Daemon started but health check failed',
    }
  }

  return {
    success: true,
    pid: result.pid,
    healthCheckMs: healthResult.elapsedMs,
  }
}

export async function stopDaemon(): Promise<{ success: boolean; error?: string }> {
  const { isRunning, pid } = isDaemonRunning()

  if (!isRunning) {
    if (existsSync(DAEMON_PID_PATH)) {
      daemonLogger.info('Cleaning up stale PID file')
      try {
        unlinkSync(DAEMON_PID_PATH)
      } catch (error) {
        daemonLogger.error(`Failed to remove stale PID file: ${error}`)
      }
    }

    return {
      success: false,
      error: 'Daemon is not running',
    }
  }

  try {
    process.kill(pid, 'SIGTERM')

    let attempts = 0
    const maxAttempts = 10
    const checkInterval = 500

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval))

      try {
        process.kill(pid, 0)
        attempts++
      } catch {
        break
      }
    }

    if (existsSync(DAEMON_PID_PATH)) {
      unlinkSync(DAEMON_PID_PATH)
    }

    daemonLogger.info(`Daemon stopped (PID ${pid})`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    daemonLogger.error(`Failed to stop daemon: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
