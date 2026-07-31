/**
 * migrate-diff.test.ts — I-5b 回归测试
 *
 * 验证 oxn asset 新增的 migrate 和 diff 命令。
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrate } from '../migrate.js'
import { diff } from '../diff.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-i5b-'))
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'), { recursive: true })
}

function teardown(): void {
  rmSync(tmpDir, { recursive: true, force: true })
}

describe('I-5b: oxn asset migrate', () => {
  test('1. 升 frontmatter version', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'old.md'),
      `---
entity: domain
version: 0.2.0
name: old
---
# Domain: old

## Terms
### term-a
- desc: example
`,
    )
    const result = await migrate({
      kind: 'domain',
      name: 'old',
      targetVersion: '0.4.0',
      projectRoot: tmpDir,
    })
    expect(result.ok).toBe(true)
    expect(result.idempotent).toBe(false)
    expect(result.oldVersion).toBe('0.2.0')
    expect(result.newVersion).toBe('0.4.0')

    // 验证文件 version 已更新
    const updated = readFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'old.md'), 'utf-8')
    expect(updated).toContain('version: 0.4.0')
    expect(updated).toContain('# Domain: old')
    expect(updated).toContain('## Terms')
    teardown()
  })

  test('2. 已是目标版本 → idempotent=true', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'same.md'),
      `---
entity: domain
version: 0.4.0
name: same
---
# Domain: same
`,
    )
    const result = await migrate({
      kind: 'domain',
      name: 'same',
      targetVersion: '0.4.0',
      projectRoot: tmpDir,
    })
    expect(result.ok).toBe(true)
    expect(result.idempotent).toBe(true)
    teardown()
  })

  test('3. 降版本（targetVersion < oldVersion）→ IAPError', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'newer.md'),
      `---
entity: domain
version: 0.4.0
name: newer
---
# Domain: newer
`,
    )
    await expect(
      migrate({
        kind: 'domain',
        name: 'newer',
        targetVersion: '0.2.0',
        projectRoot: tmpDir,
      }),
    ).rejects.toThrow(/older than current/)
    teardown()
  })

  test('4. 文件不存在 → IAPError PATH_CONFLICT', async () => {
    setupProject()
    await expect(
      migrate({
        kind: 'domain',
        name: 'ghost',
        targetVersion: '0.4.0',
        projectRoot: tmpDir,
      }),
    ).rejects.toThrow(/not found/)
    teardown()
  })

  test('5. 写 audit log 到 _migrate-log.jsonl', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'logged.md'),
      `---
entity: domain
version: 0.2.0
name: logged
---
# Domain: logged
`,
    )
    await migrate({
      kind: 'domain',
      name: 'logged',
      targetVersion: '0.4.0',
      projectRoot: tmpDir,
    })
    const logPath = join(tmpDir, '.openxenon', '.archived', '_migrate-log.jsonl')
    expect(existsSync(logPath)).toBe(true)
    const log = readFileSync(logPath, 'utf-8')
    expect(log).toContain('logged')
    expect(log).toContain('0.2.0')
    expect(log).toContain('0.4.0')
    teardown()
  })
})

describe('I-5b: oxn asset diff', () => {
  test('6. 项目不存在 + builtin 不存在 → ok=false', async () => {
    setupProject()
    const result = await diff({
      kind: 'blueprint',
      name: 'nonexistent',
      projectRoot: tmpDir,
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('does not exist')
    teardown()
  })

  test('7. 项目不存在 + builtin 存在 → ok=true, hasOverride=false', async () => {
    setupProject()
    // builtin blueprint 'verify-pipeline' 存在于 src/builtin/blueprints/
    const result = await diff({
      kind: 'blueprint',
      name: 'verify-pipeline',
      projectRoot: tmpDir,
    })
    expect(result.ok).toBe(true)
    expect(result.hasBuiltin).toBe(true)
    expect(result.hasOverride).toBe(false)
    teardown()
  })

  test('8. 项目存在 + builtin 不存在 → hasOverride=true, hasBuiltin=false', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'blueprints', 'custom.md'),
      `---
entity: blueprint
name: custom
---
# Blueprint: custom
`,
    )
    const result = await diff({
      kind: 'blueprint',
      name: 'custom',
      projectRoot: tmpDir,
    })
    expect(result.ok).toBe(true)
    expect(result.hasOverride).toBe(true)
    expect(result.hasBuiltin).toBe(false)
    teardown()
  })

  test('9. 项目覆盖 builtin 且内容不同 → unified diff', async () => {
    setupProject()
    mkdirSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'blueprints', 'verify-pipeline.md'),
      `---
entity: blueprint
name: verify-pipeline
---
# Blueprint: verify-pipeline
MODIFIED CONTENT
`,
    )
    const result = await diff({
      kind: 'blueprint',
      name: 'verify-pipeline',
      projectRoot: tmpDir,
      format: 'unified',
    })
    expect(result.ok).toBe(true)
    expect(result.hasOverride).toBe(true)
    expect(typeof result.diff).toBe('string')
    const diffStr = result.diff as string
    expect(diffStr).toContain('--- builtin')
    expect(diffStr).toContain('+++ project')
    expect(diffStr).toContain('MODIFIED CONTENT')
    teardown()
  })

  test('10. 项目与 builtin 完全相同 → hasOverride=false, diff=""', async () => {
    setupProject()
    mkdirSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'), { recursive: true })
    // 读 builtin 内容，原样复制
    const builtinPath = join(process.cwd(), 'src/builtin/blueprints/verify-pipeline.md')
    if (existsSync(builtinPath)) {
      const builtinContent = readFileSync(builtinPath, 'utf-8')
      writeFileSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'verify-pipeline.md'), builtinContent)
      const result = await diff({
        kind: 'blueprint',
        name: 'verify-pipeline',
        projectRoot: tmpDir,
      })
      expect(result.ok).toBe(true)
      expect(result.hasOverride).toBe(false)
      expect(result.diff).toBe('')
    }
    teardown()
  })
})
