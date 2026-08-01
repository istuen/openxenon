/**
 * validate.test.ts — Asset validate use case tests (I-3 hotfix)
 *
 * 验证 validate() 调用 5 类 kind-specific compiler dispatch：
 * - 故意构造 invalid Asset（缺 H1）应报错 E_MD_H1_MISSING
 * - 故意构造 duplicate H3 应报错 E_MD_DUPLICATE_H3
 * - 5 类 kind 都覆盖
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validate } from '../validate.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-validate-'))
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

describe('Asset.validate() 5-way compiler dispatch（I-3 hotfix 回归测试）', () => {
  test('1. domain Asset 缺 H1 → E_MD_H1_MISSING', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'no-h1.md'),
      '---\nentity: domain\n---\n## Terms\n- foo\n',
    )
    const result = await validate({ kind: 'domain', name: 'no-h1', projectRoot: tmpDir })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('E_MD_H1_MISSING'))).toBe(true)
    teardown()
  })

  test('2. domain Asset H3 重复 → E_MD_DUPLICATE_H3', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'dup-h3.md'),
      `---
entity: domain
---
# Domain: dup-h3
## Terms

### term-a
- desc: first

### term-a
- desc: duplicate
`,
    )
    const result = await validate({ kind: 'domain', name: 'dup-h3', projectRoot: tmpDir })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('E_MD_DUPLICATE_H3'))).toBe(true)
    teardown()
  })

  test('3. workflow Asset 缺 H1 → E_MD_H1_MISSING', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'workflows', 'no-h1.md'),
      '---\nentity: workflow\n---\n## Slots\n### s\n',
    )
    const result = await validate({ kind: 'workflow', name: 'no-h1', projectRoot: tmpDir })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('E_MD_H1_MISSING'))).toBe(true)
    teardown()
  })

  test('4. blueprint Asset 合法（结构层面）→ ok=true', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'blueprints', 'valid.md'),
      `---
entity: blueprint
name: valid
---
# Blueprint: valid
`,
    )
    const result = await validate({ kind: 'blueprint', name: 'valid', projectRoot: tmpDir })
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    teardown()
  })

  test('5. roadmap Asset 含 ## Scenes + ## Usage + ## Scene quick-reference → ok=true', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'assetmaps', 'multi-h2.md'),
      `---
entity: roadmap
name: multi-h2
---
# Roadmap: multi-h2

## Scenes
### scene-a
- description: test

## Usage
descriptive text

## Scene quick-reference
descriptive text
`,
    )
    const result = await validate({ kind: 'roadmap', name: 'multi-h2', projectRoot: tmpDir })
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    teardown()
  })

  test('6. stack Asset 缺 H1 → E_MD_H1_MISSING', async () => {
    setupProject()
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'stacks', 'no-h1.md'), '---\nentity: stack\n---\n## Tools\n')
    const result = await validate({ kind: 'stack', name: 'no-h1', projectRoot: tmpDir })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('E_MD_H1_MISSING'))).toBe(true)
    teardown()
  })
})
