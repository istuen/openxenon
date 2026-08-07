// =============================================================================
// pool-review-approve-reject-e2e.test.ts — DEPRECATED (v0.4.0 D1 2026-08-07)
//
// Intent Pool v3 已退役——5 个子命令（list/create/review/approve/reject）全部抛 `OXN_POOL_DEPRECATED`。
// 此测试文件 v0.4.0 后只剩"deprecation 一致性"测试用例，验证每个子命令抛同一错误码 + 引导文案。
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-pool-deprecated-e2e-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function initProject(): Promise<void> {
  const r = await runCli(['init'])
  if (r.exitCode !== 0) throw new Error(`init failed: ${r.stderr || r.stdout}`)
}

type DeprecationError = { ok: false; error: { code: string; message: string } }

async function expectDeprecated(subcommand: string, args: string[]): Promise<DeprecationError> {
  const r = await runCli(['pool', subcommand, ...args, '--json'])
  expect(r.exitCode).toBe(1)
  const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string; message: string } }
  expect(j.ok).toBe(false)
  expect(j.error?.code).toBe('OXN_POOL_DEPRECATED')
  expect(j.error?.message).toContain('Intent Pool v3 已退役')
  return j as DeprecationError
}

describe('oxn pool * (DEPRECATED v0.4.0 D1) — deprecation 一致性', () => {
  test('pool create：抛 OXN_POOL_DEPRECATED', async () => {
    await initProject()
    await expectDeprecated('create', ['--pool', 'audit', '--slug', 'x', '--title', 'X', '--content', 'x'])
  })

  test('pool list：抛 OXN_POOL_DEPRECATED', async () => {
    await initProject()
    await expectDeprecated('list', [])
  })

  test('pool review：抛 OXN_POOL_DEPRECATED', async () => {
    await initProject()
    await expectDeprecated('review', ['test-suggestion'])
  })

  test('pool approve：抛 OXN_POOL_DEPRECATED', async () => {
    await initProject()
    await expectDeprecated('approve', ['add-invariant-test'])
  })

  test('pool reject：抛 OXN_POOL_DEPRECATED', async () => {
    await initProject()
    await expectDeprecated('reject', ['reject-test', '--reason', 'not applicable'])
  })

  test('每个子命令 suggestion 含 `oxn draft` 引导', async () => {
    await initProject()
    const cases: Array<[string, string[]]> = [
      ['create', ['--pool', 'audit', '--slug', 'x', '--title', 'X', '--content', 'x']],
      ['list', []],
      ['review', ['x']],
      ['approve', ['x']],
      ['reject', ['x', '--reason', 'y']],
    ]
    for (const [sub, args] of cases) {
      const r = await runCli(['pool', sub, ...args, '--json'])
      expect(r.exitCode).toBe(1)
      const j = JSON.parse(r.stdout) as {
        error?: { message?: string; suggestion?: string }
      }
      const suggestion = j.error?.suggestion ?? ''
      const combined = `${j.error?.message ?? ''} ${suggestion}`
      expect(combined).toContain('oxn draft')
    }
  })
})
