import { loadProjectContext, closeProjectDatabases } from './context'
import { handleRequest } from './router'
import { daemonLogger } from '../daemon/logger'

export interface ApiServerConfig {
  port?: number
  hostname?: string
}

let server: any = null

export function startApiServer(config: ApiServerConfig = {}): any {
  const port = config.port || 8420
  const hostname = config.hostname || '127.0.0.1'
  
  if (server) {
    daemonLogger.warn('API server already running, stopping previous instance')
    stopApiServer()
  }
  
  server = Bun.serve({
    port,
    hostname,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url)
      const method = request.method
      const pathname = url.pathname
      
      daemonLogger.debug(`${method} ${pathname}`)
      
      const projectPath = request.headers.get('X-Project-Path')
      const context = loadProjectContext(projectPath)
      
      if (context instanceof Response) {
        return context
      }
      
      try {
        return await handleRequest(
          method,
          pathname,
          request,
          context.db,
          context.projectPath
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        daemonLogger.error(`Request handler error: ${errorMessage}`)
        
        return new Response(
          JSON.stringify({
            error: 'InternalServerError',
            message: errorMessage,
            statusCode: 500
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
  })
  
  daemonLogger.info(`API server started on ${hostname}:${port}`)
  
  return server
}

export function stopApiServer(): void {
  if (server) {
    server.stop()
    server = null
    closeProjectDatabases()
    daemonLogger.info('API server stopped')
  }
}

export function isApiServerRunning(): boolean {
  return server !== null
}

export function getApiServer(): any {
  return server
}
