// =============================================================================
// domain-cache-clean-e2e.test.ts — v0.6.1-alpha.0 #1-16 (Phase A.3)
//
// 覆盖 `oxn domain cache clean` 子命令的 3 类核心场景：
//   1. basic: 删除 .cache/*.hash + .cache/*.md-hash 但保留 .oxn
//   2. idempotent: 第二次 clean → 0 removed (no error)
//   3. empty: 没 cache 时返 "No domain cache to clean" 而不报错
//   + dry-run 测
//
// 路径布局：v0.6 默认 .openxenon/assets/domains/.cache/<name>.hash
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-domain-cache-clean-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
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
  const proc = Bun.spawn(['bun', CLI_PATH, 'init'], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  await proc.exited
}

/** 写 v0.6 默认布局的 config (assetRoot=assets, 无 assetDirs) */
async function setV6Layout(): Promise<void> {
  const configPath = join(tmpDir, '.openxenon', 'config.json')
  writeFileSync(configPath, JSON.stringify({ version: 1, mode: 'PRODUCTION', assetRoot: 'assets' }, null, 2), 'utf-8')
}

/** 手动写一个 domain + 它的 .cache 文件 */
function seedDomain(name: string): { oxnPath: string; hashPath: string; mdHashPath: string } {
  const domainsDir = join(tmpDir, '.openxenon', 'assets', 'domains')
  const cacheDir = join(domainsDir, '.cache')
  mkdirSync(cacheDir, { recursive: true })
  const oxnPath = join(domainsDir, `${name}.md`)
  writeFileSync(
    oxnPath,
    `domain "${name}" {\n  term { "TODO_Term": "TODO" }\n  ban { "TODO_BannedTerm" }\n  invariant { "TODO" }\n}\n`,
    'utf-8',
  )
  const hashPath = join(cacheDir, `${name}.hash`)
  const mdHashPath = join(cacheDir, `${name}.md-hash`)
  writeFileSync(hashPath, 'fake-source-sha-1234\n', 'utf-8')
  writeFileSync(mdHashPath, 'fake-md-sha-5678\n', 'utf-8')
  return { oxnPath, hashPath, mdHashPath }
}

describe('oxn domain cache clean (v0.6.1-alpha.0 #1-16)', () => {
  test('1. basic: cache clean 删 .cache/*.hash + *.md-hash 但保留 .oxn', async () => {
    await initProject()
    await setV6Layout()
    const seeded = seedDomain('Member')

    const r = await runCli(['domain', 'cache', 'clean', '--json'])
    expect(r.exitCode).toBe(0)

    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.removed).toBe(2) // 1 .hash + 1 .md-hash
    expect(json.data.paths.length).toBe(2)

    // .cache/*.hash 应已删
    expect(existsSync(seeded.hashPath)).toBe(false)
    expect(existsSync(seeded.mdHashPath)).toBe(false)
    // .oxn 应保留
    expect(existsSync(seeded.oxnPath)).toBe(true)
  })

  test('2. idempotent: 第二次 clean → 0 removed (无错)', async () => {
    await initProject()
    await setV6Layout()
    seedDomain('Member')

    const first = await runCli(['domain', 'cache', 'clean', '--json'])
    expect(first.exitCode).toBe(0)
    expect(JSON.parse(first.stdout).data.removed).toBe(2)

    // 第二次：cache 已空
    const second = await runCli(['domain', 'cache', 'clean', '--json'])
    expect(second.exitCode).toBe(0)
    expect(JSON.parse(second.stdout).data.removed).toBe(0)
  })

  test('3. empty: 无 .cache/ 目录 → 返 "No domain cache to clean"', async () => {
    await initProject()
    await setV6Layout()
    // 不 seed domain / cache

    // human 模式 (无 --json)
    const r = await runCli(['domain', 'cache', 'clean'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('No domain cache to clean')

    // JSON 模式
    const r2 = await runCli(['domain', 'cache', 'clean', '--json'])
    expect(r2.exitCode).toBe(0)
    const json = JSON.parse(r2.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.removed).toBe(0)
    expect(json.data.cacheDir).toBe(null)
  })

  test('4. dry-run: 列出但删除 .hash 文件', async () => {
    await initProject()
    await setV6Layout()
    const seeded = seedDomain('Member')

    const r = await runCli(['domain', 'cache', 'clean', '--dry-run', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.dryRun).toBe(true)
    expect(json.data.wouldRemove).toBe(2)

    // dry-run 后文件应仍在
    expect(existsSync(seeded.hashPath)).toBe(true)
    expect(existsSync(seeded.mdHashPath)).toBe(true)
  })

  test('5. 多 domain: 一次清多个域的 cache', async () => {
    await initProject()
    await setV6Layout()
    seedDomain('A')
    seedDomain('B')
    seedDomain('C')

    const r = await runCli(['domain', 'cache', 'clean', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.removed).toBe(6) // 3 域 × 2 (hash + md-hash)

    const cacheDir = join(tmpDir, '.openxenon', 'assets', 'domains', '.cache')
    // cache 目录本身保留 (下次 sync 复用)
    expect(existsSync(cacheDir)).toBe(true)
    // 但里面没文件
    expect(readdirSync(cacheDir)).toEqual([])
  })
})
