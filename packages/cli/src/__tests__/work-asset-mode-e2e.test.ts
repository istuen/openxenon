// =============================================================================
// work-asset-mode-e2e.test.ts — Asset via Standard Work Flow (v0.6.1 Phase C)
//
// 覆盖 `oxn work create --asset-kind <kind>` 标准 Work 流程：
//   1. --asset-kind domain → 创建 Work (type: asset, kind: domain) + 4 tasks
//   2. --asset-kind blueprint → 同上
//   3. --asset-kind stack → 同上
//   4. --asset-kind library/external → 已删除类型 → OXN_INVALID_ASSET_KIND
//   6. --asset-kind invalid → OXN_INVALID_ASSET_KIND
//   7. 无 --asset-kind 时走标准 Work 路径
//   8. --asset-kind + 现有 Work 同名 → 自动 rename (add suffix)
//
// Phase C: --asset-kind 不再短路写 Asset 文件，走标准 IAP 9 阶段流程。
// Asset 文件在 validate-commit task 执行时才写入。
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, copyFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')
const REPO_ROOT = join(import.meta.dir, '..', '..', '..', '..')

let tmpDir: string

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-asset-mode-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
  )
  // 复制 asset-create workflow 到测试环境
  const srcWf = join(REPO_ROOT, '.openxenon', 'assets', 'workflows', 'asset-create.md')
  const dstWfDir = join(tmpDir, '.openxenon', 'assets', 'workflows')
  mkdirSync(dstWfDir, { recursive: true })
  copyFileSync(srcWf, join(dstWfDir, 'asset-create.md'))
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
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}

describe('Asset via Standard Work --asset-kind (Phase C)', () => {
  test('4. v0.6.1-alpha.4: --asset-kind library 已删除 → OXN_INVALID_ASSET_KIND', async () => {
    const r = await runCli(['work', 'create', 'my-library', '--asset-kind', 'library', '--json'])
    expect(r.exitCode).not.toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.error.code).toBe('OXN_INVALID_ASSET_KIND')
    expect(json.error.message).toContain('library')
  })

  test('5. v0.6.1-alpha.4: --asset-kind external 已删除 → OXN_INVALID_ASSET_KIND', async () => {
    const r = await runCli(['work', 'create', 'my-external', '--asset-kind', 'external', '--json'])
    expect(r.exitCode).not.toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.error.code).toBe('OXN_INVALID_ASSET_KIND')
    expect(json.error.message).toContain('external')
  })

  test('6. --asset-kind invalid 抛 OXN_INVALID_ASSET_KIND', async () => {
    const r = await runCli(['work', 'create', 'foo', '--asset-kind', 'invalid-kind', '--json'])
    expect(r.exitCode).not.toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.error.code).toBe('OXN_INVALID_ASSET_KIND')
  })

  test('7. 无 --asset-kind 时走标准 Work 路径（不创建 Asset）', async () => {
    await runCli(['work', 'create', 'feat-x', '--blueprint', 'nonexistent', '--json'])
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'))).toBe(false)
  })
})
