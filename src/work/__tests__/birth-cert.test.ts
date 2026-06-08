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
import { getWorkBlueprintsJsonPath, getWorkDomainsJsonPath, getWorkOxnPath } from '../plan-hash'

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
const HASH_B = makeHash64('domain-B-content')
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
      mode: 'task',
      editTarget: null,
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { domains: [], blueprints: [] },
      planLock: null,
    }
    expect(BirthCertSchema.safeParse(cert).success).toBe(true)
  })

  test('mode 必须是 task | explore | edit', () => {
    const base: BirthCert = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      mode: 'task',
      editTarget: null,
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { domains: [], blueprints: [] },
      planLock: null,
    }
    expect(BirthCertSchema.safeParse({ ...base, mode: 'task' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, mode: 'explore' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, mode: 'edit' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, mode: 'proof' }).success).toBe(false) // V1 不允许
    expect(BirthCertSchema.safeParse({ ...base, mode: 'unknown' }).success).toBe(false)
  })

  test('editTarget 格式校验：domain:X / blueprint:X', () => {
    const base: BirthCert = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      mode: 'edit',
      editTarget: null,
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { domains: [], blueprints: [] },
      planLock: null,
    }
    expect(BirthCertSchema.safeParse({ ...base, editTarget: 'domain:MemberContext' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, editTarget: 'blueprint:fix-issue' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, editTarget: 'MemberContext' }).success).toBe(false)
    expect(BirthCertSchema.safeParse({ ...base, editTarget: 'domain:' }).success).toBe(false)
  })

  test('workName 必须是 kebab-case', () => {
    const base = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      mode: 'task' as const,
      editTarget: null,
      goal: '',
      constraints: [],
      maxIterations: 3,
      assets: { domains: [], blueprints: [] },
      planLock: null,
    }
    expect(BirthCertSchema.safeParse({ ...base, workName: 'foo' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, workName: 'foo-bar' }).success).toBe(true)
    expect(BirthCertSchema.safeParse({ ...base, workName: 'Foo' }).success).toBe(false) // PascalCase
    expect(BirthCertSchema.safeParse({ ...base, workName: 'foo_bar' }).success).toBe(false) // snake
    expect(BirthCertSchema.safeParse({ ...base, workName: '-foo' }).success).toBe(false) // leading dash
  })

  test('fileHash 必须是 64-char hex', () => {
    const base = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      mode: 'task' as const,
      editTarget: null,
      goal: '',
      constraints: [],
      maxIterations: 3,
    }
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: { domains: [{ name: 'A', scope: '@prj', version: 1, fileHash: HASH_A }], blueprints: [] },
        planLock: null,
      }).success,
    ).toBe(true)
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: {
          domains: [{ name: 'A', scope: '@prj', version: 1, fileHash: 'not-hex' }],
          blueprints: [],
        },
        planLock: null,
      }).success,
    ).toBe(false)
  })

  test('scope 必须是 @oxn | @prj', () => {
    const base = {
      schemaVersion: 1,
      kind: 'work-birth-cert',
      workName: 'foo',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
      mode: 'task' as const,
      editTarget: null,
      goal: '',
      constraints: [],
      maxIterations: 3,
    }
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: { domains: [{ name: 'A', scope: '@oxn', version: 1, fileHash: HASH_A }], blueprints: [] },
        planLock: null,
      }).success,
    ).toBe(true)
    expect(
      BirthCertSchema.safeParse({
        ...base,
        assets: { domains: [{ name: 'A', scope: '@glo', version: 1, fileHash: HASH_A }], blueprints: [] }, // 历史作用域
        planLock: null,
      }).success,
    ).toBe(false)
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
      mode: 'task',
      goal: 'demo',
      assets: {
        domains: [{ name: 'A', version: 1, fileHash: HASH_A }],
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
      expect(r.cert.mode).toBe('task')
      expect(r.cert.assets.domains[0]?.name).toBe('A')
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
  test('最小参数（mode + assets）', () => {
    const c = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [], blueprints: [] },
    })
    expect(c.schemaVersion).toBe(1)
    expect(c.kind).toBe('work-birth-cert')
    expect(c.mode).toBe('task')
    expect(c.editTarget).toBe(null)
    expect(c.goal).toBe('')
    expect(c.constraints).toEqual([])
    expect(c.maxIterations).toBe(3)
    expect(c.planLock).toBe(null)
  })

  test('scope 默认 @prj', () => {
    const c = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [{ name: 'A', version: 1, fileHash: HASH_A }], blueprints: [] },
    })
    expect(c.assets.domains[0]?.scope).toBe('@prj')
  })

  test('显式 scope=@oxn', () => {
    const c = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [{ name: 'A', scope: '@oxn', version: 1, fileHash: HASH_A }], blueprints: [] },
    })
    expect(c.assets.domains[0]?.scope).toBe('@oxn')
  })

  test('createdAt/updatedAt 自动填当前时间（可覆盖）', () => {
    const c = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [], blueprints: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(c.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(c.updatedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  test('edit mode + editTarget', () => {
    const c = createBirthCert({
      workName,
      mode: 'edit',
      editTarget: 'domain:MemberContext',
      assets: { domains: [], blueprints: [] },
    })
    expect(c.mode).toBe('edit')
    expect(c.editTarget).toBe('domain:MemberContext')
  })
})

// ───────── applyPlanLock / clearPlanLock ─────────

describe('applyPlanLock / clearPlanLock', () => {
  test('applyPlanLock 设置 4 组件 hash + lockedAt', () => {
    const base = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [], blueprints: [] },
    })
    const hash = {
      workOxnHash: HASH_A,
      workDomainsHash: HASH_B,
      blueprintsHash: HASH_BP,
      tasksHash: HASH_A,
      allHash: 'placeholder',
      missing: [],
    }
    const locked = applyPlanLock(base, hash, '2026-06-08T01:00:00.000Z')
    expect(locked.planLock).not.toBe(null)
    expect(locked.planLock?.lockedAt).toBe('2026-06-08T01:00:00.000Z')
    expect(locked.planLock?.workOxnHash).toBe(HASH_A)
    expect(locked.updatedAt).toBe('2026-06-08T01:00:00.000Z')
  })

  test('applyPlanLock 任一组件为 null → 抛错', () => {
    const base = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [], blueprints: [] },
    })
    expect(() =>
      applyPlanLock(base, {
        workOxnHash: null,
        workDomainsHash: HASH_B,
        blueprintsHash: HASH_BP,
        tasksHash: HASH_A,
        allHash: null,
        missing: ['work.oxn'],
      }),
    ).toThrow(/incomplete plan hash/)
  })

  test('clearPlanLock 重置 planLock=null + 更新 updatedAt', () => {
    const base = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [], blueprints: [] },
    })
    const hash = {
      workOxnHash: HASH_A,
      workDomainsHash: HASH_B,
      blueprintsHash: HASH_BP,
      tasksHash: HASH_A,
      allHash: 'x',
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
      mode: 'task',
      assets: { domains: [], blueprints: [] },
    })
    const hash = {
      workOxnHash: HASH_A,
      workDomainsHash: HASH_B,
      blueprintsHash: HASH_BP,
      tasksHash: HASH_A,
      allHash: 'x',
      missing: [],
    }
    applyPlanLock(base, hash)
    expect(base.planLock).toBe(null) // 原对象未变
  })
})

// ───────── verifyPlanLock ─────────

describe('verifyPlanLock', () => {
  function setupLockedCert(params: {
    workOxnContent: string
    domainsContent: string
    blueprintsContent: string
    tasks?: Array<{ name: string; content: string }>
  }): BirthCert {
    writeFileSync(getWorkOxnPath(tmpDir, workName), params.workOxnContent)
    writeFileSync(getWorkDomainsJsonPath(tmpDir, workName), params.domainsContent)
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), params.blueprintsContent)
    for (const t of params.tasks ?? []) {
      const dir = join(getWorkDir(tmpDir, workName), 'tasks', t.name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'task.oxn'), t.content)
    }
    const base = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [], blueprints: [] },
    })
    // 直接构造 planLock（避免依赖 hashWorkPlan 模块）
    // 注意：tasksHash 的计算公式必须与 plan-hash.ts 的 hashWorkPlan 完全一致
    const locked: BirthCert = {
      ...base,
      planLock: {
        lockedAt: '2026-06-08T00:00:00.000Z',
        workOxnHash: hashText(params.workOxnContent),
        workDomainsHash: hashText(params.domainsContent),
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
      workOxnContent: 'work A',
      domainsContent: 'domains A',
      blueprintsContent: 'bp A',
      tasks: [{ name: 't1', content: 't1 content' }],
    })
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(true)
  })

  test('no-plan-lock: cert.planLock === null', () => {
    const cert = createBirthCert({
      workName,
      mode: 'task',
      assets: { domains: [], blueprints: [] },
    })
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no-plan-lock')
  })

  test('work-removed: work.oxn 缺失', () => {
    const cert = setupLockedCert({
      workOxnContent: 'work A',
      domainsContent: 'd',
      blueprintsContent: 'b',
    })
    rmSync(getWorkOxnPath(tmpDir, workName))
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('work-removed')
  })

  test('hash-mismatch: workOxn 改', () => {
    const cert = setupLockedCert({
      workOxnContent: 'A',
      domainsContent: 'd',
      blueprintsContent: 'b',
    })
    writeFileSync(getWorkOxnPath(tmpDir, workName), 'A modified')
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('hash-mismatch')
      expect(r.component).toBe('workOxn')
    }
  })

  test('hash-mismatch: workDomains 改', () => {
    const cert = setupLockedCert({
      workOxnContent: 'A',
      domainsContent: 'd1',
      blueprintsContent: 'b',
    })
    writeFileSync(getWorkDomainsJsonPath(tmpDir, workName), 'd1 modified')
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.component).toBe('workDomains')
  })

  test('hash-mismatch: blueprints 改', () => {
    const cert = setupLockedCert({
      workOxnContent: 'A',
      domainsContent: 'd',
      blueprintsContent: 'b1',
    })
    writeFileSync(getWorkBlueprintsJsonPath(tmpDir, workName), 'b1 modified')
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.component).toBe('blueprints')
  })

  test('hash-mismatch: tasks 改', () => {
    const cert = setupLockedCert({
      workOxnContent: 'A',
      domainsContent: 'd',
      blueprintsContent: 'b',
      tasks: [{ name: 't1', content: 't1 content' }],
    })
    const tPath = join(getWorkDir(tmpDir, workName), 'tasks', 't1', 'task.oxn')
    writeFileSync(tPath, 't1 modified')
    const r = verifyPlanLock(tmpDir, workName, cert)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.component).toBe('tasks')
  })
})

// ───────── checkAssetsDrift ─────────

describe('checkAssetsDrift', () => {
  function makeCertWithAssets(domains: Array<{ name: string; fileHash: string }>): BirthCert {
    return createBirthCert({
      workName,
      mode: 'task',
      assets: {
        domains: domains.map((d) => ({ name: d.name, version: 1, fileHash: d.fileHash })),
        blueprints: [],
      },
    })
  }

  test('无漂移：hash 与文件匹配', () => {
    const file = join(tmpDir, 'fake-A.oxn')
    writeFileSync(file, 'A content')
    const cert = makeCertWithAssets([{ name: 'A', fileHash: hashText('A content') }])
    const r = checkAssetsDrift(cert, (_k, n) => (n === 'A' ? file : null))
    expect(r.domain).toEqual([])
  })

  test('文件改了 → expected/actual 都报告', () => {
    const file = join(tmpDir, 'fake-A.oxn')
    writeFileSync(file, 'A content')
    const cert = makeCertWithAssets([{ name: 'A', fileHash: hashText('A OLD') }])
    const r = checkAssetsDrift(cert, (_k, n) => (n === 'A' ? file : null))
    expect(r.domain).toHaveLength(1)
    expect(r.domain[0]?.name).toBe('A')
    expect(r.domain[0]?.expected).toBe(hashText('A OLD'))
    expect(r.domain[0]?.actual).toBe(hashText('A content'))
  })

  test('resolver 返回 null → 报告 actual:null（文件漂到删了）', () => {
    const cert = makeCertWithAssets([{ name: 'A', fileHash: HASH_A }])
    const r = checkAssetsDrift(cert, () => null)
    expect(r.domain).toHaveLength(1)
    expect(r.domain[0]?.actual).toBe(null)
  })
})
