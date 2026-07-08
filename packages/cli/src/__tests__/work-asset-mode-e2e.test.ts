// =============================================================================
// work-asset-mode-e2e.test.ts — v0.6.1-alpha.1 Batch 2 (Work Asset Mode 实现)
//
// 覆盖 `oxn work create --type asset --asset-kind <kind>` 真实创建/管理 Asset 流程：
//   1. --asset-kind domain → 写 .openxenon/assets/domains/<Name>.oxn
//   2. --asset-kind blueprint → 写 .openxenon/assets/blueprints/<name>.oxn
//   3. --asset-kind stack → 写 .openxenon/assets/stack/<name>.oxn
//   4. --asset-kind library → 写 .openxenon/assets/libraries/<name>.oxn
//   5. --asset-kind external → 写 .openxenon/assets/externals/<name>.oxn
//   6. --asset-kind invalid → 抛 OXN_INVALID_ASSET_KIND
//   7. 重复创建（同 name） → 抛 OXN_ASSET_EXISTS（除非 --force）
//   8. --force 覆盖已存在
//   9. --type develop 走 Work 编排（不应创建 Asset）
//
// v0.6.1-alpha.0 状态：CLI 拒绝 --asset-kind（unknown flag）— Batch 1
// v0.6.1-alpha.1 Batch 2 状态：CLI 接受 --asset-kind + 写 Asset 文件 — 本测试
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-asset-mode-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
  )
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

// 写文件工具（这里需要 import fs.writeFileSync）
import { writeFileSync } from 'fs'

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}

describe('Work Asset Mode --type asset --asset-kind (v0.6.1-alpha.1 Batch 2)', () => {
  test('1. --asset-kind domain 写 .openxenon/assets/domains/<Name>.oxn', async () => {
    const r = await runCli(['work', 'create', 'MyDomain', '--type', 'asset', '--asset-kind', 'domain', '--json'])
    expect(r.exitCode).toBe(0)
    const assetPath = join(tmpDir, '.openxenon', 'assets', 'domains', 'MyDomain.oxn')
    expect(existsSync(assetPath)).toBe(true)
    const content = readFileSync(assetPath, 'utf-8')
    expect(content).toContain('domain "MyDomain"')
  })

  test('2. --asset-kind blueprint 写 .openxenon/assets/blueprints/<name>.oxn', async () => {
    const r = await runCli(['work', 'create', 'my-blueprint', '--type', 'asset', '--asset-kind', 'blueprint', '--json'])
    expect(r.exitCode).toBe(0)
    const assetPath = join(tmpDir, '.openxenon', 'assets', 'blueprints', 'my-blueprint.oxn')
    expect(existsSync(assetPath)).toBe(true)
    const content = readFileSync(assetPath, 'utf-8')
    expect(content).toContain('blueprint "my-blueprint"')
  })

  test('3. --asset-kind stack 写 .openxenon/assets/stack/<name>.oxn', async () => {
    const r = await runCli(['work', 'create', 'my-stack', '--type', 'asset', '--asset-kind', 'stack', '--json'])
    expect(r.exitCode).toBe(0)
    const assetPath = join(tmpDir, '.openxenon', 'assets', 'stack', 'my-stack.oxn')
    expect(existsSync(assetPath)).toBe(true)
    const content = readFileSync(assetPath, 'utf-8')
    expect(content).toContain('stack "my-stack"')
  })

  test('4. --asset-kind library 写 .openxenon/assets/libraries/<name>.oxn', async () => {
    const r = await runCli(['work', 'create', 'my-library', '--type', 'asset', '--asset-kind', 'library', '--json'])
    expect(r.exitCode).toBe(0)
    const assetPath = join(tmpDir, '.openxenon', 'assets', 'libraries', 'my-library.oxn')
    expect(existsSync(assetPath)).toBe(true)
    const content = readFileSync(assetPath, 'utf-8')
    expect(content).toContain('library "my-library"')
  })

  test('5. --asset-kind external 写 .openxenon/assets/externals/<name>.oxn', async () => {
    const r = await runCli(['work', 'create', 'my-external', '--type', 'asset', '--asset-kind', 'external', '--json'])
    expect(r.exitCode).toBe(0)
    const assetPath = join(tmpDir, '.openxenon', 'assets', 'externals', 'my-external.oxn')
    expect(existsSync(assetPath)).toBe(true)
    const content = readFileSync(assetPath, 'utf-8')
    expect(content).toContain('external "my-external"')
  })

  test('6. --asset-kind invalid 抛 OXN_INVALID_ASSET_KIND', async () => {
    const r = await runCli(['work', 'create', 'foo', '--type', 'asset', '--asset-kind', 'invalid-kind', '--json'])
    expect(r.exitCode).not.toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.error.code).toBe('OXN_INVALID_ASSET_KIND')
  })

  test('7. 重复创建同 name 抛 OXN_ASSET_CREATE_FAILED (PATH_CONFLICT)（无 --force）', async () => {
    await runCli(['work', 'create', 'MyDomain', '--type', 'asset', '--asset-kind', 'domain', '--json'])
    const r2 = await runCli(['work', 'create', 'MyDomain', '--type', 'asset', '--asset-kind', 'domain', '--json'])
    expect(r2.exitCode).not.toBe(0)
    const json = JSON.parse(r2.stdout)
    expect(json.error.code).toBe('OXN_ASSET_CREATE_FAILED')
    expect(json.error.message).toContain('already exists')
  })

  test('8. --force 覆盖已存在', async () => {
    await runCli(['work', 'create', 'MyDomain', '--type', 'asset', '--asset-kind', 'domain', '--json'])
    const r2 = await runCli([
      'work',
      'create',
      'MyDomain',
      '--type',
      'asset',
      '--asset-kind',
      'domain',
      '--force',
      '--json',
    ])
    expect(r2.exitCode).toBe(0)
  })

  test('9. --type develop 走 Work 编排（不应创建 Asset）', async () => {
    // 注意：--type develop 且无 --asset-kind 时，blueprint 仍必传
    // 这里会因 blueprint 不存在而失败，但关键是不应创建 Asset
    await runCli(['work', 'create', 'feat-x', '--type', 'develop', '--blueprint', 'nonexistent', '--json'])
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'))).toBe(false)
  })
})
