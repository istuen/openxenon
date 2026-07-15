// =============================================================================
// plan-hash.test.ts — PR-2 单元测试
//
// 覆盖：
//   1. normalizeText：去 BOM / CRLF / 末尾空行
//   2. hashText：相同内容 → 相同 hash；不同内容 → 不同 hash
//   3. hashFile：文件存在/不存在
//   4. listTaskFiles：稳定排序、跳过隐藏/无 task.md 的目录
//   5. hashWorkPlan：4 组件 + allHash，缺失组件为 null，missing[] 准确
//   6. hashAssetList：按 name 排序
//   7. probePlanPresence：探测 4 组件实际状态
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  getWorkBlueprintsJsonPath,
  getWorkMdPath,
  hashAssetList,
  hashFile,
  hashText,
  hashWorkPlan,
  listTaskFiles,
  normalizeText,
  probePlanPresence,
  sha256Hex,
} from '../plan-hash'

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
    // \r\n 后再 \r\n = b\n\n  ;  a\n + b\n\n = a\nb\n\n  ;  折叠为 a\nb\n
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

// ───────── listTaskFiles ─────────

describe('listTaskFiles', () => {
  test('空 tasks/ 返回 []', () => {
    expect(listTaskFiles(tmpDir, workName)).toEqual([])
  })
  test('稳定排序', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'zebra'), { recursive: true })
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'alpha'), { recursive: true })
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'mike'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'zebra', 'task.md'), 'z')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'alpha', 'task.md'), 'a')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'mike', 'task.md'), 'm')
    const out = listTaskFiles(tmpDir, workName)
    expect(out.map((t) => t.taskName)).toEqual(['alpha', 'mike', 'zebra'])
  })
  test('跳过隐藏目录', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', '.hidden'), { recursive: true })
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'visible'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', '.hidden', 'task.md'), 'h')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'visible', 'task.md'), 'v')
    const out = listTaskFiles(tmpDir, workName)
    expect(out.map((t) => t.taskName)).toEqual(['visible'])
  })
  test('跳过无 task.md 的目录', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'no-md'), { recursive: true })
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'has-md'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'no-md', 'readme.md'), 'r')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'has-md', 'task.md'), 'h')
    const out = listTaskFiles(tmpDir, workName)
    expect(out.map((t) => t.taskName)).toEqual(['has-md'])
  })
  test('hash 字段填入', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 't'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 't', 'task.md'), 'content')
    const out = listTaskFiles(tmpDir, workName)
    expect(out[0]?.hash).toBe(hashText('content'))
  })
})

// ───────── hashWorkPlan ─────────

function writeTask(name: string, content: string): void {
  const dir = join(tmpDir, '.openxenon', 'works', workName, 'tasks', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'task.md'), content)
}

describe('hashWorkPlan', () => {
  test('全 4 组件存在 → allHash 不为 null', () => {
    writeFileSync(getWorkMdPath(tmpDir, workName), 'work.md content')
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), '{}')
    writeTask('a', 'task a')
    const r = hashWorkPlan(tmpDir, workName)
    expect(r.workMdHash).not.toBe(null)
    expect(r.blueprintsHash).not.toBe(null)
    expect(r.tasksHash).not.toBe(null)
    expect(r.allHash).not.toBe(null)
    expect(r.missing).toEqual([])
  })

  test('work.md 缺失 → workMdHash=null + missing 含 work.md', () => {
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), '{}')
    const r = hashWorkPlan(tmpDir, workName)
    expect(r.workMdHash).toBe(null)
    expect(r.missing).toContain('work.md')
    expect(r.allHash).toBe(null)
  })

  test('无 task 时 tasksHash=null 且 missing 不含 task（empty ≠ missing）', () => {
    writeFileSync(getWorkMdPath(tmpDir, workName), 'work')
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), '{}')
    const r = hashWorkPlan(tmpDir, workName)
    expect(r.tasksHash).toBe(null)
    expect(r.missing).toEqual([]) // 0 task = empty, not "missing"
    expect(r.allHash).toBe(null) // 但 allHash 仍为 null（不完整）
  })

  test('稳定的 tasksHash（add 顺序无关）', () => {
    writeFileSync(getWorkMdPath(tmpDir, workName), 'work')
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), '{}')

    writeTask('z', 'z')
    writeTask('a', 'a')
    const h1 = hashWorkPlan(tmpDir, workName).tasksHash

    const aPath = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a', 'task.md')
    writeFileSync(aPath, 'changed')
    const hChanged = hashWorkPlan(tmpDir, workName).tasksHash
    writeFileSync(aPath, 'a')
    const hRestored = hashWorkPlan(tmpDir, workName).tasksHash

    expect(hChanged).not.toBe(h1)
    expect(hRestored).toBe(h1)
  })

  test('同 DAG 不同 add 顺序 → tasksHash 相同', () => {
    writeFileSync(getWorkMdPath(tmpDir, workName), 'work')
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), '{}')

    writeTask('a', 'A')
    writeTask('b', 'B')
    writeTask('c', 'C')
    const h1 = hashWorkPlan(tmpDir, workName).tasksHash

    rmSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a'), { recursive: true })
    rmSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'b'), { recursive: true })
    rmSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'c'), { recursive: true })

    writeTask('c', 'C')
    writeTask('a', 'A')
    writeTask('b', 'B')
    const h2 = hashWorkPlan(tmpDir, workName).tasksHash

    expect(h1).toBe(h2)
  })

  test('1 改 1 → allHash 也变（组件联动）', () => {
    writeFileSync(getWorkMdPath(tmpDir, workName), 'work')
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), '{}')
    writeTask('a', 'A')
    const h1 = hashWorkPlan(tmpDir, workName).allHash

    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a', 'task.md'), 'A2')
    const h2 = hashWorkPlan(tmpDir, workName).allHash

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

// ───────── probePlanPresence ─────────

describe('probePlanPresence', () => {
  test('空 work → 全 false / 空 tasks', () => {
    const r = probePlanPresence(tmpDir, workName)
    expect(r.workMd).toBe(false)
    // 🆕 Phase B: 删 domainsJson（Domain refs 走 Blueprint ## Refs）
    expect(r.blueprintsJson).toBe(false)
    expect(r.tasks).toEqual([])
  })

  test('有 task.md 但无 .work → 报告存在', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'x'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'x', 'task.md'), 'X')
    const r = probePlanPresence(tmpDir, workName)
    expect(r.tasks).toEqual([{ taskName: 'x', hasMd: true }])
  })
})

// ───────── sha256Hex 直接调用 ─────────

describe('sha256Hex', () => {
  test('与 hashText 一致（都走 normalize + sha256）', () => {
    expect(sha256Hex('hello\n')).toBe(hashText('hello\n'))
  })
})
