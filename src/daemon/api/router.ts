export type RouteHandler = (
  request: Request,
  projectPath: string
) => Response | Promise<Response>

export interface Route {
  method: string
  path: string
  handler: RouteHandler
}

const routes: Map<string, RouteHandler> = new Map()

export function registerRoute(method: string, path: string, handler: RouteHandler): void {
  const key = `${method.toUpperCase()} ${path}`
  routes.set(key, handler)
}

export function getRoute(method: string, path: string): RouteHandler | null {
  const key = `${method.toUpperCase()} ${path.split('?')[0]}`
  return routes.get(key) || null
}

export function handleRequest(
  method: string,
  pathname: string,
  request: Request,
  _db: unknown,
  projectPath: string
): Response | Promise<Response> {
  const handler = getRoute(method, pathname)

  if (!handler) {
    return new Response(
      JSON.stringify({
        error: 'NotFound',
        message: `No route found for ${method} ${pathname}`,
        statusCode: 404
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return handler(request, projectPath)
}
