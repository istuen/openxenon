// =============================================================================
// ts-compiles-stack.test.ts + docs-build-stack.test.ts
// RFC-0015 D5.2 端到端验证 — 检查 ProbeContext.stackTools 注入的命令传到 executeShellExec
// =============================================================================

import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { ProbeContext as TsContext } from '../ts-compiles'
import { executeTsCompiles } from '../ts-compiles'
import type { ProbeContext as DocsContext } from '../docs-build'
import { executeDocsBuild } from '../docs-build'

const spy = mock(async (_command: string, _ctx: unknown, _timeout?: number) => ({
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

describe('ts-compiles + stackTools 配置 (RFC-0015 D5.2)', () => {
  beforeEach(() => {
    spy.mockClear()
  })

  test('stackTools 配置 typescript override fallback (--noEmit 仍自动追加)', async () => {
    const ctx: TsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'typescript', command: 'tsc' }],
    }
    const r = await executeTsCompiles({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    // 'tsc' 后追加 --noEmit
    expect(cmd.startsWith('tsc --noEmit')).toBe(true)
  })

  test('stackTools 配置含 --noEmit 已带, 不重复加', async () => {
    const ctx: TsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'typescript', command: 'tsc --noEmit --strict' }],
    }
    const r = await executeTsCompiles({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect((cmd.match(/--noEmit/g) ?? []).length).toBe(1)
    expect(cmd).toContain('--strict')
  })

  test('stackTools 未配置 → fallback "bun x tsc --noEmit"', async () => {
    const ctx: TsContext = { projectRoot: '/tmp' }
    const r = await executeTsCompiles({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('bun x tsc --noEmit')
  })
})

describe('docs-build + stackTools 配置 (RFC-0015 D5.2)', () => {
  beforeEach(() => {
    spy.mockClear()
  })

  test('stackTools 配置 vitepress override fallback', async () => {
    const ctx: DocsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'vitepress', command: 'vitepress build docs' }],
    }
    const r = await executeDocsBuild({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('vitepress build docs')
  })

  test('stackTools 未配置 → fallback "bun run docs:build"', async () => {
    const ctx: DocsContext = { projectRoot: '/tmp' }
    const r = await executeDocsBuild({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('bun run docs:build')
  })

  test('role 容错匹配 — "documentation" 关键词命中', async () => {
    const ctx: DocsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'docs-build', role: 'documentation site builder', command: 'mkdocs build' }],
    }
    const r = await executeDocsBuild({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = spy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('mkdocs build')
  })
})
