import { existsSync, readFileSync, unlinkSync, writeFileSync } from '../infra/filesystem'
import { CORE_DAEMON_CONFIG_PATH, DAEMON_LOG_PATH } from '../infra/global'
import { isDaemonRunning } from './process'

export interface DaemonStatus {
  isRunning: boolean
  pid: number
  logPath: string
  recentLogs: string[]
}

export function getDaemonStatus(): DaemonStatus {
  const { isRunning, pid } = isDaemonRunning()

  let recentLogs: string[] = []

  if (existsSync(DAEMON_LOG_PATH)) {
    try {
      const logContent = readFileSync(DAEMON_LOG_PATH, 'utf-8')
      const lines = logContent.split('\n').filter((line) => line.trim().length > 0)
      recentLogs = lines.slice(-10)
    } catch (error) {
      console.error(`Failed to read log file: ${error}`)
    }
  }

  return {
    isRunning,
    pid,
    logPath: DAEMON_LOG_PATH,
    recentLogs,
  }
}

export function setDaemonAddress(socketPath: string): void {
  const config = {
    socketPath,
  }
  writeFileSync(CORE_DAEMON_CONFIG_PATH, JSON.stringify(config), 'utf-8')
}

export function clearDaemonAddress(): void {
  if (existsSync(CORE_DAEMON_CONFIG_PATH)) {
    unlinkSync(CORE_DAEMON_CONFIG_PATH)
  }
}

export function getDaemonAddress(): string | null {
  if (!existsSync(CORE_DAEMON_CONFIG_PATH)) {
    return null
  }
  try {
    const content = readFileSync(CORE_DAEMON_CONFIG_PATH, 'utf-8')
    const config = JSON.parse(content)
    return config.socketPath || null
  } catch {
    return null
  }
}
