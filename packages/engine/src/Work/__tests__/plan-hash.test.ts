// =============================================================================
// plan-hash.test.ts — PR-2 + RFC-0033 极简化单元测试
//
// 覆盖：
//   1. normalizeText：去 BOM / CRLF / 末尾空行
//   2. hashText：相同内容 → 相同 hash；不同内容 → 不同 hash
//   3. hashFile：文件存在/不存在
//   4. hashWorkPlan（RFC-0033 简化）：仅 workMdHash，缺失则 missing[] 报告
//   5. hashAssetList：按 name 排序
//   6. sha256Hex：直接调用
//
// 🗑️ RFC-0033 D2/D3 删除：
//   - 5-hash 复合（workContextHash / blueprintsHash / tasksHash / taskContextsHash / allHash）
//   - listTaskFiles（task hash 不再参与 plan lock；Submit 时刻只算 workMdHash）
//   - listTaskContextFiles
//   - probePlanPresence
//   - getWorkDomainsJsonPath / getWorkBlueprintsJsonPath
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { hashAssetList, hashFile, hashText, hashWorkPlan, normalizeText, sha256Hex } from '../plan-hash'

let tmpDir: string
let workName: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `plan-hash-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  workName = 'test-work'
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

// ───────── normalizeText ─────────

describe('normalizeText', () => {
  test('去 BOM', () => {
    expect(normalizeText('\uFEFFhello').charCodeAt(0)).toBe('h'.charCodeAt(0))
  })
  test('CRLF → LF', () => {
    expect(normalizeText('a\r\nb\r\nc')).toBe('a\nb\nc')
  })
  test('单纯 CR → LF', () => {
    expect(normalizeText('a\rb\rc')).toBe('a\nb\nc')
  })
  test('末尾空行折叠（保留 1 个；无 trailing 时不动）', () => {
    expect(normalizeText('hello\n\n\n\n')).toBe('hello\n')
    expect(normalizeText('hello')).toBe('hello') // 无 trailing → 不变
  })
  test('中间空行保留', () => {
    expect(normalizeText('a\n\nb')).toBe('a\n\nb')
  })
  test('组合：BOM + CRLF + 末尾空行', () => {
    expect(normalizeText('\uFEFFa\r\nb\r\n\r\n')).toBe('a\nb\n')
  })
})

// ───────── hashText / hashFile ─────────

describe('hashText', () => {
  test('相同内容 → 相同 hash', () => {
    expect(hashText('hello')).toBe(hashText('hello'))
  })
  test('不同内容 → 不同 hash', () => {
    expect(hashText('hello')).not.toBe(hashText('world'))
  })
  test('CRLF vs LF 视为相同（归一化后）', () => {
    expect(hashText('a\nb')).toBe(hashText('a\r\nb'))
  })
  test('BOM 不影响 hash', () => {
    expect(hashText('hello')).toBe(hashText('\uFEFFhello'))
  })
  test('返回 64-char hex', () => {
    const h = hashText('anything')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('hashFile', () => {
  test('文件存在 → hash', () => {
    const file = join(tmpDir, 'a.txt')
    writeFileSync(file, 'hello\n')
    expect(hashFile(file)).toBe(hashText('hello\n'))
  })
  test('文件不存在 → null', () => {
    expect(hashFile(join(tmpDir, 'nope.txt'))).toBe(null)
  })
  test('CRLF 写法与 LF 写法 hash 相同', () => {
    writeFileSync(join(tmpDir, 'a.txt'), 'a\r\nb')
    writeFileSync(join(tmpDir, 'b.txt'), 'a\nb')
    expect(hashFile(join(tmpDir, 'a.txt'))).toBe(hashFile(join(tmpDir, 'b.txt')))
  })
})

// ───────── hashWorkPlan（RFC-0033 D3 简化）─────────

describe('hashWorkPlan (RFC-0033 简化)', () => {
  test('work.md 存在 → workMdHash 填值，missing[] 为空', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.md'), 'work content')
    const r = hashWorkPlan(tmpDir, workName)
    expect(r.workMdHash).not.toBe(null)
    expect(r.missing).toEqual([])
  })

  test('work.md 缺失 → workMdHash=null + missing 含 work.md', () => {
    const r = hashWorkPlan(tmpDir, workName)
    expect(r.workMdHash).toBe(null)
    expect(r.missing).toContain('work.md')
  })

  test('RFC-0033 D3：PlanHash 只含 workMdHash（无 5-hash 复合）', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.md'), 'work')
    const r = hashWorkPlan(tmpDir, workName)
    // 旧字段已删
    expect((r as { workContextHash?: unknown }).workContextHash).toBeUndefined()
    expect((r as { blueprintsHash?: unknown }).blueprintsHash).toBeUndefined()
    expect((r as { tasksHash?: unknown }).tasksHash).toBeUndefined()
    expect((r as { taskContextsHash?: unknown }).taskContextsHash).toBeUndefined()
    expect((r as { allHash?: unknown }).allHash).toBeUndefined()
  })

  test('CRLF work.md 与 LF work.md hash 相同（归一化）', () => {
    const crlfDir = join(tmpdir(), `plan-hash-crlf-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const lfDir = join(tmpdir(), `plan-hash-lf-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    try {
      mkdirSync(join(crlfDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
      mkdirSync(join(lfDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
      writeFileSync(join(crlfDir, '.openxenon', 'works', workName, 'work.md'), 'work\r\ncontent')
      writeFileSync(join(lfDir, '.openxenon', 'works', workName, 'work.md'), 'work\ncontent')
      const crlfHash = hashWorkPlan(crlfDir, workName).workMdHash
      const lfHash = hashWorkPlan(lfDir, workName).workMdHash
      expect(crlfHash).toBe(lfHash)
    } finally {
      rmSync(crlfDir, { recursive: true, force: true })
      rmSync(lfDir, { recursive: true, force: true })
    }
  })

  test('修改 work.md → workMdHash 变', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.md'), 'A')
    const h1 = hashWorkPlan(tmpDir, workName).workMdHash
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.md'), 'A modified')
    const h2 = hashWorkPlan(tmpDir, workName).workMdHash
    expect(h1).not.toBe(h2)
  })
})

// ───────── hashAssetList ─────────

describe('hashAssetList', () => {
  test('空 list → 64-hex hash', () => {
    const h = hashAssetList([])
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  test('同 name 列表不同顺序 → 相同 hash（排序）', () => {
    const f1 = join(tmpDir, 'a.md')
    const f2 = join(tmpDir, 'b.md')
    writeFileSync(f1, 'A')
    writeFileSync(f2, 'B')

    const h1 = hashAssetList([
      { name: 'A', version: 1, filePath: f1 },
      { name: 'B', version: 1, filePath: f2 },
    ])
    const h2 = hashAssetList([
      { name: 'B', version: 1, filePath: f2 },
      { name: 'A', version: 1, filePath: f1 },
    ])
    expect(h1).toBe(h2)
  })

  test('fileHash 变化（文件改了）→ hash 变', () => {
    const f = join(tmpDir, 'a.md')
    writeFileSync(f, 'A')
    const h1 = hashAssetList([{ name: 'A', version: 1, filePath: f }])
    writeFileSync(f, 'A2')
    const h2 = hashAssetList([{ name: 'A', version: 1, filePath: f }])
    expect(h1).not.toBe(h2)
  })
})

// ───────── sha256Hex 直接调用 ─────────

describe('sha256Hex', () => {
  test('与 hashText 一致（都走 normalize + sha256）', () => {
    expect(sha256Hex('hello\n')).toBe(hashText('hello\n'))
  })
})
