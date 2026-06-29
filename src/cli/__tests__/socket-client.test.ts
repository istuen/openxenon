// =============================================================================
// socket-client IAPError wrapping tests (v1.0 — Phase 4)
//
// 策略：使用 Bun.mock.module 覆盖 @openxenon/engine/infra/global
//   把 DAEMON_SOCK_PATH 指向 fake 路径，模拟 daemon 未运行
//   → connect() 抛 ENOENT → wrapSocketError 转 IAPError(AXIS=PROOF, INFRA_FAIL)
//
// 验证：
//   1. ENOENT → IAPError('PROOF', 'INFRA_FAIL', YIELD_TO_HUMAN, ...)
//   2. context 含 phase / systemError / socketPath / suggestion
//   3. sendToDaemon 同样 wrap（connect 阶段先失败 → phase=connect）
// =============================================================================

import { describe, expect, mock, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const FAKE_SOCK = mkdtempSync(join(tmpdir(), 'oxn-sock-'))
const FAKE_PATH = join(FAKE_SOCK, 'daemon.sock')

mock.module('@openxenon/engine/infra/global', () => ({
  DAEMON_SOCK_PATH: FAKE_PATH,
  DAEMON_PID_PATH: join(FAKE_SOCK, 'daemon.pid'),
  DAEMON_LOG_PATH: join(FAKE_SOCK, 'daemon.log'),
  HALL_PATH: join(FAKE_SOCK, 'hall'),
  GLOBAL_BOUNDARY_PATH: FAKE_SOCK,
  CORE_PROJECTS_PATH: join(FAKE_SOCK, 'projects.json'),
  CORE_DAEMON_CONFIG_PATH: join(FAKE_SOCK, 'daemon-config.json'),
}))

describe('socket-client → IAPError wrapping (Phase 4)', () => {
  test('connectSocket → IAPError(AXIS=PROOF, CODE=INFRA_FAIL, ACTION=YIELD_TO_HUMAN)', async () => {
    const { IAPError } = await import('@openxenon/engine/errors')
    const { connectSocket } = await import('../socket-client')
    let err: unknown
    try {
      await connectSocket()
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(IAPError)
    const iap = err as InstanceType<typeof IAPError>
    expect(iap.name).toBe('IAP_PROOF_INFRA_FAIL')
    expect(iap.axis).toBe('PROOF')
    expect(iap.code).toBe('INFRA_FAIL')
    expect(iap.action).toBe('YIELD_TO_HUMAN')
    expect(iap.message).toMatch(/Daemon 未运行|ECONNREFUSED|ENOENT/)
  })

  test('context 含 phase=connect / systemError / socketPath / suggestion', async () => {
    const { IAPError } = await import('@openxenon/engine/errors')
    const { connectSocket } = await import('../socket-client')
    let err: unknown
    try {
      await connectSocket()
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(IAPError)
    const ctx = (err as InstanceType<typeof IAPError>).context
    expect(ctx.phase).toBe('connect')
    expect(ctx.systemError).toMatch(/ECONNREFUSED|ENOENT/)
    expect(ctx.socketPath).toContain(FAKE_SOCK)
    expect(ctx.socketPath).toContain('daemon.sock')
    expect(typeof ctx.suggestion).toBe('string')
  })

  test('sendToDaemon → IAPError(connect 阶段失败，phase=connect)', async () => {
    const { IAPError } = await import('@openxenon/engine/errors')
    const { sendToDaemon } = await import('../socket-client')
    let err: unknown
    try {
      await sendToDaemon({ method: 'GET', path: '/x' })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(IAPError)
    const iap = err as InstanceType<typeof IAPError>
    expect(iap.context.phase).toBe('connect')
  })

  // 清理
  test('cleanup', () => {
    rmSync(FAKE_SOCK, { recursive: true, force: true })
  })
})
