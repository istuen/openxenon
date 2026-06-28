// =============================================================================
// ref-diagnostic.test.ts — PR-14 单元测试
//
// 覆盖：
//   1. RefDiagnosticSchema 解析合法 / 拒绝非法（severity 枚举、type 枚举、必填字段）
//   2. RefDiagnosticListSchema 接受空数组
//   3. buildDomainDiagnostic 生成正确条目
//   4. buildBlueprintDiagnostic 生成正确条目
//   5. CODE_REFS_UNRESOLVED 字符串值稳定（契约）
//   6. 与 IAPError 字典命名空间物理隔离（IAP_<AXIS>_* 不出现）
// =============================================================================

import { describe, expect, test } from 'bun:test'
import {
  buildBlueprintDiagnostic,
  buildDomainDiagnostic,
  CODE_REFS_UNRESOLVED,
  RefDiagnosticListSchema,
  RefDiagnosticSchema,
  type RefDiagnostic,
} from '../ref-diagnostic'

describe('ref-diagnostic (PR-14)', () => {
  test('1. RefDiagnosticSchema 解析合法条目', () => {
    const d: RefDiagnostic = {
      code: 'OXN_WORK_REFS_UNRESOLVED',
      severity: 'warn',
      ref: 'MemebrContext',
      type: 'domain',
      message: "Domain 'MemebrContext' declared but file not found",
      suggestion: 'Check domain name spelling',
    }
    const r = RefDiagnosticSchema.safeParse(d)
    expect(r.success).toBe(true)
  })

  test('2. RefDiagnosticSchema 拒绝非法 severity', () => {
    const d = {
      code: 'OXN_WORK_REFS_UNRESOLVED',
      severity: 'critical', // 非法
      ref: 'X',
      type: 'domain',
      message: 'm',
      suggestion: 's',
    }
    const r = RefDiagnosticSchema.safeParse(d)
    expect(r.success).toBe(false)
  })

  test('3. RefDiagnosticSchema 拒绝非法 type', () => {
    const d = {
      code: 'OXN_WORK_REFS_UNRESOLVED',
      severity: 'warn',
      ref: 'X',
      type: 'task', // 非法（只支持 domain | blueprint）
      message: 'm',
      suggestion: 's',
    }
    const r = RefDiagnosticSchema.safeParse(d)
    expect(r.success).toBe(false)
  })

  test('4. RefDiagnosticSchema 拒绝空 code/ref/message/suggestion', () => {
    for (const field of ['code', 'ref', 'message', 'suggestion'] as const) {
      const d: Record<string, string> = {
        code: 'X',
        severity: 'warn',
        ref: 'X',
        type: 'domain',
        message: 'm',
        suggestion: 's',
      }
      d[field] = ''
      const r = RefDiagnosticSchema.safeParse(d)
      expect(r.success).toBe(false)
    }
  })

  test('5. RefDiagnosticListSchema 接受空数组', () => {
    const r = RefDiagnosticListSchema.safeParse([])
    expect(r.success).toBe(true)
  })

  test('6. RefDiagnosticListSchema 接受多元素', () => {
    const d = [
      buildDomainDiagnostic('A', '@prj/domains/a', 'not found'),
      buildBlueprintDiagnostic('B', '@prj/blueprints/b', 'not found'),
    ]
    const r = RefDiagnosticListSchema.safeParse(d)
    expect(r.success).toBe(true)
  })

  test('7. buildDomainDiagnostic 生成 6 字段', () => {
    const d = buildDomainDiagnostic('MemebrContext', '@prj/domains/memebr-context', 'domain file not found')
    expect(d.code).toBe(CODE_REFS_UNRESOLVED)
    expect(d.severity).toBe('warn')
    expect(d.type).toBe('domain')
    expect(d.ref).toBe('@prj/domains/memebr-context')
    expect(d.message).toContain('MemebrContext')
    expect(d.message).toContain('domain file not found')
    expect(d.suggestion).toContain('MemebrContext')
  })

  test('8. buildDomainDiagnostic 接受 ref=null（裸名）', () => {
    const d = buildDomainDiagnostic('Foo', null, 'not found')
    expect(d.ref).toBe('Foo') // fallback 到 name
  })

  test('9. buildBlueprintDiagnostic 生成 6 字段', () => {
    const d = buildBlueprintDiagnostic('TsRetrieve', '@prj/blueprints/ts-retrieve', 'blueprint file not found')
    expect(d.code).toBe(CODE_REFS_UNRESOLVED)
    expect(d.severity).toBe('warn')
    expect(d.type).toBe('blueprint')
    expect(d.ref).toBe('@prj/blueprints/ts-retrieve')
    expect(d.message).toContain('TsRetrieve')
    expect(d.suggestion).toContain('blueprint create')
  })

  test('10. CODE_REFS_UNRESOLVED 字符串契约稳定', () => {
    expect(CODE_REFS_UNRESOLVED).toBe('OXN_WORK_REFS_UNRESOLVED')
  })

  test('11. 与 IAPError 命名空间物理隔离（不在 IAP_<AXIS>_* 前缀）', () => {
    const d = buildDomainDiagnostic('X', '@prj/domains/x', 'not found')
    expect(d.code.startsWith('IAP_')).toBe(false)
    // 也不与 IAPError 字典 v1.1 的 8 个 code 重名
    const IAP_CODES = [
      'INFRA_FAIL',
      'CRASH',
      'CHECKLIST_MISSING',
      'LOCK_NOT_FOUND',
      'LOCK_HASH_MISMATCH',
      'WORK_REMOVED',
      'UNDEFINED_TERM',
      'NAME_FILE_MISMATCH',
    ]
    expect(IAP_CODES).not.toContain(d.code)
  })
})
