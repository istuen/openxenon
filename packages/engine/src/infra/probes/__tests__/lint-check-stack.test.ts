// =============================================================================
// lint-check-stack.test.ts — RFC-0015 D5.2 端到端验证
// =============================================================================

import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ProbeContext } from '../lint-check'
import { executeLintCheck } from '../lint-check'

const spy = mock(async (_command: string, _ctx: ProbeContext, _timeout?: number) => ({
  success: true,
  stdout: 'Found 0 errors.',
  stderr: '',
  exitCode: 0,
  durationMs: 0,
}))

mock.module('../shell-exec', () => ({
  executeShellExec: spy,
  ShellExecResult: class {},
}))

describe('lint-check + stackTools 配置 (RFC-0015 D5.2)', () => {
  beforeEach(() => {
    spy.mockClear()
  })

  test('stackTools 配置 biome override fallback (含 --apply)', async () => {
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'biome', command: 'biome check --apply' }],
    }
    const r = await executeLintCheck({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('biome check --apply')).toBe(true)
  })

  test('stackTools 未配置 → fallback (BWC "npx biome check")', async () => {
    const ctx: ProbeContext = { projectRoot: '/tmp' }
    const r = await executeLintCheck({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('npx biome check')
  })

  test('stackTools 配置 eslint → role 容错匹配 + tool.command', async () => {
    // biome 不存在, eslint 配置 role='linter' → role 容错匹配
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'eslint', role: 'linter', command: 'eslint .' }],
    }
    const r = await executeLintCheck({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd.startsWith('eslint .')).toBe(true)
  })

  test('stackTools 配置 biome + params.apply=true → 仍只追加一次 --apply', async () => {
    // 极端 case: stackTools command 已含 --apply, params.apply=true 不能重复加
    const ctx: ProbeContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'biome', command: 'biome check --apply' }],
    }
    const r = await executeLintCheck({ apply: true }, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    // 'biome check --apply' 已被 baseCommand 含, 不应重复加 --apply
    expect(cmd).toBe('biome check --apply')
    expect((cmd.match(/--apply/g) ?? []).length).toBe(1)
  })
})
