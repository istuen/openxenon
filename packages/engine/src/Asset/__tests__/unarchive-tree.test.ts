/**
 * unarchive-tree.test.ts — I-5 fix 回归测试
 *
 * 验证 oxn asset 新增的 unarchive 和 tree 命令：
 * - unarchive: archive 的反向操作（mv .md 回 active 目录）
 * - tree: 展示 Asset 依赖图（forward + reverse）
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { archive } from '../archive.js'
import { unarchive } from '../unarchive.js'
import { tree } from '../tree.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-i5-'))
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'workflows'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'), { recursive: true })
}

function teardown(): void {
  rmSync(tmpDir, { recursive: true, force: true })
}

describe('I-5a: oxn asset unarchive', () => {
  test('1. archive → unarchive roundtrip 恢复 .md', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'roundtrip.md'),
      '---\nentity: domain\n---\n# Domain: roundtrip\n',
    )

    await archive({
      kind: 'domain',
      name: 'roundtrip',
      reason: 'test',
      projectRoot: tmpDir,
    })

    // Archive 后 active 文件不在
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'roundtrip.md'))).toBe(false)

    // Unarchive
    const result = await unarchive({
      kind: 'domain',
      name: 'roundtrip',
      projectRoot: tmpDir,
    })

    expect(result.ok).toBe(true)
    expect(result.idempotent).toBe(false)
    expect(existsSync(result.restoredPath)).toBe(true)
    // active 路径再次存在
    expect(existsSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'roundtrip.md'))).toBe(true)
    teardown()
  })

  test('2. unarchive 不存在的 archived → idempotent=true', async () => {
    setupProject()
    const result = await unarchive({
      kind: 'domain',
      name: 'never-archived',
      projectRoot: tmpDir,
    })
    expect(result.ok).toBe(true)
    expect(result.idempotent).toBe(true)
    teardown()
  })

  test('3. unarchive 冲突（active 已存在同名）→ IAPError', async () => {
    setupProject()
    // 1. archive 一个资产
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'conflict.md'),
      '---\nentity: domain\n---\n# Domain: conflict\n',
    )
    await archive({
      kind: 'domain',
      name: 'conflict',
      reason: 'test',
      projectRoot: tmpDir,
    })

    // 2. 在 active 创建同名（模拟其他途径创建）
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'conflict.md'),
      '---\nentity: domain\n---\n# Domain: conflict\n',
    )

    // 3. unarchive 应抛 PATH_CONFLICT
    await expect(
      unarchive({
        kind: 'domain',
        name: 'conflict',
        projectRoot: tmpDir,
      }),
    ).rejects.toThrow(/already exists/)

    teardown()
  })

  test('4. unarchive 写 audit log 到 _unarchive-log.jsonl', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'logged.md'),
      '---\nentity: domain\n---\n# Domain: logged\n',
    )
    await archive({
      kind: 'domain',
      name: 'logged',
      reason: 'test',
      projectRoot: tmpDir,
    })
    await unarchive({
      kind: 'domain',
      name: 'logged',
      projectRoot: tmpDir,
    })

    const logPath = join(tmpDir, '.openxenon', '.archived', '_unarchive-log.jsonl')
    expect(existsSync(logPath)).toBe(true)
    const logContent = readFileSync(logPath, 'utf-8')
    expect(logContent).toContain('logged')
    expect(logContent).toContain('domain')
    teardown()
  })

  test('5. unarchive 删除 .metadata.json', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'clean.md'),
      '---\nentity: domain\n---\n# Domain: clean\n',
    )
    await archive({
      kind: 'domain',
      name: 'clean',
      reason: 'to be deleted',
      projectRoot: tmpDir,
    })
    const metaPath = join(tmpDir, '.openxenon', '.archived', 'assets', 'domains', 'clean.metadata.json')
    expect(existsSync(metaPath)).toBe(true)

    await unarchive({
      kind: 'domain',
      name: 'clean',
      projectRoot: tmpDir,
    })
    expect(existsSync(metaPath)).toBe(false)
    teardown()
  })
})

describe('I-5b: oxn asset tree', () => {
  test('6. tree 列出所有 root Asset（无任何反向引用）', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'root-a.md'),
      '---\nentity: domain\n---\n# Domain: root-a\n',
    )
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'root-b.md'),
      '---\nentity: domain\n---\n# Domain: root-b\n',
    )
    const result = await tree({ projectRoot: tmpDir })
    expect(result.ok).toBe(true)
    expect(result.nodes.length).toBe(2)
    // 两条都是 root（无反向引用）
    expect(result.humanTree).toContain('domain:root-a')
    expect(result.humanTree).toContain('domain:root-b')
    teardown()
  })

  test('7. tree forward 方向显示我引用了谁', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'shared.md'),
      '---\nentity: domain\n---\n# Domain: shared\n',
    )
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'workflows', 'consumer.md'),
      '---\nentity: workflow\nreferences: [shared]\n---\n# Workflow: consumer\n',
    )
    const result = await tree({
      projectRoot: tmpDir,
      root: { kind: 'workflow', name: 'consumer' },
      direction: 'forward',
    })
    expect(result.ok).toBe(true)
    expect(result.humanTree).toContain('workflow:consumer')
    expect(result.humanTree).toContain('shared')
    teardown()
  })

  test('8. tree reverse 方向显示谁引用了我（🆕 v0.6.4 PR-D: bare name 同 kind 解析）', async () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'popular.md'),
      '---\nentity: domain\n---\n# Domain: popular\n',
    )
    // 🆕 v0.6.4 PR-D: bare name references 强制同 kind（Inv15/Inv30）；跨 kind 必须走 Blueprint ## Use 段
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'fan1.md'),
      '---\nentity: domain\nreferences: [popular]\n---\n# Domain: fan1\n',
    )
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'fan2.md'),
      '---\nentity: domain\nreferences: [popular]\n---\n# Domain: fan2\n',
    )
    const result = await tree({
      projectRoot: tmpDir,
      root: { kind: 'domain', name: 'popular' },
      direction: 'reverse',
    })
    expect(result.ok).toBe(true)
    expect(result.humanTree).toContain('domain:popular')
    expect(result.humanTree).toContain('domain:fan1')
    expect(result.humanTree).toContain('domain:fan2')
    teardown()
  })

  test('9. tree 指定不存在的 root → ok=false', async () => {
    setupProject()
    const result = await tree({
      projectRoot: tmpDir,
      root: { kind: 'domain', name: 'nope' },
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('not found')
    teardown()
  })

  test('10. tree depth 限制防止循环栈溢出', async () => {
    setupProject()
    // A 引用 B，B 引用 A（cycle）
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'a.md'),
      '---\nentity: domain\nreferences: [b]\n---\n# Domain: a\n',
    )
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'b.md'),
      '---\nentity: domain\nreferences: [a]\n---\n# Domain: b\n',
    )
    const result = await tree({
      projectRoot: tmpDir,
      root: { kind: 'domain', name: 'a' },
      depth: 3,
    })
    expect(result.ok).toBe(true)
    // 应在 depth=3 处截断，标 cycle
    expect(result.humanTree).toContain('cycle')
    teardown()
  })
})
