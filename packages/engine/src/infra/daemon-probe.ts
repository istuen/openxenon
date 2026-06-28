import { existsSync, readFileSync } from './filesystem'
import { DAEMON_PID_PATH } from './global'

export interface DaemonProcessInfo {
  pid: number
  isRunning: boolean
}

function checkProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function isDaemonRunning(): DaemonProcessInfo {
  if (!existsSync(DAEMON_PID_PATH)) {
    return { pid: 0, isRunning: false }
  }

  try {
    const pidContent = readFileSync(DAEMON_PID_PATH, 'utf-8').trim()
    const pid = parseInt(pidContent, 10)

    if (Number.isNaN(pid) || pid <= 0) {
      return { pid: 0, isRunning: false }
    }

    const running = checkProcessRunning(pid)
    return { pid, isRunning: running }
  } catch {
    return { pid: 0, isRunning: false }
  }
}
