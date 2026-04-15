import { daemonLogger } from './logger'

export interface ServerConfig {
  port: number
  hostname: string
  fetch: (request: Request) => Response | Promise<Response>
}

let server: any = null

export function startServer(config: ServerConfig): any {
  if (server) {
    daemonLogger.warn('Server already running, stopping previous instance')
    stopServer()
  }
  
  server = Bun.serve({
    port: config.port,
    hostname: config.hostname,
    fetch: config.fetch
  })
  
  daemonLogger.info(`Server started on ${config.hostname}:${config.port}`)
  
  return server
}

export function stopServer(): void {
  if (server) {
    server.stop()
    server = null
    daemonLogger.info('Server stopped')
  }
}

export function isServerRunning(): boolean {
  return server !== null
}

export function getServer(): any {
  return server
}
