// =============================================================================
// socket-client IAPError wrapping tests (v1.0 — Phase 4)
//
// 策略：用 Bun.spawn 跑独立子进程（设 HOME 指向 fake tmp dir + 把 .openxenon 重命名为别的）
//   Bun 在子进程里跑 socket-client 时：
//     DAEMON_SOCK_PATH = join(homedir(), '.openxenon', 'daemon.sock')
//   因为 HOME 指向 fake tmp dir，daemon.sock 不存在 → connect() 抛 ENOENT
//   → wrapSocketError 转 IAPError(AXIS=PROOF, INFRA_FAIL)
//
// 验证：
//   1. ENOENT → IAPError('PROOF', 'INFRA_FAIL', YIELD_TO_HUMAN, ...)
//   2. context 含 phase / systemError / socketPath / suggestion
//   3. sendToDaemon 同样 wrap（connect 阶段先失败 → phase=connect）
// =============================================================================

import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const FAKE_HOME = mkdtempSync(join(tmpdir(), 'oxn-sock-'))
const TEST_SCRIPT = join(FAKE_HOME, 'sock-test.ts')

// 写测试脚本到 fake home
writeFileSync(
  TEST_SCRIPT,
  `import { connectSocket, sendToDaemon } from '${join(import.meta.dir, '..', 'socket-client.ts')}'
import { IAPError } from '${join(import.meta.dir, '..', '..', 'core', 'errors', 'index.ts')}'

async function main() {
  const action = process.argv[2] || 'connect'
  try {
    if (action === 'send') {
      await sendToDaemon({ method: 'GET', path: '/x' })
    } else {
      await connectSocket()
    }
    console.log(JSON.stringify({ ok: false, error: 'no_throw' }))
    process.exit(99)
  } catch (e) {
    if (!(e instanceof IAPError)) {
      console.log(JSON.stringify({ ok: false, error: 'not_iap', type: e?.constructor?.name, msg: String(e) }))
      process.exit(98)
    }
    console.log(JSON.stringify({
      ok: false,
      error: {
        name: e.name,
        axis: e.axis,
        code: e.code,
        action: e.action,
        message: e.message,
        context: e.context,
      },
    }))
  }
}
main()
`,
)

interface SubprocessResult {
  stdout: string
  exitCode: number
}

async function runSubprocess(args: string[]): Promise<SubprocessResult> {
  const proc = Bun.spawn(['bun', 'run', TEST_SCRIPT, ...args], {
    env: { ...process.env, HOME: FAKE_HOME, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  return { stdout, exitCode }
}

describe('socket-client → IAPError wrapping (Phase 4)', () => {
  afterAll(() => {
    rmSync(FAKE_HOME, { recursive: true, force: true })
  })

  test('connectSocket → IAPError(AXIS=PROOF, CODE=INFRA_FAIL, ACTION=YIELD_TO_HUMAN)', async () => {
    const { stdout, exitCode } = await runSubprocess([])
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(stdout.trim())
    expect(parsed.ok).toBe(false)
    expect(parsed.error.name).toBe('IAP_PROOF_INFRA_FAIL')
    expect(parsed.error.axis).toBe('PROOF')
    expect(parsed.error.code).toBe('INFRA_FAIL')
    expect(parsed.error.action).toBe('YIELD_TO_HUMAN')
    expect(parsed.error.message).toMatch(/Daemon 未运行|ECONNREFUSED|ENOENT/)
  })

  test('context 含 phase=connect / systemError / socketPath / suggestion', async () => {
    const { stdout, exitCode } = await runSubprocess([])
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(stdout.trim())
    const ctx = parsed.error.context
    expect(ctx.phase).toBe('connect')
    expect(ctx.systemError).toMatch(/ECONNREFUSED|ENOENT/)
    expect(ctx.socketPath).toContain(FAKE_HOME)
    expect(ctx.socketPath).toContain('daemon.sock')
    expect(typeof ctx.suggestion).toBe('string')
  })

  test('sendToDaemon → IAPError(connect 阶段失败，phase=connect)', async () => {
    const { stdout, exitCode } = await runSubprocess(['send'])
    expect(exitCode).toBe(0)
    const parsed = JSON.parse(stdout.trim())
    expect(parsed.error.name).toBe('IAP_PROOF_INFRA_FAIL')
    expect(parsed.error.context.phase).toBe('connect')
  })
})
