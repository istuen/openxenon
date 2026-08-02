// =============================================================================
// test-pass-stack.test.ts — RFC-0015 D5.2 端到端验证
//
// v0.6.2 修复：原实现用 mock.module('../shell-exec', ...) 在文件顶层全局替换 shell-exec，
// 污染同进程内后续测试。改用 spyOn 单点 spy + afterEach(mock.restore())。
// =============================================================================

import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import * as shellExecModule from '../shell-exec'
import type { ProbeContext } from '../test-pass'
import { executeTestPass } from '../test-pass'

describe('test-pass + stackTools 配置 (RFC-0015 D5.2)', () => {
  afterEach(() => {
    mock.restore()
  })

  test('stackTools 配置 bun-test override fallback', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'bun-test', command: 'bun test --bail --coverage' }],
    }
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('bun test --bail --coverage')).toBe(true)
  })

  test('stackTools 未配置 → fallback (BWC)', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: ProbeContext = { projectRoot: '/tmp' } // 无 stackTools
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('bun test')).toBe(true)
  })

  test('stackTools 配置 jest 但 toolName=bun-test → fallback (不变)', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'jest', command: 'jest --ci' }],
    }
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('bun test')).toBe(true)
    expect(cmd).not.toContain('jest')
  })

  test('role 容错匹配 — "runtime + test runner" 关键词命中', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'bun', role: 'runtime + test runner', command: 'bun test' }],
    }
    const r = await executeTestPass({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    // role 命中, command = 'bun test'
    expect(cmd.startsWith('bun test')).toBe(true)
  })
})
