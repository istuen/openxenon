// =============================================================================
// ts-compiles-stack.test.ts + docs-build-stack.test.ts
// RFC-0015 D5.2 端到端验证 — 检查 ProbeContext.stackTools 注入的命令传到 executeShellExec
//
// v0.6.2 修复：原实现用 mock.module('../shell-exec', ...) 在文件顶层全局替换 shell-exec，
// 污染同进程内后续测试。改用 spyOn 单点 spy + afterEach(mock.restore())。
// =============================================================================

import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import * as shellExecModule from '../shell-exec'
import type { ProbeContext as TsContext } from '../ts-compiles'
import { executeTsCompiles } from '../ts-compiles'
import type { ProbeContext as DocsContext } from '../docs-build'
import { executeDocsBuild } from '../docs-build'

describe('ts-compiles + stackTools 配置 (RFC-0015 D5.2)', () => {
  afterEach(() => {
    mock.restore()
  })

  test('stackTools 配置 typescript override fallback (--noEmit 仍自动追加)', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: TsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'typescript', command: 'tsc' }],
    }
    const r = await executeTsCompiles({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    // 'tsc' 后追加 --noEmit
    expect(cmd.startsWith('tsc --noEmit')).toBe(true)
  })

  test('stackTools 配置含 --noEmit 已带, 不重复加', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: TsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'typescript', command: 'tsc --noEmit --strict' }],
    }
    const r = await executeTsCompiles({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect((cmd.match(/--noEmit/g) ?? []).length).toBe(1)
    expect(cmd).toContain('--strict')
  })

  test('stackTools 未配置 → fallback "bun x tsc --noEmit"', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: TsContext = { projectRoot: '/tmp' }
    const r = await executeTsCompiles({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('bun x tsc --noEmit')
  })
})

describe('docs-build + stackTools 配置 (RFC-0015 D5.2)', () => {
  afterEach(() => {
    mock.restore()
  })

  test('stackTools 配置 vitepress override fallback', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: DocsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'vitepress', command: 'vitepress build docs' }],
    }
    const r = await executeDocsBuild({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('vitepress build docs')
  })

  test('stackTools 未配置 → fallback "bun run docs:build"', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: DocsContext = { projectRoot: '/tmp' }
    const r = await executeDocsBuild({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('bun run docs:build')
  })

  test('role 容错匹配 — "documentation" 关键词命中', async () => {
    const shellSpy = spyOn(shellExecModule, 'executeShellExec').mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
    })
    const ctx: DocsContext = {
      projectRoot: '/tmp',
      stackTools: [{ name: 'docs-build', role: 'documentation site builder', command: 'mkdocs build' }],
    }
    const r = await executeDocsBuild({}, ctx)
    expect(r.passed).toBe(true)
    const cmd = shellSpy.mock.calls[0]?.[0] as string
    expect(cmd).toBe('mkdocs build')
  })
})
