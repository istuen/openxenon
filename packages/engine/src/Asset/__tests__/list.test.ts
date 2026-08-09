/**
 * list.test.ts — Asset list use case tests (v0.6.2 hotfix)
 *
 * 验证 list() 和 listAll() 行为：
 * - list({kind}) 按指定 kind 返回该目录下的 .md 文件
 * - listAll() 必须返回 5 类 AssetKind（domain / workflow / stack / blueprint / assetmap）
 *   — bug fix：v0.6.2 listAll 硬编码只扫 3 类，遗漏 workflow + assetmap
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { list, listAll } from '../list.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-list-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
  )
  for (const kind of ['domains', 'workflows', 'stacks', 'blueprints', 'assetmaps']) {
    mkdirSync(join(tmpDir, '.openxenon', 'assets', kind), { recursive: true })
  }
}

function teardown(): void {
  rmSync(tmpDir, { recursive: true, force: true })
}

describe('Asset.list({kind}) 单 kind 列举', () => {
  test('1. 列 domain 目录下的 .md 文件', () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'a.md'), '---\nentity: domain\n---\n# A')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'b.md'), '---\nentity: domain\n---\n# B')
    const result = list({ kind: 'domain', projectRoot: tmpDir })
    expect(result.assets.length).toBe(2)
    expect(result.assets.map((a) => a.name).sort()).toEqual(['a', 'b'])
    expect(result.assets.every((a) => a.kind === 'domain')).toBe(true)
    teardown()
  })

  test('2. 目录不存在时返回空数组', () => {
    setupProject()
    const result = list({ kind: 'workflow', projectRoot: tmpDir })
    expect(result.assets).toEqual([])
    teardown()
  })
})

describe('Asset.listAll() 全 kind 列举（hotfix 回归测试）', () => {
  test('3. listAll 必须覆盖 5 类 AssetKind（bug fix：v0.6.2 漏 workflow/assetmap）', () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'd1.md'), 'a')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'workflows', 'w1.md'), 'b')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'workflows', 'w2.md'), 'c')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'stacks', 's1.md'), 'd')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'b1.md'), 'e')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'assetmaps', 'r1.md'), 'f')

    const result = listAll(tmpDir)
    expect(result.assets.length).toBe(6)

    const kinds = new Set(result.assets.map((a) => a.kind))
    expect(kinds.has('domain')).toBe(true)
    expect(kinds.has('workflow')).toBe(true)
    expect(kinds.has('stack')).toBe(true)
    expect(kinds.has('blueprint')).toBe(true)
    expect(kinds.has('assetmap')).toBe(true)
    expect(kinds.size).toBe(5)
    teardown()
  })

  test('4. listAll 空项目返回空数组（不报错）', () => {
    setupProject()
    const result = listAll(tmpDir)
    expect(result.assets).toEqual([])
    teardown()
  })
})
