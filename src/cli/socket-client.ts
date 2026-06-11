import { connect, type Socket } from 'net'
import { DAEMON_SOCK_PATH } from '../infra/global'
import { t } from '../i18n'
import { IAPError, IAPAction } from '../core/errors'

export interface SocketMessage {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

let socket: Socket | null = null

/**
 * 把底层 OS 套接字错误翻译为 IAPError（PROOF / INFRA_FAIL）。
 *
 * 翻译策略（按优先级）：
 *   - ECONNREFUSED / ENOENT  → Daemon 没启动 / socket 文件不存在
 *   - ETIMEDOUT / 'timed out' → Daemon 进程存在但没响应
 *   - 其他 OS 错 → 仍归 INFRA_FAIL（YIELD_TO_HUMAN，让用户排查）
 *
 * 哲学契约：基础设施层错是"用户环境问题"（不是 OXN 引擎 Bug），
 *   所以归 IAPError(action=YIELD_TO_HUMAN)，不是 OXNCrash。
 */
function wrapSocketError(err: NodeJS.ErrnoException, phase: 'connect' | 'send'): IAPError {
  const code = err.code ?? 'UNKNOWN'
  const message = err.message ?? String(err)

  if (code === 'ECONNREFUSED' || code === 'ENOENT') {
    return new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, t('daemon.errorRunning', { code, message }), {
      phase,
      systemError: code,
      socketPath: DAEMON_SOCK_PATH,
      suggestion: t('daemon.suggestionStart'),
    })
  }
  if (code === 'ETIMEDOUT' || message.includes('timed out')) {
    return new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, t('daemon.errorTimeout', { code, message }), {
      phase,
      systemError: code,
      socketPath: DAEMON_SOCK_PATH,
      suggestion: t('daemon.suggestionTimeout'),
    })
  }
  return new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, t('daemon.errorComm', { code, message }), {
    phase,
    systemError: code,
    socketPath: DAEMON_SOCK_PATH,
  })
}

export async function connectSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (socket) {
      resolve(socket)
      return
    }

    socket = connect(DAEMON_SOCK_PATH, () => {
      resolve(socket!)
    })

    socket.on('error', (err) => {
      socket = null
      reject(wrapSocketError(err, 'connect'))
    })

    socket.on('close', () => {
      socket = null
    })
  })
}

export async function sendToDaemon(message: SocketMessage): Promise<unknown> {
  const sock = await connectSocket()

  return new Promise((resolve, reject) => {
    let responseBuffer = ''

    const onData = (data: Buffer) => {
      responseBuffer += data.toString()
      const lines = responseBuffer.split('\n')
      const lastLine = lines[lines.length - 1]

      if (lastLine && lastLine.trim() === '') {
        lines.pop()
        responseBuffer = ''
      }

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          sock.removeListener('data', onData)
          resolve(parsed)
          return
        } catch {
          // Continue collecting data
        }
      }
    }

    sock.on('data', onData)

    sock.on('error', (err) => {
      sock.removeListener('data', onData)
      reject(wrapSocketError(err, 'send'))
    })

    sock.write(`${JSON.stringify(message)}\n`)
  })
}

export function closeSocket(): void {
  if (socket) {
    socket.end()
    socket = null
  }
}
