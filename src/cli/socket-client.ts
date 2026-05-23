import { connect, type Socket } from 'net'
import { DAEMON_SOCK_PATH } from '../infra/global'

export interface SocketMessage {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

let socket: Socket | null = null

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
      reject(err)
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
      reject(err)
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
