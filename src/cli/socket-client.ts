import { connect, type Socket } from 'net'
import { randomUUID } from 'crypto'
import { DAEMON_SOCK_PATH } from '../infra/global'
import { t } from '../infra/i18n'
import { IAPError, IAPAction } from '../core/errors'

export interface SocketMessage {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

let socket: Socket | null = null
let responseBuffer = ''
let dataListenerInstalled = false

/**
 * v1.1 fix-p2-robustness: 维护 pending Map 按 request id 路由响应。
 * 多响应不再丢消息：每个 await sendToDaemon 注册自己的 pending handler。
 * 收到响应 → 按 id 路由 → cleanup。
 */
interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  timeoutHandle: ReturnType<typeof setTimeout>
}
const pending = new Map<string, PendingRequest>()
/** 老 client 兼容：当 server 回 null id 响应时, 仅一个 inflight 默认 id 能 consume */
const NULL_ID_DEFAULT = '__default__'
const DEFAULT_TIMEOUT_MS = 5000

function installDataListenerOnce(sock: Socket): void {
  if (dataListenerInstalled) return
  dataListenerInstalled = true

  sock.on('data', (data: Buffer) => {
    responseBuffer += data.toString()
    const lines = responseBuffer.split('\n')
    responseBuffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      let parsed: { id?: string | null; ok?: boolean; data?: unknown; error?: unknown }
      try {
        parsed = JSON.parse(line) as typeof parsed
      } catch {
        // 损坏数据 — 跳过, 不污染 buffer
        continue
      }

      const respId = parsed.id ?? null
      const key = respId ?? NULL_ID_DEFAULT
      const entry = pending.get(key)
      if (!entry) {
        // 孤立响应 (老 client 漏接 / id 漂移) — 静默丢弃
        continue
      }
      pending.delete(key)
      clearTimeout(entry.timeoutHandle)

      if (parsed.ok === false && parsed.error) {
        const err = parsed.error as { message?: string; code?: string }
        entry.reject(
          new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, err.message ?? 'daemon error', {
            code: err.code,
          }),
        )
      } else {
        entry.resolve(parsed.data)
      }
    }
  })
}

function rejectAllPending(reason: IAPError): void {
  for (const [id, entry] of pending) {
    clearTimeout(entry.timeoutHandle)
    entry.reject(reason)
    pending.delete(id)
  }
}

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
      if (!socket) return
      installDataListenerOnce(socket)
      resolve(socket)
    })

    socket.on('error', (err) => {
      const wrapped = wrapSocketError(err, 'connect')
      socket = null
      dataListenerInstalled = false
      responseBuffer = ''
      rejectAllPending(wrapped)
      reject(wrapped)
    })

    socket.on('close', () => {
      const closeErr = new IAPError(
        'PROOF',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        'socket closed before response received',
        { socketPath: DAEMON_SOCK_PATH },
      )
      rejectAllPending(closeErr)
      socket = null
      dataListenerInstalled = false
      responseBuffer = ''
    })
  })
}

export async function sendToDaemon(message: SocketMessage): Promise<unknown> {
  const sock = await connectSocket()
  const id = randomUUID()

  return new Promise<unknown>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pending.delete(id)
      reject(
        new IAPError(
          'PROOF',
          'INFRA_FAIL',
          IAPAction.YIELD_TO_HUMAN,
          `socket request timeout after ${DEFAULT_TIMEOUT_MS}ms`,
          {
            id,
            socketPath: DAEMON_SOCK_PATH,
            suggestion: 'daemon may be unresponsive; try restarting it',
          },
        ),
      )
    }, DEFAULT_TIMEOUT_MS)

    pending.set(id, { resolve, reject, timeoutHandle })

    sock.write(`${JSON.stringify({ ...message, id })}\n`)
  })
}

export function closeSocket(): void {
  if (socket) {
    socket.end()
    socket = null
    dataListenerInstalled = false
    responseBuffer = ''
  }
}
