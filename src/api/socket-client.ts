import { createConnection } from 'net'

export interface SocketRequest {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

export interface SocketResponse {
  status: number
  body: unknown
}

export async function socketRequest(
  socketPath: string,
  method: string,
  path: string,
  body?: unknown,
  projectPath?: string
): Promise<SocketResponse> {
  const request: SocketRequest = { method, path, body, projectPath }
  const requestStr = JSON.stringify(request) + '\n'

  return new Promise((resolve, reject) => {
    const client = createConnection(socketPath, () => {
      client.write(requestStr)
    })

    let buffer = ''

    client.on('data', (data: Buffer) => {
      buffer += data.toString()
      try {
        const response = JSON.parse(buffer) as SocketResponse
        client.end()
        resolve(response)
      } catch {
        // Not complete yet
      }
    })

    client.on('error', (err) => {
      reject(err)
    })

    client.on('close', () => {
      if (buffer && !buffer.includes('\n')) {
        try {
          const response = JSON.parse(buffer) as SocketResponse
          resolve(response)
        } catch {
          // Ignore
        }
      }
    })
  })
}