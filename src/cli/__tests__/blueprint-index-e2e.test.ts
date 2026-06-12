// =============================================================================
// blueprint-index-e2e.test.ts — PR-X
//
// CLI e2e：oxn blueprint index + auto-rebuild on create/validate + init 集成
// + list 优先读索引（缺失时降级 dir 扫描）
//
// 与 domain-index-e2e.test.ts 对称设计（PR-X：与 PR-1 同源）。
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-blueprint-index-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

async function runCli(args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  return { stdout, exitCode }
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

describe('oxn blueprint index (PR-X)', () => {
  test('init 不会强制建索引（无 blueprints/ 目录时不建文件）', async () => {
    await initProject()
    const { stdout } = await runCli(['init'])
    // init 消息应明确说出 "no blueprints yet"
    expect(stdout).toContain('no blueprints yet')
  })

  test('blueprint create 后自动落 .openxenon/.cache/blueprints.json', async () => {
    await initProject()
    const r = await runCli(['blueprint', 'create', 'dev-workflow'])
    expect(r.exitCode).toBe(0)
    const indexPath = join(tmpDir, '.openxenon', '.cache', 'blueprints.json')
    expect(existsSync(indexPath)).toBe(true)
    const idx = JSON.parse(readFileSync(indexPath, 'utf-8'))
    expect(idx.schemaVersion).toBe(1)
    expect(idx.blueprintCount).toBe(1)
    expect(idx.blueprints[0].name).toBe('dev-workflow')
    expect(idx.blueprints[0].status).toBe('ok')
    expect(idx.blueprints[0].version).toBe(1)
  })

  test('blueprint index 命令幂等（多次调用结果稳定）', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'pipeline-a'])
    await runCli(['blueprint', 'create', 'pipeline-b'])
    const r1 = JSON.parse((await runCli(['blueprint', 'index', '--json'])).stdout)
    const r2 = JSON.parse((await runCli(['blueprint', 'index', '--json'])).stdout)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r1.data.blueprintCount).toBe(2)
    expect(r2.data.blueprintCount).toBe(2)
    const names1 = r1.data.blueprints.map((b: { name: string }) => b.name).sort()
    const names2 = r2.data.blueprints.map((b: { name: string }) => b.name).sort()
    expect(names1).toEqual(names2)
  })

  test('blueprint index --check 报告索引是否新鲜', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'bp-a'])
    const r1 = JSON.parse((await runCli(['blueprint', 'index', '--check', '--json'])).stdout)
    expect(r1.ok).toBe(true)
    expect(r1.data.fresh).toBe(true)
    expect(r1.data.blueprintCount).toBe(1)
  })

  test('blueprint index --check 缺索引时报告 fresh:false', async () => {
    await initProject()
    const r = JSON.parse((await runCli(['blueprint', 'index', '--check', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.fresh).toBe(false)
    expect(r.data.reason).toBe('index missing')
  })

  test('blueprint validate 成功后也触发 auto-rebuild', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'bp-a'])
    const indexPath = join(tmpDir, '.openxenon', '.cache', 'blueprints.json')
    rmSync(indexPath)
    expect(existsSync(indexPath)).toBe(false)
    const r = await runCli(['blueprint', 'validate', 'bp-a'])
    expect(r.exitCode).toBe(0)
    expect(existsSync(indexPath)).toBe(true)
    const idx = JSON.parse(readFileSync(indexPath, 'utf-8'))
    expect(idx.blueprintCount).toBe(1)
    expect(idx.blueprints[0].name).toBe('bp-a')
  })

  test('blueprint index --emit <自定义路径> 写到指定文件', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'bp-x'])
    const customPath = join(tmpDir, 'my-bp-index.json')
    const r = JSON.parse((await runCli(['blueprint', 'index', '--emit', customPath, '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.indexPath).toBe(customPath)
    expect(existsSync(customPath)).toBe(true)
  })

  test('blueprint index 在未 init 的项目里报告 OXN_NO_PROJECT', async () => {
    const r = JSON.parse((await runCli(['blueprint', 'index', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_NO_PROJECT')
  })
})

describe('oxn blueprint list (PR-X: 走索引)', () => {
  test('list 优先读 .cache/blueprints.json 索引（data.source="index"）', async () => {
    await initProject()
    await runCli(['blueprint', 'create', 'pipeline-a'])
    await runCli(['blueprint', 'create', 'pipeline-b'])
    const r = JSON.parse((await runCli(['blueprint', 'list', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.source).toBe('index')
    expect(r.data.blueprints).toHaveLength(2)
    const names = r.data.blueprints.map((b: { name: string }) => b.name).sort()
    expect(names).toEqual(['pipeline-a', 'pipeline-b'])
  })

  test('list 索引缺失时降级 dir 扫描（data.source="dir"）', async () => {
    await initProject()
    // 不调 create —— 索引可能不存在
    // 但手建 .openxenon/blueprints/ + .oxn 文件模拟老项目
    const blueprintsDir = join(tmpDir, '.openxenon', 'blueprints')
    mkdirSync(blueprintsDir, { recursive: true })
    writeFileSync(join(blueprintsDir, 'legacy.oxn'), `blueprint "legacy" { version = 1; description = "old style" }`)
    // 确保索引不存在
    const indexPath = join(tmpDir, '.openxenon', '.cache', 'blueprints.json')
    if (existsSync(indexPath)) rmSync(indexPath)

    const r = JSON.parse((await runCli(['blueprint', 'list', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.source).toBe('dir')
    expect(r.data.blueprints).toEqual(['legacy'])
  })

  test('list 索引不存在的目录下：空 dir 扫描', async () => {
    await initProject()
    // 没建任何 blueprint；blueprints/ 目录可能不存在
    const r = JSON.parse((await runCli(['blueprint', 'list', '--json'])).stdout)
    expect(r.ok).toBe(true)
    // data.source 可能是 'index'（如果 init 建了空索引）也可能是 'dir'
    expect(r.data.blueprints).toEqual([])
  })
})
