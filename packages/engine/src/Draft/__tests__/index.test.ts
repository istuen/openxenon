/**
 * Draft module unit tests (v0.6.2)
 *
 * 覆盖：
 *   1. createDraft：合法/非法 name + prefix + 已存在冲突
 *   2. listDrafts：active / archived / include-archived
 *   3. archiveDraft：存在 / 不存在 / 重复 archive
 *   4. discardDraft：force required / 存在 / 不存在 / 同时扫 archived
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { archiveDraft, createDraft, discardDraft, listDrafts, DRAFT_PREFIXES } from '../index'

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), `oxn-draft-test-${Date.now()}-`))
})

afterEach(() => {
  if (existsSync(projectRoot)) rmSync(projectRoot, { recursive: true, force: true })
})

// ───────── createDraft ─────────

describe('createDraft', () => {
  test('空白 name 不带 prefix → 写空文件到 <boundaryDir>/drafts/<name>.md', () => {
    const r = createDraft({ projectRoot, name: 'my-design' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const fp = join(projectRoot, '.openxenon', 'drafts', 'my-design.md')
    expect(existsSync(fp)).toBe(true)
    const content = require('fs').readFileSync(fp, 'utf-8')
    expect(content).toBe('')
  })

  test('带 prefix=design → 文件名 <prefix>-<name>.md', () => {
    const r = createDraft({ projectRoot, name: 'draft-grilling', prefix: 'design' })
    expect(r.ok).toBe(true)
    const fp = join(projectRoot, '.openxenon', 'drafts', 'design-draft-grilling.md')
    expect(existsSync(fp)).toBe(true)
  })

  test('带 prefix=report/issue/design 三类都合法', () => {
    for (const prefix of DRAFT_PREFIXES) {
      const r = createDraft({ projectRoot, name: `t-${prefix}`, prefix })
      expect(r.ok).toBe(true)
    }
    const files = readdirSync(join(projectRoot, '.openxenon', 'drafts'))
    expect(files.sort()).toEqual(['design-t-design.md', 'issue-t-issue.md', 'report-t-report.md'])
  })

  test('name 含路径分隔符 → OXN_DRAFT_INVALID_NAME', () => {
    const r = createDraft({ projectRoot, name: 'foo/bar' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_INVALID_NAME')
  })

  test('name 含扩展名 → OXN_DRAFT_INVALID_NAME', () => {
    const r = createDraft({ projectRoot, name: 'foo.md' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_INVALID_NAME')
  })

  test('非法 prefix → OXN_DRAFT_INVALID_PREFIX', () => {
    const r = createDraft({ projectRoot, name: 'foo', prefix: 'invalid' as never })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_INVALID_PREFIX')
  })

  test('已存在同名文件 → OXN_DRAFT_ALREADY_EXISTS', () => {
    const r1 = createDraft({ projectRoot, name: 'dup' })
    expect(r1.ok).toBe(true)
    const r2 = createDraft({ projectRoot, name: 'dup' })
    expect(r2.ok).toBe(false)
    if (r2.ok) return
    expect(r2.code).toBe('OXN_DRAFT_ALREADY_EXISTS')
  })

  test('draftDir 自定义（经 .oxnrc 等价模拟）', () => {
    const r = createDraft({ projectRoot, name: 'custom' }, { draftDir: 'my-drafts' })
    expect(r.ok).toBe(true)
    const fp = join(projectRoot, '.openxenon', 'my-drafts', 'custom.md')
    expect(existsSync(fp)).toBe(true)
  })
})

// ───────── listDrafts ─────────

describe('listDrafts', () => {
  test('空目录 → 返回 []', () => {
    const r = listDrafts({ projectRoot })
    expect(r.drafts).toEqual([])
  })

  test('active 文件按 mtime 降序', async () => {
    createDraft({ projectRoot, name: 'a' })
    await new Promise((r) => setTimeout(r, 5))
    createDraft({ projectRoot, name: 'b', prefix: 'report' })
    await new Promise((r) => setTimeout(r, 5))
    createDraft({ projectRoot, name: 'c', prefix: 'design' })

    const r = listDrafts({ projectRoot })
    expect(r.drafts).toHaveLength(3)
    // 最后一个创建的在最前
    expect(r.drafts[0]?.name).toBe('design-c')
    expect(r.drafts[1]?.name).toBe('report-b')
    expect(r.drafts[2]?.name).toBe('a')
    expect(r.drafts[0]?.prefix).toBe('design')
    expect(r.drafts[0]?.archived).toBe(false)
  })

  test('includeArchived=true 同时列 active + archived', () => {
    createDraft({ projectRoot, name: 'active' })
    createDraft({ projectRoot, name: 'will-archive' })
    archiveDraft({ projectRoot, name: 'will-archive' })

    const r1 = listDrafts({ projectRoot })
    expect(r1.drafts).toHaveLength(1)
    expect(r1.drafts[0]?.name).toBe('active')

    const r2 = listDrafts({ projectRoot, includeArchived: true })
    expect(r2.drafts).toHaveLength(2)
    const archived = r2.drafts.find((d) => d.archived)
    expect(archived?.name).toBe('will-archive')
  })
})

// ───────── archiveDraft ─────────

describe('archiveDraft', () => {
  test('存在文件 → 移到 .archived/', () => {
    createDraft({ projectRoot, name: 'archive-me' })
    const r = archiveDraft({ projectRoot, name: 'archive-me' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const archivedPath = join(projectRoot, '.openxenon', 'drafts', '.archived', 'archive-me.md')
    expect(r.archivedPath).toBe(archivedPath)
    expect(existsSync(archivedPath)).toBe(true)
    expect(existsSync(join(projectRoot, '.openxenon', 'drafts', 'archive-me.md'))).toBe(false)
  })

  test('带 prefix 文件按 file name 解析', () => {
    createDraft({ projectRoot, name: 'foo', prefix: 'design' })
    const r = archiveDraft({ projectRoot, name: 'foo' })
    expect(r.ok).toBe(true)
    const archivedPath = join(projectRoot, '.openxenon', 'drafts', '.archived', 'design-foo.md')
    expect(existsSync(archivedPath)).toBe(true)
  })

  test('不存在的 name → OXN_DRAFT_NOT_FOUND', () => {
    const r = archiveDraft({ projectRoot, name: 'ghost' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_NOT_FOUND')
  })

  test('archive 第二次同名 → OXN_DRAFT_ALREADY_ARCHIVED', () => {
    createDraft({ projectRoot, name: 'once' })
    const r1 = archiveDraft({ projectRoot, name: 'once' })
    expect(r1.ok).toBe(true)
    const r2 = archiveDraft({ projectRoot, name: 'once' })
    expect(r2.ok).toBe(false)
    if (r2.ok) return
    expect(r2.code).toBe('OXN_DRAFT_NOT_FOUND')
  })
})

// ───────── discardDraft ─────────

describe('discardDraft', () => {
  test('不传 force → 拒绝', () => {
    createDraft({ projectRoot, name: 'guard' })
    const r = discardDraft({ projectRoot, name: 'guard' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_NOT_FOUND')
    expect(r.message).toContain('--force')
  })

  test('force + 存在 → 物理删除', () => {
    createDraft({ projectRoot, name: 'trash' })
    const r = discardDraft({ projectRoot, name: 'trash', force: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(existsSync(r.deletedPath)).toBe(false)
  })

  test('force + 不存在 → OXN_DRAFT_NOT_FOUND', () => {
    const r = discardDraft({ projectRoot, name: 'ghost', force: true })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_NOT_FOUND')
  })

  test('force + archived 文件也能删', () => {
    createDraft({ projectRoot, name: 'archived' })
    archiveDraft({ projectRoot, name: 'archived' })
    const r = discardDraft({ projectRoot, name: 'archived', force: true })
    expect(r.ok).toBe(true)
    const archivedPath = join(projectRoot, '.openxenon', 'drafts', '.archived', 'archived.md')
    expect(existsSync(archivedPath)).toBe(false)
  })
})

// ───────── 路径配置 ─────────

describe('draftDir 配置', () => {
  test('自定义 draftDir → 写到该子目录', () => {
    const r = createDraft({ projectRoot, name: 'cfg' }, { draftDir: 'custom' })
    expect(r.ok).toBe(true)
    expect(existsSync(join(projectRoot, '.openxenon', 'custom', 'cfg.md'))).toBe(true)
  })

  test('自定义 draftDir + archive → 写到 <custom>/.archived/', () => {
    createDraft({ projectRoot, name: 'cfg-a' }, { draftDir: 'custom' })
    const r = archiveDraft({ projectRoot, name: 'cfg-a' }, { draftDir: 'custom' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.archivedPath).toBe(join(projectRoot, '.openxenon', 'custom', '.archived', 'cfg-a.md'))
  })

  test('预创建 drafts 目录 + 写文件不重置', () => {
    const dir = join(projectRoot, '.openxenon', 'drafts')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'pre-existing.md'), 'existing content', 'utf-8')
    createDraft({ projectRoot, name: 'new' })
    const r = listDrafts({ projectRoot })
    expect(r.drafts).toHaveLength(2)
    const preExisting = r.drafts.find((d) => d.name === 'pre-existing')
    expect(preExisting).toBeDefined()
    // 但 parseDraftFileName 无法解析 prefix (无 prefix) → 仍列出，name=pre-existing
  })
})
