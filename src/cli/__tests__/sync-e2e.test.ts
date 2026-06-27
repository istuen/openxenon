// =============================================================================
// sync-e2e.test.ts — v0.4 Phase 1 .oxn ↔ .md 同步子命令 e2e
//
// 覆盖 3 sync 子命令 (domain / blueprint / work) 的 4 类核心流程：
//   1. basic: .oxn → sync → .md 写出 + frontmatter 元数据正确
//   2. idempotent: 第二次 sync → all "unchanged"
//   3. dry-run: 不写文件 + 输出 updated 列表
//   4. hash drift: 改 .oxn → sync → .md 重生成
//
// RFC: .openxenon/pools/sprints/v0.4-unify-md/design/oxn-md-sync-rfc.md §2
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { computeSha256, readSyncMetadata } from '../../oxl/md-pipeline/sync-hash'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-sync-e2e-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
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
  const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  await init.exited
}

describe('oxn domain sync (Phase 1)', () => {
  test('basic: domain sync 写出 .md + 注入 sync frontmatter', async () => {
    await initProject()
    await runCli(['domain', 'create', 'OrderContext'])

    const r = await runCli(['domain', 'sync', 'OrderContext'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('updated:   1')

    const mdPath = join(tmpDir, '.openxenon', 'domains-md', 'OrderContext.md')
    expect(existsSync(mdPath)).toBe(true)

    const md = readFileSync(mdPath, 'utf-8')
    expect(md).toContain('oxn-source-sha:')
    expect(md).toContain('synced-at:')
    // md-self-sha 不写在 frontmatter (避免 chicken-egg) — 仅存于 .cache

    const meta = readSyncMetadata(mdPath)
    expect(meta?.oxnSourceSha).toMatch(/^[a-f0-9]{64}$/)
    expect(meta?.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('idempotent: 第二次 sync all unchanged', async () => {
    await initProject()
    await runCli(['domain', 'create', 'X'])

    const first = await runCli(['domain', 'sync', 'X'])
    expect(first.exitCode).toBe(0)

    const second = await runCli(['domain', 'sync', 'X'])
    expect(second.exitCode).toBe(0)
    expect(second.stdout).toContain('updated:   0')
    expect(second.stdout).toContain('unchanged: 1')
  })

  test('dry-run: 不写 .md', async () => {
    await initProject()
    await runCli(['domain', 'create', 'Y'])
    // v0.5 Phase 3: create 已自动 sync 到 .md — 删掉后再测 dry-run
    const mdPath = join(tmpDir, '.openxenon', 'domains-md', 'Y.md')
    if (existsSync(mdPath)) rmSync(mdPath)
    const cacheDir = join(tmpDir, '.openxenon', 'domains-md', '.cache')
    if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true })

    const r = await runCli(['domain', 'sync', 'Y', '--dry-run'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('updated:   1')
    expect(r.stdout).toContain('(dry-run)')

    expect(existsSync(mdPath)).toBe(false)
  })

  test('hash drift: 改 .oxn 后 sync 重生成 .md', async () => {
    await initProject()
    await runCli(['domain', 'create', 'Z'])

    const first = await runCli(['domain', 'sync', 'Z'])
    expect(first.exitCode).toBe(0)
    const firstMdSha = computeSha256(readFileSync(join(tmpDir, '.openxenon', 'domains-md', 'Z.md'), 'utf-8'))

    // 改 .oxn
    const oxnPath = join(tmpDir, '.openxenon', 'domains', 'Z.oxn')
    const oxnContent = readFileSync(oxnPath, 'utf-8')
    writeFileSync(oxnPath, `${oxnContent}\n// modified\n`, 'utf-8')

    const second = await runCli(['domain', 'sync', 'Z'])
    expect(second.exitCode).toBe(0)
    expect(second.stdout).toContain('updated:   1')

    const secondMdSha = computeSha256(readFileSync(join(tmpDir, '.openxenon', 'domains-md', 'Z.md'), 'utf-8'))
    expect(secondMdSha).not.toBe(firstMdSha)
  })

  test('--all: 处理多个 domain', async () => {
    await initProject()
    await runCli(['domain', 'create', 'A'])
    await runCli(['domain', 'create', 'B'])

    const r = await runCli(['domain', 'sync', '--all'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('updated:   2')
  })
})

describe('oxn blueprint sync (Phase 1)', () => {
  test('basic: blueprint sync 写出 .md', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'dev-workflow'])

    const r = await runCli(['blueprint', 'sync', 'dev-workflow'])
    expect(r.exitCode).toBe(0)

    const mdPath = join(tmpDir, '.openxenon', 'blueprints-md', 'dev-workflow.md')
    expect(existsSync(mdPath)).toBe(true)
    expect(readSyncMetadata(mdPath)).not.toBeNull()
  })

  test('idempotent: 第二次 sync unchanged', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'flow-x'])
    await runCli(['blueprint', 'sync', 'flow-x'])
    const second = await runCli(['blueprint', 'sync', 'flow-x'])
    expect(second.stdout).toContain('unchanged: 1')
  })
})

describe('oxn work sync (Phase 1)', () => {
  test('basic: work sync 写出 work.md', async () => {
    await initProject()
    // work 需要 blueprint
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runCli(['work', 'create', 'my-work', '--blueprint', 'dev-workflow'])

    const r = await runCli(['work', 'sync', 'my-work'])
    expect(r.exitCode).toBe(0)

    const mdPath = join(tmpDir, '.openxenon', 'works', 'my-work', 'work.md')
    expect(existsSync(mdPath)).toBe(true)
    expect(readSyncMetadata(mdPath)).not.toBeNull()
  })

  test('idempotent: 第二次 sync unchanged', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runCli(['work', 'create', 'w1', '--blueprint', 'dev-workflow'])
    await runCli(['work', 'sync', 'w1'])
    const second = await runCli(['work', 'sync', 'w1'])
    expect(second.stdout).toContain('unchanged: 1')
  })

  test('work sync --all 忽略 .cache 子目录', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runCli(['work', 'create', 'w-real', '--blueprint', 'dev-workflow'])

    // 手动创建一个 .cache 目录模拟 (不应被 sync 当作 work)
    const { mkdirSync } = await import('fs')
    mkdirSync(join(tmpDir, '.openxenon', 'works', '.cache'), { recursive: true })

    const r = await runCli(['work', 'sync', '--all'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('updated:   1')
    expect(r.stdout).not.toContain('.cache')
  })
})

describe('sync metadata consistency', () => {
  test('.cache/<name>.hash 等于 .md 文件的实际 SHA-256', async () => {
    await initProject()
    await runCli(['domain', 'create', 'Check'])

    await runCli(['domain', 'sync', 'Check'])
    const mdPath = join(tmpDir, '.openxenon', 'domains-md', 'Check.md')
    const cachePath = join(tmpDir, '.openxenon', 'domains-md', '.cache', 'Check.hash')
    const actualSha = computeSha256(readFileSync(mdPath, 'utf-8'))
    const cacheSha = readFileSync(cachePath, 'utf-8').trim()

    expect(cacheSha).toBe(actualSha)
  })
})
