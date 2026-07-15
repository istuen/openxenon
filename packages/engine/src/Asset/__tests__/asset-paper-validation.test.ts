/**
 * asset-paper-validation.test.ts — v0.6.1-alpha.1 AssetPaper 4 字段强校验 (PR-2)
 *
 * 验证 validateAssetPaper4Fields 函数
 * - 4 字段缺失检测（abstract / references / citations / auditTrail）
 * - strict 模式抛 IAPError
 * - fail-open 模式仅 warn
 *
 * 测试使用 .md canonical 资产（v0.7.0 起 .oxn 视为废弃输入）
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateAssetPaper4Fields } from '../validate.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-paper-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({ version: 1, mode: 'PRODUCTION', locale: 'zh-CN' }),
  )
}

describe('validateAssetPaper4Fields 4 字段校验', () => {
  test('1. 完整 4 字段 → ok=true + 0 warnings', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'Complete.md'),
      `---
entity: domain
name: Complete
abstract: "完整业务边界"
references: []
citations: 0
auditTrail: "created at 2026-07-09"
---

# Domain: Complete

## Terms

### T

t
`,
    )
    const result = await validateAssetPaper4Fields(tmpDir, 'domain', 'Complete', false)
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.fields.abstract).toBe('完整业务边界')
    expect(result.fields.references).toEqual([])
    expect(result.fields.citations).toBe(0)
    expect(result.fields.auditTrail).toContain('created at 2026-07-09')
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('2. 缺 abstract → fail-open warn', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'NoAbstract.md'),
      `---
entity: domain
name: NoAbstract
---

# Domain: NoAbstract

## Terms

### T

t
`,
    )
    const result = await validateAssetPaper4Fields(tmpDir, 'domain', 'NoAbstract', false)
    expect(result.ok).toBe(false)
    expect(result.warnings.some((w) => w.includes('abstract'))).toBe(true)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('3. 缺 references + citations → fail-open 多个 warn', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'NoRefCit.md'),
      `---
entity: domain
name: NoRefCit
abstract: test
---

# Domain: NoRefCit

## Terms

### T

t
`,
    )
    const result = await validateAssetPaper4Fields(tmpDir, 'domain', 'NoRefCit', false)
    expect(result.ok).toBe(false)
    expect(result.warnings.some((w) => w.includes('references'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('citations'))).toBe(true)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('4. strict=true 缺 abstract → 抛 IAP_INTENT_INCOMPLETE_ASSET_PAPER', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'Incomplete.md'),
      `---
entity: domain
name: Incomplete
---

# Domain: Incomplete

## Terms

### T

t
`,
    )
    try {
      await validateAssetPaper4Fields(tmpDir, 'domain', 'Incomplete', true)
      throw new Error('Expected to throw')
    } catch (err) {
      expect((err as { name?: string }).name).toBe('IAP_INTENT_INCOMPLETE_ASSET_PAPER')
    }
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
