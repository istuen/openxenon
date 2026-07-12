// =============================================================================
// birth-cert.test.ts — PR-2 单元测试
//
// 覆盖：
//   1. Zod schema 验证（合法/非法/边界值）
//   2. readWorkFile / writeWorkFile / clearWorkFile 原子写 + 解析失败优雅降级
//   3. createBirthCert 构造初始 birth cert
//   4. applyPlanLock / clearPlanLock 不可变更新
//   5. verifyPlanLock 4 种结果：ok / no-plan-lock / work-removed / hash-mismatch
//   6. checkAssetsDrift 资产漂移检测
//   7. v0.7+ 移除 mode/editTarget：BirthCert schema 不再含这些字段
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { readFileSync } from 'fs'
import {
  applyPlanLock,
  BirthCertSchema,
  checkAssetsDrift,
  clearPlanLock,
  clearWorkFile,
  createBirthCert,
  getWorkFilePath,
  readWorkFile,
  verifyPlanLock,
  workFileExists,
  writeWorkFile,
  type BirthCert,
} from '../birth-cert'
import { getWorkDir, hashText } from '../plan-hash'
import { getWorkBlueprintsJsonPath, getWorkMdPath } from '../plan-hash'

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

function makeHash64(input: string): string {
  return hashText(input)
}

// 64-hex stub（合法 fileHash）
const HASH_A = makeHash64('domain-A-content')
const _HASH_B = makeHash64('domain-B-content')
const HASH_BP = makeHash64('blueprint-content')

// ───────── Zod schema 验证 ─────────

describe('BirthCertSchema', () => {
  test('合法最小 birth cert', () => {
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
      planLock: null,
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
      planLock: null,
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
        planLock: null,
      }).success,
    ).toBe(true)
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: {
          blueprints: [{ name: 'A', scope: '@prj', version: 1, fileHash: 'not-hex' }],
        },
        planLock: null,
      }).success,
    ).toBe(false)
  })

  test('scope 必须是 @oxn | @prj（BoundaryRefEntrySchema）', () => {
    // 🆕 Phase B: scope 校验在 BoundaryRefEntrySchema 上（Blueprint ## Refs 内部的 domain/workflow/stack scope）
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
        planLock: null,
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
        planLock: null,
      }).success,
    ).toBe(false)
  })

  test('v0.7+：BirthCert schema 不再含 mode/editTarget 字段', () => {
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
      planLock: null,
    }
    // 写入历史字段应当被 zod 默认剥除（strict mode 关闭）或被 BirthCertSchema 不再要求
    const parsed = BirthCertSchema.safeParse({
      ...base,
      // @ts-expect-error - v0.7+ 不再接受 mode/editTarget
      mode: 'task',
      // @ts-expect-error - v0.7+ 不再接受 mode/editTarget
      editTarget: 'domain:X',
    })
    // schema 默认会剥除未知字段（passthrough 默认 false），parse 仍成功但 mode/editTarget 被剥离
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect((parsed.data as { mode?: string }).mode).toBeUndefined()
      expect((parsed.data as { editTarget?: string }).editTarget).toBeUndefined()
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

  test('writeWorkFile 原子写 + readWorkFile 还原', () => {
    const cert = createBirthCert({
      workName,
      goal: 'demo',
      assets: {
        blueprints: [{ name: 'B', version: 1, fileHash: HASH_BP }],
      },
    })
    writeWorkFile(tmpDir, workName, cert)
    // .tmp 不应残留
    expect(existsSync(`${getWorkFilePath(tmpDir, workName)}.tmp`)).toBe(false)

    const r = readWorkFile(tmpDir, workName)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.cert.workName).toBe(workName)
      expect(r.cert.assets.blueprints[0]?.name).toBe('B')
    }
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
    if (!r.ok) {
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
    expect(c.planLock).toBe(null)
  })

  test('scope 默认 @prj（BoundaryRefEntrySchema）', () => {
    // 🆕 Phase B: scope 是 BoundaryRefEntry 上的字段（Blueprint ## Refs 内部的 domain/workflow/stack scope）
    const c = createBirthCert({
      workName,
      assets: {
        blueprints: [
          {
            name: 'A',
            version: 1,
            fileHash: HASH_A,
            domainRefs: [{ name: 'D', scope: '@prj', version: 1, fileHash: HASH_A }],
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

// ───────── applyPlanLock / clearPlanLock ─────────

describe('applyPlanLock / clearPlanLock', () => {
  test('applyPlanLock 设置 4 组件 hash + allHash + lockedAt', () => {
    const base = createBirthCert({
      workName,
      assets: { blueprints: [] },
    })
    const HASH_ALL = HASH_A
    const hash = {
      workMdHash: HASH_A,
      blueprintsHash: HASH_BP,
      tasksHash: HASH_A,
      allHash: HASH_ALL,
      missing: [],
    }
    const locked = applyPlanLock(base, hash, '2026-06-08T01:00:00.000Z')
    expect(locked.planLock).not.toBe(null)
    expect(locked.planLock?.lockedAt).toBe('2026-06-08T01:00:00.000Z')
    expect(locked.planLock?.workMdHash).toBe(HASH_A)

    expect(locked.planLock?.blueprintsHash).toBe(HASH_BP)
    expect(locked.planLock?.tasksHash).toBe(HASH_A)
    expect(locked.planLock?.allHash).toBe(HASH_ALL)
    expect(locked.updatedAt).toBe('2026-06-08T01:00:00.000Z')
  })

  test('applyPlanLock 任一组件为 null → 抛错', () => {
    const base = createBirthCert({
      workName,
      assets: { blueprints: [] },
    })
    expect(() =>
      applyPlanLock(base, {
        workMdHash: null,
        blueprintsHash: HASH_BP,
        tasksHash: HASH_A,
        allHash: null,
        missing: ['work.md'],
      }),
    ).toThrow(/incomplete plan hash/)
  })

  test('clearPlanLock 重置 planLock=null + 更新 updatedAt', () => {
    const base = createBirthCert({
      workName,
      assets: { blueprints: [] },
    })
    const hash = {
      workMdHash: HASH_A,
      blueprintsHash: HASH_BP,
      tasksHash: HASH_A,
      allHash: HASH_A,
      missing: [],
    }
    const locked = applyPlanLock(base, hash)
    const cleared = clearPlanLock(locked, '2026-06-08T02:00:00.000Z')
    expect(cleared.planLock).toBe(null)
    expect(cleared.updatedAt).toBe('2026-06-08T02:00:00.000Z')
  })

  test('不可变：applyPlanLock 不修改原 cert', () => {
    const base = createBirthCert({
      workName,
      assets: { blueprints: [] },
    })
    const hash = {
      workMdHash: HASH_A,
      blueprintsHash: HASH_BP,
      tasksHash: HASH_A,
      allHash: HASH_A,
      missing: [],
    }
    applyPlanLock(base, hash)
    expect(base.planLock).toBe(null) // 原对象未变
  })
})

// ───────── verifyPlanLock ─────────

describe('verifyPlanLock', () => {
  function setupLockedCert(params: {
    workMdContent: string
    blueprintsContent: string
    tasks?: Array<{ name: string; content: string }>
  }): BirthCert {
    writeFileSync(getWorkMdPath(tmpDir, workName), params.workMdContent)
    // 🆕 Phase B: domains.json 不再生成（Domain 引用走 Blueprint ## Refs）
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), params.blueprintsContent)
    for (const t of params.tasks ?? []) {
      const dir = join(getWorkDir(tmpDir, workName), 'tasks', t.name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'task.md'), t.content)
    }
    const base = createBirthCert({
      workName,
      assets: { blueprints: [] },
    })
    // 直接构造 planLock（避免依赖 hashWorkPlan 模块）
    // 注意：tasksHash 的计算公式必须与 plan-hash.ts 的 hashWorkPlan 完全一致
    const locked: BirthCert = {
      ...base,
      planLock: {
        lockedAt: '2026-06-08T00:00:00.000Z',
        workMdHash: hashText(params.workMdContent),
        blueprintsHash: hashText(params.blueprintsContent),
        tasksHash:
          (params.tasks ?? []).length === 0
            ? ''
            : hashText(
                (params.tasks ?? [])
                  .map((t) => `${t.name}=${hashText(t.content)}`)
                  .sort()
                  .join('\n'),
              ),
      },
    }
    return locked
  }

  test('ok: 4 组件都未变', () => {
    const cert = setupLockedCert({
      workMdContent: 'work A',
      blueprintsContent: 'bp A',
      tasks: [{ name: 't1', content: 't1 content' }],
    })
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(true)
  })

  test('no-plan-lock: cert.planLock === null', () => {
    const cert = createBirthCert({
      workName,
      assets: { blueprints: [] },
    })
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no-plan-lock')
  })

  test('work-removed: work.md 缺失', () => {
    const cert = setupLockedCert({
      workMdContent: 'work A',
      blueprintsContent: 'b',
    })
    rmSync(getWorkMdPath(tmpDir, workName))
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('work-removed')
  })

  test('hash-mismatch: workMd 改', () => {
    const cert = setupLockedCert({
      workMdContent: 'A',
      blueprintsContent: 'b',
    })
    writeFileSync(getWorkMdPath(tmpDir, workName), 'A modified')
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('hash-mismatch')
      expect(r.component).toBe('workMd')
    }
  })
  // 🆕 Phase B: hash-mismatch: workDomains 测试已删（domains.json 不再生成）

  test('hash-mismatch: blueprints 改', () => {
    const cert = setupLockedCert({
      workMdContent: 'A',
      blueprintsContent: 'b1',
    })
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), 'b1 modified')
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.component).toBe('blueprints')
  })

  test('hash-mismatch: tasks 改', () => {
    const cert = setupLockedCert({
      workMdContent: 'A',
      blueprintsContent: 'b',
      tasks: [{ name: 't1', content: 't1 content' }],
    })
    const tPath = join(getWorkDir(tmpDir, workName), 'tasks', 't1', 'task.md')
    writeFileSync(tPath, 't1 modified')
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.component).toBe('tasks')
  })
})

// ───────── checkAssetsDrift ─────────

describe('checkAssetsDrift', () => {
  // 🆕 v0.6.1-alpha.4 Phase B: 改用 blueprint refs 测试（cert.assets.domains 已删）
  function makeCertWithAssets(blueprints: Array<{ name: string; fileHash: string }>): BirthCert {
    return createBirthCert({
      workName,
      assets: {
        blueprints: blueprints.map((b) => ({ name: b.name, version: 1, fileHash: b.fileHash })),
      },
    })
  }

  test('无漂移：hash 与文件匹配', () => {
    const file = join(tmpDir, 'fake-A.oxn')
    writeFileSync(file, 'A content')
    const cert = makeCertWithAssets([{ name: 'A', fileHash: hashText('A content') }])
    const r = checkAssetsDrift(cert, (_k, n) => (n === 'A' ? file : null))
    expect(r.blueprint).toEqual([]) // 🆕 Phase B: cert.assets.domains 已删，drift 走 blueprint
  })

  test('文件改了 → expected/actual 都报告', () => {
    const file = join(tmpDir, 'fake-A.oxn')
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
