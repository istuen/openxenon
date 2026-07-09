/**
 * archive.test.ts — v0.6.1-alpha.1 Asset Lifecycle
 *
 * 验证 archive() 函数：move .oxn + .md 到 .archived/ + metadata.json
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { archive } from '../archive.js'
import { resolveArchivedAssetFile, resolveArchivedMetadataFile } from '../internal/archived-resolver.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-archive-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
  )
}

describe('Asset.archive() 归档', () => {
  test('1. archive 孤儿 Asset → 移到 .archived/ + 写 metadata.json', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'MyDomain.oxn'),
      'domain "MyDomain" { term { "T": "t" } }\n',
    )

    const result = await archive({
      kind: 'domain',
      name: 'MyDomain',
      reason: 'deprecated',
      projectRoot: tmpDir,
    })

    expect(result.ok).toBe(true)
    expect(result.idempotent).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'MyDomain.oxn'))).toBe(false)
    expect(existsSync(resolveArchivedAssetFile(tmpDir, 'domain', 'MyDomain', 'oxn'))).toBe(true)

    const metaPath = resolveArchivedMetadataFile(tmpDir, 'domain', 'MyDomain')
    expect(existsSync(metaPath)).toBe(true)
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
    expect(meta.reason).toBe('deprecated')
    expect(meta.planLockReadOnly).toBe(true)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('2. archive 同时移 .md 镜像', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.oxn'), 'domain "A" { term { "T": "t" } }\n')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.md'), '# Domain: A\n')

    const result = await archive({
      kind: 'domain',
      name: 'A',
      reason: 'moved to archived',
      projectRoot: tmpDir,
    })

    expect(result.ok).toBe(true)
    expect(existsSync(resolveArchivedAssetFile(tmpDir, 'domain', 'A', 'md'))).toBe(true)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('3. archive 被引用 Asset → 抛 IAPError', async () => {
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
      await archive({
        kind: 'domain',
        name: 'A',
        reason: 'test',
        projectRoot: tmpDir,
      })
      throw new Error('Expected archive to throw')
    } catch (err) {
      expect((err as { name?: string }).name).toBe('IAP_INTENT_ASSET_HAS_REFS')
    }
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('4. archive 不存在 Asset → 抛 IAPError PATH_CONFLICT', async () => {
    setupProject()
    expect(
      archive({
        kind: 'domain',
        name: 'NonExist',
        reason: 'test',
        projectRoot: tmpDir,
      }),
    ).rejects.toThrow(/not found/)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('5. archive 已归档 Asset → idempotent=true 不报错', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.oxn'), 'domain "A" { term { "T": "t" } }\n')

    const first = await archive({ kind: 'domain', name: 'A', reason: 'r1', projectRoot: tmpDir })
    expect(first.ok).toBe(true)
    expect(first.idempotent).toBe(false)

    const second = await archive({ kind: 'domain', name: 'A', reason: 'r2', projectRoot: tmpDir })
    expect(second.ok).toBe(true)
    expect(second.idempotent).toBe(true)
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
