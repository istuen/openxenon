// =============================================================================
// ShellProvider tests (RFC-0015 D2.3)
//
// ADR-0086 §D2 trust-baseline 12-flag 接线契约验证：
//   - sandbox_violation: validateCommand 命中 DANGEROUS_PATTERNS
//   - network_timeout: spawn timeout 触发
//   - unknown: catch-all (其他异常路径)
//
// 参考 file-provider.test.ts 范式:
//   - mkdtemp tmpDir 模式
//   - 4 case 覆盖 happy / sandbox_violation / network_timeout / unknown
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { ShellProvider } from '../shell-provider'

describe('ShellProvider', () => {
  // ShellProvider 需要 projectRoot；test 调真实 executeShellExec
  // 注: ShellProvider.ioExec 是 async (委派 executeShellExec)
  const context = { projectRoot: process.cwd() }

  test('case 1: shell 正常运行（exit 0）→ flags: []', async () => {
    const provider = new ShellProvider(context)
    const r = await provider.ioExec({ command: 'echo hello-from-shell' })
    expect(r.result.exitCode).toBe(0)
    expect(r.result.stdout).toContain('hello-from-shell')
    expect(r.interference.flags).toEqual([])
  })

  test('case 2: shell 命令含 metachar → flags 包含 sandbox_violation', async () => {
    const provider = new ShellProvider(context)
    // DANGEROUS_PATTERNS 包含 /\r?\n/ + /`/ + /\$\(/ + /\0/
    // 用 newline 注入（最常见的命令注入 metachar）
    const r = await provider.ioExec({ command: 'echo first\nrm -rf /etc/hostname' })
    expect(r.interference.flags).toContain('sandbox_violation')
    expect(r.result.exitCode).not.toBe(0)
  })

  test('case 2b: shell 命令含 command substitution → flags 包含 sandbox_violation', async () => {
    const provider = new ShellProvider(context)
    // $() 也是 metachar
    const r = await provider.ioExec({ command: 'echo $(whoami)' })
    expect(r.interference.flags).toContain('sandbox_violation')
  })

  test('case 3: shell timeout → flags 包含 network_timeout', async () => {
    const provider = new ShellProvider(context)
    // 用 sleep 30 + 100ms timeout 触发
    const r = await provider.ioExec({ command: 'sleep 30', timeoutMs: 100 })
    expect(r.interference.flags).toContain('network_timeout')
  })

  test('case 4: ioStat 必须抛 IAPError (shell provider 不实现 io.stat)', async () => {
    const provider = new ShellProvider(context)
    await expect(provider.ioStat({ path: '/tmp' })).rejects.toThrow(/shell provider does not implement io\.stat/)
  })

  test('case 5: ioRead 必须抛 IAPError (shell provider 不实现 io.read)', async () => {
    const provider = new ShellProvider(context)
    await expect(provider.ioRead({ path: '/tmp/foo.txt' })).rejects.toThrow(
      /shell provider does not implement io\.read/,
    )
  })
})
