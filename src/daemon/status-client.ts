import { createConnection } from 'net'
import { existsSync, readFileSync } from 'fs'
import { DAEMON_PID_PATH, DAEMON_LOG_PATH, DAEMON_SOCK_PATH } from '../infra/global'

export interface DaemonStatusInfo {
  isRunning: boolean
  pid: number
  socketPath: string
  logPath: string
  recentLogs: string[]
  uptime?: number
}

function checkProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function getDaemonBasicStatus(): { isRunning: boolean; pid: number } {
  if (!existsSync(DAEMON_PID_PATH)) {
    return { isRunning: false, pid: 0 }
  }

  try {
    const pidContent = readFileSync(DAEMON_PID_PATH, 'utf-8').trim()
    const pid = parseInt(pidContent, 10)

    if (isNaN(pid) || pid <= 0) {
      return { isRunning: false, pid: 0 }
    }

    const running = checkProcessRunning(pid)
    return { pid, isRunning: running }
  } catch {
    return { isRunning: false, pid: 0 }
  }
}

export function getRecentLogs(): string[] {
  if (!existsSync(DAEMON_LOG_PATH)) {
    return []
  }

  try {
    const logContent = readFileSync(DAEMON_LOG_PATH, 'utf-8')
    const lines = logContent.split('\n').filter(line => line.trim().length > 0)
    return lines.slice(-20)
  } catch {
    return []
  }
}

export async function queryDaemonStatus(): Promise<DaemonStatusInfo> {
  const { isRunning, pid } = getDaemonBasicStatus()

  const status: DaemonStatusInfo = {
    isRunning,
    pid,
    socketPath: DAEMON_SOCK_PATH,
    logPath: DAEMON_LOG_PATH,
    recentLogs: getRecentLogs()
  }

  if (!isRunning || !existsSync(DAEMON_SOCK_PATH)) {
    return status
  }

  return new Promise((resolve) => {
    try {
      const socket = createConnection(DAEMON_SOCK_PATH, () => {
        const request = JSON.stringify({
          method: 'GET',
          path: '/api/v1/health'
        }) + '\n'

        socket.write(request)

        socket.on('data', (data: Buffer) => {
          const buffer = data.toString()
          const lines = buffer.split('\n')

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const response = JSON.parse(line)
              if (response.ok === true && response.data?.status === 'ok') {
                status.uptime = response.data.uptime
                socket.end()
                resolve(status)
                return
              }
            } catch {
              // continue
            }
          }
        })

        socket.on('error', () => {
          resolve(status)
        })

        socket.on('close', () => {
          resolve(status)
        })

        setTimeout(() => {
          socket.destroy()
          resolve(status)
        }, 3000)
      })
    } catch {
      resolve(status)
    }
  })
}