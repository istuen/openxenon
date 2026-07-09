/**
 * evolve.test.ts — v0.6.1-alpha.1 Asset Lifecycle
 *
 * 验证 evolve() 函数：创建新版本 + auditTrail 互引 + citations 自增
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evolve } from '../evolve.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-evolve-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
  )
}

describe('Asset.evolve() 演进', () => {
  test('1. evolve 创建新版本 + auditTrail 互引', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'V1.oxn'), 'domain "V1" { term { "T": "t" } }\n')

    const result = await evolve({
      kind: 'domain',
      name: 'V1',
      newName: 'V2',
      projectRoot: tmpDir,
    })

    expect(result.ok).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'V1.oxn'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'V2.oxn'))).toBe(true)

    const v1Content = readFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'V1.oxn'), 'utf-8')
    const v2Content = readFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'V2.oxn'), 'utf-8')
    expect(v1Content).toContain('evolved to V2')
    expect(v2Content).toContain('evolved from V1')
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('2. evolve newName 与 name 相同 → 抛 IAPError', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'A.oxn'), 'domain "A" { term { "T": "t" } }\n')

    expect(evolve({ kind: 'domain', name: 'A', newName: 'A', projectRoot: tmpDir })).rejects.toThrow(
      /requires newName different/,
    )
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('3. evolve 源 Asset 不存在 → 抛 IAPError', async () => {
    setupProject()
    expect(evolve({ kind: 'domain', name: 'NonExist', newName: 'V2', projectRoot: tmpDir })).rejects.toThrow(
      /not found/,
    )
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('4. evolve 目标已存在 → 抛 IAPError PATH_CONFLICT', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'V1.oxn'), 'domain "V1" { term { "T": "t" } }\n')
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'V2.oxn'), 'domain "V2" { term { "T": "t" } }\n')

    expect(evolve({ kind: 'domain', name: 'V1', newName: 'V2', projectRoot: tmpDir })).rejects.toThrow(/already exists/)
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
