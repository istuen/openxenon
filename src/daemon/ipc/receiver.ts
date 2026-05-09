export interface IncomingMessage {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

export type RouteHandler = (
  body: unknown,
  projectPath: string
) => Response | Promise<Response>

const routes: Map<string, RouteHandler> = new Map()

export function registerRoute(method: string, path: string, handler: RouteHandler): void {
  const key = `${method.toUpperCase()} ${path}`
  routes.set(key, handler)
}

export function getRoute(method: string, path: string): RouteHandler | null {
  const key = `${method.toUpperCase()} ${path.split('?')[0]}`
  return routes.get(key) || null
}

export async function handleIncomingMessage(
  message: IncomingMessage
): Promise<Response> {
  const { method, path, body, projectPath } = message
  const key = `${method.toUpperCase()} ${path}`

  const handler = routes.get(key)
  if (!handler) {
    return new Response(
      JSON.stringify({ error: 'NotFound', message: `No route for ${key}` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return handler(body, projectPath || '')
}
