/**
 * delete.test.ts — v0.6.1-alpha.1 Asset Lifecycle
 *
 * 验证 deleteAsset() 函数：物理删 + force + has-refs 守卫
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deleteAsset } from '../delete.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-delete-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
  )
}

describe('Asset.deleteAsset() 删除', () => {
  test('1. 孤儿 + --force → 物理删除 + 写审计 log', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.oxn'), 'domain "A" { term { "T": "t" } }\n')

    const result = await deleteAsset({ kind: 'domain', name: 'A', force: true, projectRoot: tmpDir })

    expect(result.ok).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.oxn'))).toBe(false)
    expect(result.logPath).toBeTruthy()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('2. 孤儿无 --force → 抛 IAPError FORCE_REQUIRED', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.oxn'), 'domain "A" { term { "T": "t" } }\n')

    expect(deleteAsset({ kind: 'domain', name: 'A', force: false, projectRoot: tmpDir })).rejects.toThrow(
      /requires --force/,
    )
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('3. 被引用 Asset + --force → 仍拒绝（ASSET_HAS_REFS 优先）', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.oxn'), 'domain "A" { term { "T": "t" } }\n')
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'B.oxn'),
      `domain "B" {
  references = ["A"]
  term { "T": "t" }
}\n`,
    )

    try {
      await deleteAsset({ kind: 'domain', name: 'A', force: true, projectRoot: tmpDir })
      throw new Error('Expected deleteAsset to throw')
    } catch (err) {
      expect((err as { name?: string }).name).toBe('IAP_INTENT_ASSET_HAS_REFS')
    }
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('4. 删除不存在 Asset → idempotent=true', async () => {
    setupProject()
    const result = await deleteAsset({ kind: 'domain', name: 'NonExist', force: true, projectRoot: tmpDir })
    expect(result.ok).toBe(true)
    expect(result.idempotent).toBe(true)
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
