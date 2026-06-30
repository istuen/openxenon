import { daemonLogger } from './logger'
import { daemonStartup } from '@openxenon/engine/infra/registry/daemon-startup'
import { directoryExists } from '@openxenon/engine/infra/filesystem'

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

  // v0.2 T9: 冷加载 ProviderRegistry (v2 核心倒置 — 启动期不阻断)
  if (directoryExists('.openxenon')) {
    void daemonStartup(process.cwd()).then((result) => {
      for (const w of result.warnings) {
        daemonLogger.warn(w)
      }
      daemonLogger.info(
        `ProviderRegistry bootstrap: ${result.bootstrap.ok} ok, ${result.bootstrap.corrupted} corrupted, ${result.bootstrap.missing} missing`,
      )
    })
  }

  server = Bun.serve({
    port: config.port,
    hostname: config.hostname,
    fetch: config.fetch,
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
