import { daemonLogger } from './logger'
import { daemonStartup } from '@openxenon/engine/infra/registry/daemon-startup'
import { directoryExists } from '@openxenon/engine/infra/filesystem'
import { assertRegistryConsistency, PROBE_REGISTRY_DRIFT } from '@openxenon/engine/Proof/probe-lint'
import { IAPError, IAPAction } from '@openxenon/engine/errors'

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

  // RFC-0015 D3.3: 3-way consistency check at daemon startup — hard-block on drift
  //   防止 daemon 跑出 silent drift 状态 (catalog ↔ handler ↔ strategy 不一致)
  //   即: 启动期断言 throw IAPError → startServer 抛错 → daemon 启动失败
  const consistency = assertRegistryConsistency()
  if (!consistency.ok) {
    const err = new IAPError(
      'PROOF',
      PROBE_REGISTRY_DRIFT,
      IAPAction.YIELD_TO_HUMAN,
      `probe registry drift detected (${consistency.errors.length} error(s)): ${consistency.errors.join('; ')}`,
      { errors: consistency.errors },
    )
    daemonLogger.error(err.message)
    throw err
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
