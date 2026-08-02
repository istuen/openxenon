// =============================================================================
// lint-check-stack.test.ts — RFC-0015 D5.2 端到端验证
//
// v0.6.2 修复：原实现用 mock.module('../shell-exec', ...) 在文件顶层全局替换 shell-exec，
// 污染同进程内后续测试。改用 spyOn 单点 spy + afterEach(mock.restore())，
// spyOn 是 per-test 范围（mock.restore 文档：可恢复 spy/spyOn，但不恢复 mock.module）。
// =============================================================================

import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import * as shellExecModule from '../shell-exec'
import type { ProbeContext } from '../lint-check'
import { executeLintCheck } from '../lint-check'

describe('lint-check + stackTools 配置 (RFC-0015 D5.2)', () => {
  afterEach(() => {
    mock.restore()
  })

  test('stackTools 配置 biome override fallback (含 --apply)', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: 'Found 0 errors.',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'biome', command: 'biome check --apply' }],
    }
    const r = await executeLintCheck({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('biome check --apply')).toBe(true)
  })

  test('stackTools 未配置 → fallback (BWC "npx biome check")', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: ProbeContext = { projectRoot: '/tmp' }
    const r = await executeLintCheck({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('npx biome check')
  })

  test('stackTools 配置 eslint → role 容错匹配 + tool.command', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    // biome 不存在, eslint 配置 role='linter' → role 容错匹配
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'eslint', role: 'linter', command: 'eslint .' }],
    }
    const r = await executeLintCheck({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('eslint .')).toBe(true)
  })

  test('stackTools 配置 biome + params.apply=true → 仍只追加一次 --apply', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    // 极端 case: stackTools command 已含 --apply, params.apply=true 不能重复加
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'biome', command: 'biome check --apply' }],
    }
    const r = await executeLintCheck({ apply: true }, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    // 'biome check --apply' 已被 baseCommand 含, 不应重复加 --apply
    expect(cmd).toBe('biome check --apply')
    expect((cmd.match(/--apply/g) ?? []).length).toBe(1)
  })
})
