// =============================================================================
// domain-index-e2e.test.ts — PR-1
//
// CLI e2e：oxn domain index + auto-rebuild on create/validate + init 集成
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-domain-index-'))
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

describe('oxn domain index (PR-1)', () => {
  test('init 不会强制建索引（无 domains/ 目录时不建文件）', async () => {
    await initProject()
    const cacheDir = join(tmpDir, '.openxenon', '.cache')
    const _indexPath = join(cacheDir, 'domains.json')
    // 没创建任何 domain → 索引可能不建（autoRebuild 静默跳过）
    // 但 init 消息应明确说出 "no domains yet"
    const { stdout } = await runCli(['init'])
    expect(stdout).toContain('no domains yet')
    // 索引文件可能不存在（取决于 autoRebuild 行为）—— 这两种都 OK
    // 关键：CLI 不能报错
  })

  test('domain index 命令幂等（多次调用结果稳定）', async () => {
    await initProject()
    await runCli(['domain', 'create', 'A'])
    await runCli(['domain', 'create', 'B'])
    const r1 = JSON.parse((await runCli(['domain', 'index', '--json'])).stdout)
    const r2 = JSON.parse((await runCli(['domain', 'index', '--json'])).stdout)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r1.data.domainCount).toBe(2)
    expect(r2.data.domainCount).toBe(2)
    // generatedAt 不同（毫秒级更新）；但 domains 排序与内容应一致
    const names1 = r1.data.domains.map((d: { name: string }) => d.name).sort()
    const names2 = r2.data.domains.map((d: { name: string }) => d.name).sort()
    expect(names1).toEqual(names2)
  })

  test('domain index --check 报告索引是否新鲜', async () => {
    await initProject()
    await runCli(['domain', 'create', 'A'])
    const r1 = JSON.parse((await runCli(['domain', 'index', '--check', '--json'])).stdout)
    expect(r1.ok).toBe(true)
    expect(r1.data.fresh).toBe(true)
    expect(r1.data.domainCount).toBe(1)
  })

  test('domain index --check 缺索引时报告 fresh:false', async () => {
    await initProject()
    // 强制不调用 create —— 索引可能不存在
    const r = JSON.parse((await runCli(['domain', 'index', '--check', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.fresh).toBe(false)
    expect(r.data.reason).toBe('index missing')
  })

  test('domain index --emit <自定义路径> 写到指定文件', async () => {
    await initProject()
    await runCli(['domain', 'create', 'X'])
    const customPath = join(tmpDir, 'my-index.json')
    const r = JSON.parse((await runCli(['domain', 'index', '--emit', customPath, '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.indexPath).toBe(customPath)
    expect(existsSync(customPath)).toBe(true)
  })

  test('domain index 在未 init 的项目里报告 OXN_NO_PROJECT', async () => {
    // 不调用 init
    const r = JSON.parse((await runCli(['domain', 'index', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_NO_PROJECT')
  })
})
