// =============================================================================
// Pool unit test (ADR-0088 ADR-P4)
//
// 覆盖 Pool/ 8 export function across create / gatekeeper / list:
//   - createPoolEntry / approvePoolEntryFull / rejectPoolEntryFull /
//     reviewPoolEntryFull / listPoolEntries / reviewPoolEntry /
//     approvePoolEntry / rejectPoolEntry
//
// 真实 fs 读写（用 mkdtempSync tmpDir 隔离）— 不依赖 .openxenon/ 真实工程工作台。
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  approvePoolEntry,
  approvePoolEntryFull,
  createPoolEntry,
  listPoolEntries,
  rejectPoolEntry,
  rejectPoolEntryFull,
  reviewPoolEntry,
  reviewPoolEntryFull,
} from '../index'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-pool-unit-'))
}

function teardown(): void {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
}

function writeAuditEntry(
  pool: 'research' | 'design' | 'issue' | 'audit' | 'journal',
  slug: string,
  content: string,
): string {
  const dir = join(tmpDir, '.openxenon', 'pools', pool)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${slug}.md`)
  writeFileSync(path, content, 'utf-8')
  return path
}

describe('Pool / createPoolEntry', () => {
  beforeEach(setupProject)
  afterEach(teardown)

  test('1. 合法输入 → 创建 .md + 返 mdPath + createdAt ISO', () => {
    const r = createPoolEntry({
      pool: 'audit',
      slug: 'test-entry',
      title: 'Test',
      content: '# Test\nbody',
      projectRoot: tmpDir,
    })
    expect(r.slug).toBe('test-entry')
    expect(r.pool).toBe('audit')
    expect(r.mdPath).toContain('test-entry.md')
    expect(r.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('2. 不存在的 pool 子目录 → 自动 mkdir', () => {
    const r = createPoolEntry({
      pool: 'journal',
      slug: 'journal-entry',
      title: 'Journal',
      content: '# Journal',
      projectRoot: tmpDir,
    })
    expect(r.mdPath).toContain('pools/journal/journal-entry.md')
  })

  test('3. 5 类 PoolKind 都支持', () => {
    const kinds = ['research', 'design', 'issue', 'audit', 'journal'] as const
    for (const pool of kinds) {
      const r = createPoolEntry({
        pool,
        slug: `${pool}-x`,
        title: pool,
        content: `# ${pool}`,
        projectRoot: tmpDir,
      })
      expect(r.pool).toBe(pool)
      expect(r.mdPath).toContain(`pools/${pool}/`)
    }
  })

  test('4. 创建后文件可读 + 内容一致', () => {
    const content = '# Hello\n\nbody content'
    createPoolEntry({
      pool: 'design',
      slug: 'design-x',
      title: 'Design',
      content,
      projectRoot: tmpDir,
    })
    const read = readFileSync(join(tmpDir, '.openxenon', 'pools', 'design', 'design-x.md'), 'utf-8')
    expect(read).toBe(content)
  })

  test('5. metadata 字段写入 + 返 frozenPath 路径正确', () => {
    const r = createPoolEntry({
      pool: 'audit',
      slug: 'with-meta',
      title: 'Meta',
      content: '# Meta',
      metadata: { author: 'test' },
      projectRoot: tmpDir,
    })
    // frozenPath 是 <pool>/<slug>/frozen.json，frozenPath 用于 hash 验证
    expect(r.frozenPath).toContain('pools/audit/with-meta/frozen.json')
  })
})

describe('Pool / reviewPoolEntryFull', () => {
  beforeEach(setupProject)
  afterEach(teardown)

  test('1. 已存在 entry → 返 exists=true + content 完整', () => {
    const content = '# Audit Entry\nstatus: pending\n'
    writeAuditEntry('audit', 'audit-x', content)
    const r = reviewPoolEntryFull(tmpDir, 'audit-x', 'audit')
    expect(r.exists).toBe(true)
    expect(r.content).toBe(content)
    expect(r.slug).toBe('audit-x')
    expect(r.pool).toBe('audit')
  })

  test('2. 不存在 slug → exists=false + content 空字符串', () => {
    const r = reviewPoolEntryFull(tmpDir, 'nonexistent', 'audit')
    expect(r.exists).toBe(false)
    expect(r.content).toBe('')
  })

  test('3. 默认 pool="audit"，传其他 pool 走对应子目录', () => {
    writeAuditEntry('research', 'research-x', '# R')
    const r = reviewPoolEntryFull(tmpDir, 'research-x', 'research')
    expect(r.exists).toBe(true)
    expect(r.pool).toBe('research')
  })

  test('4. 默认参数省略 → pool 默认 audit', () => {
    writeAuditEntry('audit', 'default-pool', '# D')
    // 默认 audit，可不传第三参
    const r = reviewPoolEntryFull(tmpDir, 'default-pool')
    expect(r.exists).toBe(true)
    expect(r.pool).toBe('audit')
  })
})

describe('Pool / approvePoolEntryFull', () => {
  beforeEach(setupProject)
  afterEach(teardown)

  test('1. 合法 entry + dryRun=false → status: pending → approved, ok=true', () => {
    const path = writeAuditEntry('audit', 'approve-x', '# A\nstatus: pending\n')
    const r = approvePoolEntryFull(tmpDir, 'approve-x', 'audit', false)
    expect(r.ok).toBe(true)
    const updated = readFileSync(path, 'utf-8')
    expect(updated).toContain('status: approved')
    expect(updated).not.toContain('status: pending')
  })

  test('2. dryRun=true → 文件不写, ok=true', () => {
    const path = writeAuditEntry('audit', 'dryrun-x', '# D\nstatus: pending\n')
    const r = approvePoolEntryFull(tmpDir, 'dryrun-x', 'audit', true)
    expect(r.ok).toBe(true)
    const unchanged = readFileSync(path, 'utf-8')
    expect(unchanged).toContain('status: pending')
    expect(unchanged).not.toContain('status: approved')
  })

  test('3. 不存在 entry → 抛 IAPError KIND_UNSUPPORTED', () => {
    expect(() => approvePoolEntryFull(tmpDir, 'nonexistent', 'audit', false)).toThrow()
  })

  test('4. status 已 approved → idempotent (replace 无害)', () => {
    const path = writeAuditEntry('audit', 'already', '# A\nstatus: approved\n')
    const r = approvePoolEntryFull(tmpDir, 'already', 'audit', false)
    expect(r.ok).toBe(true)
    const updated = readFileSync(path, 'utf-8')
    expect(updated).toContain('status: approved')
  })
})

describe('Pool / rejectPoolEntryFull', () => {
  beforeEach(setupProject)
  afterEach(teardown)

  test('1. 合法 entry → status: pending → rejected + reject_reason, ok=true', () => {
    const path = writeAuditEntry('audit', 'reject-x', '# R\nstatus: pending\n')
    const r = rejectPoolEntryFull(tmpDir, 'reject-x', '不通过：缺证据', 'audit')
    expect(r.ok).toBe(true)
    const updated = readFileSync(path, 'utf-8')
    expect(updated).toContain('status: rejected')
    expect(updated).toContain('reject_reason')
    expect(updated).toContain('不通过：缺证据')
  })

  test('2. 不存在 slug → ok=false + 不抛错', () => {
    const r = rejectPoolEntryFull(tmpDir, 'nonexistent', 'reason', 'audit')
    expect(r.ok).toBe(false)
  })

  test('3. reason 含特殊字符 → escape 后写入 frontmatter', () => {
    const path = writeAuditEntry('audit', 'special', '# S\nstatus: pending\n')
    const r = rejectPoolEntryFull(tmpDir, 'special', 'with "quotes" and \\backslash', 'audit')
    expect(r.ok).toBe(true)
    const updated = readFileSync(path, 'utf-8')
    expect(updated).toContain('reject_reason')
    expect(updated).toContain('quotes')
  })

  test('4. 已 rejected entry → idempotent (replace 不变)', () => {
    const path = writeAuditEntry('audit', 'rejected', '# R\nstatus: rejected\nreject_reason: "old reason"\n')
    const r = rejectPoolEntryFull(tmpDir, 'rejected', 'new reason', 'audit')
    expect(r.ok).toBe(true)
    const updated = readFileSync(path, 'utf-8')
    expect(updated).toContain('status: rejected')
  })
})

describe('Pool / listPoolEntries', () => {
  beforeEach(setupProject)
  afterEach(teardown)

  test('1. 空 pools 目录 → 空数组', () => {
    const r = listPoolEntries({ projectRoot: tmpDir })
    expect(r.entries).toEqual([])
  })

  test('2. 单 pool 子目录 → 列该 pool 全部 .md', () => {
    writeAuditEntry('audit', 'a1', '# A1')
    writeAuditEntry('audit', 'a2', '# A2')
    writeAuditEntry('audit', 'a3', '# A3')
    const r = listPoolEntries({ projectRoot: tmpDir, pool: 'audit' })
    expect(r.entries.length).toBe(3)
    expect(r.entries.map((e) => e.slug).sort()).toEqual(['a1', 'a2', 'a3'])
  })

  test('3. 多 pool 不指定 pool → 列 5 类全部', () => {
    writeAuditEntry('audit', 'a1', '# A1')
    writeAuditEntry('design', 'd1', '# D1')
    writeAuditEntry('research', 'r1', '# R1')
    const r = listPoolEntries({ projectRoot: tmpDir })
    expect(r.entries.length).toBeGreaterThanOrEqual(3)
    const slugs = r.entries.map((e) => e.slug)
    expect(slugs).toContain('a1')
    expect(slugs).toContain('d1')
    expect(slugs).toContain('r1')
  })

  test('4. 指定 pool 过滤 + 只看 audit', () => {
    writeAuditEntry('audit', 'audit-only', '# A')
    writeAuditEntry('design', 'design-only', '# D')
    const r = listPoolEntries({ projectRoot: tmpDir, pool: 'audit' })
    expect(r.entries.every((e) => e.pool === 'audit')).toBe(true)
    expect(r.entries.length).toBe(1)
  })

  test('5. frontmatter title → entry.title 提取 (# Title 行)', () => {
    writeAuditEntry('audit', 'titled', '# My Audit Title\nbody')
    const r = listPoolEntries({ projectRoot: tmpDir, pool: 'audit' })
    const e = r.entries.find((x) => x.slug === 'titled')
    expect(e?.title).toBe('My Audit Title')
  })
})

describe('Pool / low-level helpers', () => {
  beforeEach(setupProject)
  afterEach(teardown)

  test('1. reviewPoolEntry 跨 pool 查找 → 返 content', () => {
    writeAuditEntry('audit', 'find-me', '# Found')
    const r = reviewPoolEntry('find-me', tmpDir)
    expect(r).toContain('# Found')
  })

  test('2. reviewPoolEntry 不存在 → null', () => {
    const r = reviewPoolEntry('nonexistent', tmpDir)
    expect(r).toBeNull()
  })

  test('3. approvePoolEntry (placeholder v0.6) → ok=false', () => {
    // approvePoolEntry 在 list.ts 是 placeholder (返 ok: false)
    const r = approvePoolEntry('any', tmpDir, false)
    expect(r.ok).toBe(false)
  })

  test('4. rejectPoolEntry (placeholder v0.6) → ok=false', () => {
    const r = rejectPoolEntry('any', 'reason', tmpDir)
    expect(r.ok).toBe(false)
  })
})
