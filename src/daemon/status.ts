import { existsSync, readFileSync } from 'fs'
import { DAEMON_LOG_PATH } from '../infra/global'
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
      const lines = logContent.split('\n').filter(line => line.trim().length > 0)
      recentLogs = lines.slice(-10)
    } catch (error) {
      console.error(`Failed to read log file: ${error}`)
    }
  }
  
  return {
    isRunning,
    pid,
    logPath: DAEMON_LOG_PATH,
    recentLogs
  }
}
