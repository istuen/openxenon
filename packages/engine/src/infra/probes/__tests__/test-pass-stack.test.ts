// =============================================================================
// test-pass-stack.test.ts — RFC-0015 D5.2 端到端验证
//
// 验证 ProbeContext.stackTools 传入 test-pass handler 时,
//   resolveToolCommand 派生的 shell command 是 stackTools 配置 (非 fallback).
//
// 用 bun:test mock 拦截 executeShellExec —
//   inject spy 检查传给 executeShellExec 的 command 字符串.
// =============================================================================

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ProbeContext } from '../test-pass'
import { executeTestPass } from '../test-pass'

// mock executeShellExec — spy 拦截 command 字符串传入, 不真正 spawn
const spy = mock(async (_command: string, _ctx: ProbeContext, _timeout?: number) => ({
  success: true,
  stdout: '',
  stderr: '',
  exitCode: 0,
  durationMs: 0,
}))

mock.module('../shell-exec', () => ({
  executeShellExec: spy,
  ShellExecResult: class {},
}))

describe('test-pass + stackTools 配置 (RFC-0015 D5.2)', () => {
  beforeEach(() => {
    spy.mockClear()
  })

  afterEach(() => {
    // 不需要 restore; mock.module 在 import 时绑定
  })

  test('stackTools 配置 bun-test override fallback', async () => {
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'bun-test', command: 'bun test --bail --coverage' }],
    }
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('bun test --bail --coverage')).toBe(true)
  })

  test('stackTools 未配置 → fallback (BWC)', async () => {
    const ctx: ProbeContext = { projectRoot: '/tmp' } // 无 stackTools
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('bun test')).toBe(true)
  })

  test('stackTools 配置 jest 但 toolName=bun-test → fallback (不变)', async () => {
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'jest', command: 'jest --ci' }],
    }
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('bun test')).toBe(true)
    expect(cmd).not.toContain('jest')
  })

  test('role 容错匹配 — "runtime + test runner" 关键词命中', async () => {
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'bun', role: 'runtime + test runner', command: 'bun test' }],
    }
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    // role 命中, command = 'bun test'
    expect(cmd.startsWith('bun test')).toBe(true)
  })

  test('stackTools 配置带 path + pattern 仍追加 (覆盖 command 也支持额外参数)', async () => {
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'bun-test', command: 'bun test' }],
    }
    const r = await executeTestPass({ path: '/src/foo.test.ts', pattern: 'integration' }, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd).toContain('/src/foo.test.ts')
    expect(cmd).toContain('integration')
  })
})
