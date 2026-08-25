// =============================================================================
// birth-cert.test.ts — PR-2 + RFC-0033 极简化单元测试
//
// 覆盖：
//   1. Zod schema 验证（合法/非法/边界值）
//   2. readWorkFile / writeWorkFile / clearWorkFile 原子写 + 解析失败优雅降级
//   3. createBirthCert 构造初始 birth cert（不含 planLock 字段，RFC-0033 D2）
//   4. checkAssetsDrift 资产漂移检测
//
// 🗑️ RFC-0033 D2 删除：
//   - applyPlanLock / clearPlanLock 测试（PlanLock 整体退役）
//   - verifyPlanLock 测试（锁后 hash 漂移检测已迁至 submit 时刻 trace ASSET_DRIFT 事件）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  BirthCertSchema,
  checkAssetsDrift,
  clearWorkFile,
  createBirthCert,
  getWorkFilePath,
  readWorkFile,
  workFileExists,
  writeWorkFile,
  type BirthCert,
} from '../birth-cert'
import { hashText } from '../plan-hash'
import { getWorkDir } from '../dual-state-io'

const HASH_A = 'a'.repeat(64)
const HASH_BP = 'b'.repeat(64)

let tmpDir: string
let workName: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `birth-cert-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  workName = 'demo'
  mkdirSync(getWorkDir(tmpDir, workName), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

// ───────── Zod schema ─────────

describe('BirthCertSchema', () => {
  test('RFC-0033 D2：合法最小 cert（不含 planLock 字段）', () => {
    const cert: BirthCert = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { blueprints: [] },
    }
    expect(BirthCertSchema.safeParse(cert).success).toBe(true)
  })

  test('workName 必须是 kebab-case', () => {
    const base = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { blueprints: [] },
    }
    expect(BirthCertSchema.safeParse({ ...base, workName: 'foo' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, workName: 'foo-bar' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, workName: 'Foo' }).success).toBe(false) // PascalCase
    expect(BirthCertSchema.safeParse({ ...base, workName: 'foo_bar' }).success).toBe(false) // snake
    expect(BirthCertSchema.safeParse({ ...base, workName: '-foo' }).success).toBe(false) // leading dash
  })

  test('fileHash 必须是 64-char hex（blueprints）', () => {
    const base = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      goal: '',
      constraints: [],
      maxIterations: 3,
    }
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: { blueprints: [{ name: 'A', scope: '@prj', version: 1, fileHash: HASH_A }] },
      }).success,
    ).toBe(true)
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: {
          blueprints: [{ name: 'A', scope: '@prj', version: 1, fileHash: 'not-hex' }],
        },
      }).success,
    ).toBe(false)
  })

  test('scope 必须是 @oxn | @prj（BoundaryRefEntrySchema）', () => {
    const base = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      goal: '',
      constraints: [],
      maxIterations: 3,
    }
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: {
          blueprints: [
            {
              name: 'A',
              version: 1,
              fileHash: HASH_A,
              domainRefs: [{ name: 'D', scope: '@prj' as const, version: 1, fileHash: HASH_A }],
            },
          ],
        },
      }).success,
    ).toBe(true)
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: {
          blueprints: [
            {
              name: 'A',
              version: 1,
              fileHash: HASH_A,
              domainRefs: [{ name: 'D', scope: '@glo' as const, version: 1, fileHash: HASH_A }],
            },
          ],
        },
      }).success,
    ).toBe(false)
  })

  test('RFC-0033 D2：planLock 字段被 zod 静默剥除（向后兼容旧 .work 文件）', () => {
    const base: BirthCert = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { blueprints: [] },
    }
    // 旧 .work 文件可能含 planLock 字段（已退役），schema 应当静默剥除
    const parsed = BirthCertSchema.safeParse({
      ...base,
      planLock: {
        lockedAt: '2026-01-01T00:00:00.000Z',
        workMdHash: HASH_A,
        blueprintsHash: HASH_BP,
        tasksHash: HASH_A,
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect((parsed.data as { planLock?: unknown }).planLock).toBeUndefined()
    }
  })
})

// ───────── I/O ─────────

describe('workFile I/O', () => {
  test('缺文件 → readWorkFile 返回 {ok:false, reason:"missing"}', () => {
    const r = readWorkFile(tmpDir, workName)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('missing')
  })

  test('workFileExists 反映文件存在', () => {
    expect(workFileExists(tmpDir, workName)).toBe(false)
    writeFileSync(getWorkFilePath(tmpDir, workName), '{}')
    expect(workFileExists(tmpDir, workName)).toBe(true)
  })

  test('RFC-0033 D5：writeWorkFile no-op + clearWorkFile 删除 + readWorkFile 静默', () => {
    const cert = createBirthCert({
      workName,
      goal: 'demo',
      assets: {
        blueprints: [{ name: 'B', version: 1, fileHash: HASH_BP }],
      },
    })
    writeWorkFile(tmpDir, workName, cert)
    // 🗑️ RFC-0033 D5: writeWorkFile 现在是 no-op（不写 .work 文件）
    expect(workFileExists(tmpDir, workName)).toBe(false)
    expect(existsSync(`${getWorkFilePath(tmpDir, workName)}.tmp`)).toBe(false)

    // clearWorkFile 仍能清理遗留 .work（向后兼容）
    clearWorkFile(tmpDir, workName)
    expect(existsSync(getWorkFilePath(tmpDir, workName))).toBe(false)

    // readWorkFile 读不到 .work → missing
    const r = readWorkFile(tmpDir, workName)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('missing')
  })

  test('JSON 解析失败 → {ok:false, reason:"parse-error"}', () => {
    writeFileSync(getWorkFilePath(tmpDir, workName), 'not json {')
    const r = readWorkFile(tmpDir, workName)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('parse-error')
  })

  test('schema 不匹配 → {ok:false, reason:"schema-mismatch", errors[]}', () => {
    writeFileSync(getWorkFilePath(tmpDir, workName), JSON.stringify({ schemaVersion: 99, totally: 'wrong' }))
    const r = readWorkFile(tmpDir, workName)
    expect(r.ok).toBe(false)
    if (!r.ok && r.reason !== 'missing') {
      expect(r.reason).toBe('schema-mismatch')
      expect(r.errors.length).toBeGreaterThan(0)
    }
  })

  test('clearWorkFile 删除文件', () => {
    writeFileSync(getWorkFilePath(tmpDir, workName), '{}')
    expect(existsSync(getWorkFilePath(tmpDir, workName))).toBe(true)
    clearWorkFile(tmpDir, workName)
    expect(existsSync(getWorkFilePath(tmpDir, workName))).toBe(false)
  })

  test('clearWorkFile 文件不存在时静默（不抛）', () => {
    expect(() => clearWorkFile(tmpDir, workName)).not.toThrow()
  })

  test('RFC-0033 D5：readWorkFile 读旧 .work（含 planLock）静默成功', () => {
    const legacyCert = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { blueprints: [] },
      planLock: {
        lockedAt: '2026-01-01T00:00:00.000Z',
        workMdHash: HASH_A,
        blueprintsHash: HASH_BP,
        tasksHash: HASH_A,
      },
    }
    writeFileSync(getWorkFilePath(tmpDir, workName), JSON.stringify(legacyCert))
    const r = readWorkFile(tmpDir, workName)
    expect(r.ok).toBe(true)
  })
})

// ───────── createBirthCert ─────────

describe('createBirthCert', () => {
  test('最小参数（assets）', () => {
    const c = createBirthCert({
      workName,
      assets: { blueprints: [] },
    })
    expect(c.schemaVersion).toBe(1)
    expect(c.kind).toBe('work-birth-cert')
    expect(c.goal).toBe('')
    expect(c.constraints).toEqual([])
    expect(c.maxIterations).toBe(3)
    // RFC-0033 D2: planLock 字段已删
    expect((c as { planLock?: unknown }).planLock).toBeUndefined()
  })

  test('scope 默认 @prj（BoundaryRefEntrySchema）', () => {
    const c = createBirthCert({
      workName,
      assets: {
        blueprints: [
          {
            name: 'A',
            version: 1,
            fileHash: HASH_A,
            domainRefs: [{ name: 'D', kind: 'domain', scope: '@prj', version: 1, fileHash: HASH_A }],
          },
        ],
      },
    })
    expect(c.assets.blueprints[0]?.domainRefs[0]?.scope).toBe('@prj')
  })

  test('createdAt/updatedAt 自动填当前时间（可覆盖）', () => {
    const c = createBirthCert({
      workName,
      assets: { blueprints: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(c.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(c.updatedAt).toBe('2026-01-01T00:00:00.000Z')
  })
})

// ───────── checkAssetsDrift ─────────

describe('checkAssetsDrift', () => {
  function makeCertWithAssets(blueprints: Array<{ name: string; fileHash: string }>): BirthCert {
    return createBirthCert({
      workName,
      assets: {
        blueprints: blueprints.map((b) => ({ name: b.name, version: 1, fileHash: b.fileHash })),
      },
    })
  }

  test('无漂移：hash 与文件匹配', () => {
    const file = join(tmpDir, 'fake-A.md')
    writeFileSync(file, 'A content')
    const cert = makeCertWithAssets([{ name: 'A', fileHash: hashText('A content') }])
    const r = checkAssetsDrift(cert, (_k, n) => (n === 'A' ? file : null))
    expect(r.blueprint).toEqual([])
  })

  test('文件改了 → expected/actual 都报告', () => {
    const file = join(tmpDir, 'fake-A.md')
    writeFileSync(file, 'A content')
    const cert = makeCertWithAssets([{ name: 'A', fileHash: hashText('A OLD') }])
    const r = checkAssetsDrift(cert, (_k, n) => (n === 'A' ? file : null))
    expect(r.blueprint).toHaveLength(1)
    expect(r.blueprint[0]?.name).toBe('A')
    expect(r.blueprint[0]?.expected).toBe(hashText('A OLD'))
    expect(r.blueprint[0]?.actual).toBe(hashText('A content'))
  })

  test('resolver 返回 null → 报告 actual:null（文件漂到删了）', () => {
    const cert = makeCertWithAssets([{ name: 'A', fileHash: HASH_A }])
    const r = checkAssetsDrift(cert, () => null)
    expect(r.blueprint).toHaveLength(1)
    expect(r.blueprint[0]?.actual).toBe(null)
  })
})
