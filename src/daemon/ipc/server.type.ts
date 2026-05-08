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

export type JsonRpcPayload = {
  action: string
  [key: string]: unknown
}