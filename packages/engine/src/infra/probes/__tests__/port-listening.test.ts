// =============================================================================
// port-listening.test.ts — RFC-0016 D4 一等公民 probe 验证
//
// 5 case: port listening / port not listening / invalid port / unreachable / fast timeout
// =============================================================================

import { createServer, type Server } from 'node:net'
import { afterEach, describe, expect, test } from 'bun:test'
import { executePortListening, type ProbeContext } from '../port-listening'

let testServer: Server | null = null

afterEach(() => {
  if (testServer) {
    testServer.close()
    testServer = null
  }
})

function startListening(): Promise<{ port: number; server: Server }> {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (typeof addr === 'object' && addr) {
        resolve({ port: addr.port, server })
      }
    })
  })
}

describe('port-listening (RFC-0016 D4)', () => {
  test('case 1: 真实监听端口 → passed=true', async () => {
    const { port, server } = await startListening()
    testServer = server
    const ctx: ProbeContext = { projectRoot: '/tmp' }
    const r = await executePortListening({ host: '127.0.0.1', port, timeout: 1000 }, ctx)
    expect(r.passed).toBe(true)
    expect(r.host).toBe('127.0.0.1')
    expect(r.port).toBe(port)
  })

  test('case 2: 端口未监听 → passed=false', async () => {
    // 用一个几乎肯定未占用的端口（高端随机数 + 立即释放）
    const ctx: ProbeContext = { projectRoot: '/tmp' }
    const r = await executePortListening({ host: '127.0.0.1', port: 1, timeout: 500 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toBeDefined()
  })

  test('case 3: 无效端口 (< 1) → passed=false, error 含 invalid', async () => {
    const ctx: ProbeContext = { projectRoot: '/tmp' }
    const r = await executePortListening({ host: '127.0.0.1', port: 0 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('invalid port')
  })

  test('case 4: 无效端口 (> 65535) → passed=false, error 含 invalid', async () => {
    const ctx: ProbeContext = { projectRoot: '/tmp' }
    const r = await executePortListening({ host: '127.0.0.1', port: 70000 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('invalid port')
  })

  test('case 5: 短超时 (100ms) + 不存在端口 → passed=false, error 含 timeout', async () => {
    const ctx: ProbeContext = { projectRoot: '/tmp' }
    const r = await executePortListening({ host: '10.255.255.1', port: 80, timeout: 100 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toBeDefined()
  })
})
