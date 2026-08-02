/**
 * external-cli-e2e.test.ts — v0.6.1-alpha.4 Phase 2 External inline + 状态管理 E2E 测试
 *
 * 覆盖：
 *  1. oxn external status — 空文件场景
 *  2. oxn external check — 创建含 External 的 Domain + 验证状态文件写入
 *  3. oxn external mark — 手动切换状态
 *  4. TTL 过期 → stale
 *  5. External kind enum 校验（compiler validate）
 *  6. url/path 互斥校验
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { spawnSync } from 'bun'
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI_PATH = join(import.meta.dir, '..', '..', 'index.ts')

function runOxn(args: string[], cwd: string): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync({
    cmd: ['bun', 'run', CLI_PATH, ...args],
    cwd,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString('utf-8'),
    stderr: result.stderr.toString('utf-8'),
  }
}

function runOxnJson<T>(args: string[], cwd: string): { ok: boolean; data?: T; error?: any } {
  const r = runOxn([...args, '--json'], cwd)
  if (r.exitCode !== 0) {
    return { ok: false, error: { stdout: r.stdout, stderr: r.stderr } }
  }
  try {
    const parsed = JSON.parse(r.stdout.trim())
    return { ok: parsed.ok === true, data: parsed.data, error: parsed.error }
  } catch (err) {
    return { ok: false, error: { parseError: String(err), stdout: r.stdout } }
  }
}

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-external-e2e-'))
})

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('1. oxn external status — 空文件场景', () => {
  test('空 .cache 目录 → status 返回 count=0', () => {
    mkdirSync(join(tmpDir, '.openxenon', '.cache'), { recursive: true })
    const r = runOxnJson<{ count: number; entries: any[] }>(['external', 'status'], tmpDir)
    expect(r.ok).toBe(true)
    expect(r.data?.count).toBe(0)
    expect(r.data?.entries).toEqual([])
  })
})

describe('2. oxn external check — 创建含 External 的 Domain', () => {
  function setupDomainWithExternals(): string {
    mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
    const domainContent = `---
entity: domain
version: 0.3.0
name: TestDomain
---
# Domain: TestDomain

> Test domain with externals

## Externals
### stripe-api
- url: https://api.example.com/v1
- kind: rest-api
- ttl: 7d
- summary: Test API
### local-doc
- path: ./README.md
- kind: documentation
- summary: Local doc file
`
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'TestDomain.md'), domainContent)
    writeFileSync(join(tmpDir, 'README.md'), '# Test Project\n')
    return join(tmpDir, '.openxenon', 'assets', 'domains', 'TestDomain.md')
  }

  test('check 扫描 2 externals + 写入 status 文件', () => {
    setupDomainWithExternals()
    const r = runOxnJson<{ total: number; available: number; unavailable: number; results: any[] }>(
      ['external', 'check'],
      tmpDir,
    )
    expect(r.ok).toBe(true)
    expect(r.data?.total).toBe(2)

    // local-doc 存在 → available
    // stripe-api 不可达（example.com 未真存在此 endpoint）→ unavailable
    const localDoc = r.data?.results.find((e: any) => e.externalName === 'local-doc')
    expect(localDoc?.status).toBe('available')

    // 验证 status 文件被写入
    const statusPath = join(tmpDir, '.openxenon', '.cache', 'external-status.json')
    expect(existsSync(statusPath)).toBe(true)
    const statusData = JSON.parse(readFileSync(statusPath, 'utf-8'))
    expect(Object.keys(statusData)).toContain('domain::TestDomain::stripe-api')
    expect(Object.keys(statusData)).toContain('domain::TestDomain::local-doc')
  })

  test('check 仅检测指定 name（--name 过滤）', () => {
    setupDomainWithExternals()
    const r = runOxnJson<{ total: number; results: any[] }>(['external', 'check', '--name', 'stripe-api'], tmpDir)
    expect(r.ok).toBe(true)
    expect(r.data?.total).toBe(1)
    expect(r.data?.results[0]?.externalName).toBe('stripe-api')
  })
})

describe('3. oxn external mark — 手动切换状态', () => {
  test('mark stripe-api 为 stale + 写 status + 显示状态变更', () => {
    // setup
    mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'TestDomain.md'),
      `---
entity: domain
version: 0.3.0
name: TestDomain
---
# Domain: TestDomain

## Externals
### stripe-api
- url: https://api.example.com/v1
- kind: rest-api
`,
    )
    // 先 check 一次
    runOxn(['external', 'check'], tmpDir)
    // mark 为 stale
    const markResult = runOxnJson<{ marked: number; matches: any[] }>(
      ['external', 'mark', '--name', 'stripe-api', '--status', 'stale', '--reason', 'API 维护中'],
      tmpDir,
    )
    expect(markResult.ok).toBe(true)
    expect(markResult.data?.marked).toBe(1)

    // 验证 status 文件反映状态变更
    const statusPath = join(tmpDir, '.openxenon', '.cache', 'external-status.json')
    const statusData = JSON.parse(readFileSync(statusPath, 'utf-8'))
    expect(statusData['domain::TestDomain::stripe-api'].status).toBe('stale')
    expect(statusData['domain::TestDomain::stripe-api'].error).toBe('API 维护中')

    // status 命令显示更新
    const statusResult = runOxnJson<{ count: number; entries: any[] }>(['external', 'status'], tmpDir)
    expect(statusResult.data?.entries[0]?.status).toBe('stale')
  })

  test('mark 不存在的 name → OXN_EXTERNAL_NOT_FOUND', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'Empty.md'),
      `---
entity: domain
version: 0.3.0
name: Empty
---
# Domain: Empty
`,
    )
    // 用 --json 让 outputError 走 stdout
    const r = runOxn(['external', 'mark', '--name', 'nonexistent', '--status', 'stale', '--json'], tmpDir)
    expect(r.exitCode).not.toBe(0)
    // JSON 可能输出到 stdout 或 stderr；尝试两边
    const combined = r.stdout + r.stderr
    const parsed = JSON.parse(combined.trim())
    expect(parsed.error?.code).toBe('OXN_EXTERNAL_NOT_FOUND')
  })
})

describe('4. TTL 过期 → stale', () => {
  test('检查 ttl 过期逻辑（isTtlExpired 单元测试通过 setStatus 后 check）', () => {
    // 这个测试通过直接构造 status 文件 + check 来验证 TTL 逻辑
    mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
    mkdirSync(join(tmpDir, '.openxenon', '.cache'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'TestDomain.md'),
      `---
entity: domain
version: 0.3.0
name: TestDomain
---
# Domain: TestDomain

## Externals
### stripe-api
- url: https://api.example.com/v1
- kind: rest-api
- ttl: 7d
`,
    )
    // 预写入一个 stale 状态的 status（lastChecked 在 100 天前）
    const oldDate = new Date(Date.now() - 100 * 86400_000).toISOString()
    writeFileSync(
      join(tmpDir, '.openxenon', '.cache', 'external-status.json'),
      JSON.stringify({
        'domain::TestDomain::stripe-api': {
          status: 'available',
          lastChecked: oldDate,
        },
      }),
    )
    // check 应该检测到 ttl 过期并切换为 stale
    const r = runOxnJson<{ results: any[] }>(['external', 'check'], tmpDir)
    expect(r.ok).toBe(true)
    const stripeApi = r.data?.results.find((e: any) => e.externalName === 'stripe-api')
    expect(stripeApi?.status).toBe('stale')
  })
})

// ADR-0088 P8 (2026-08-02): 删除 v0.7 废弃的 External 校验块（旧 ## Externals H2 已从 Domain 移除）
// 原 4 个 .skip 测试（kind 枚举 + url/path 互斥）已废弃，删除以减少 noise。
