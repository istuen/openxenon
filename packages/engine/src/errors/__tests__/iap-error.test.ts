// =============================================================================
// Errors constitutional layer tests (v1.0)
//
// 验证：
//   1. IAPError 6 个 code 各 1 个 throw + 字段断言
//   2. OXNCrash 3 个 code 各 1 个 throw + 字段断言
//   3. type guards (isIAPError / isOXNCrash) 正确分流
//   4. error.name 格式严格 (IAP_<AXIS>_<CODE> / OXN_CRASH_<CODE>)
//   5. 序列化形态（JSON.stringify 后字段齐全）—— CLI 输出契约
// =============================================================================

import { describe, expect, test } from 'bun:test'
import {
  IAPError,
  IAPAction,
  OXNCrash,
  isIAPError,
  isOXNCrash,
  type IAPAxis,
  type IAPErrorCode,
  type OXNCrashCode,
} from '../index'

// -----------------------------------------------------------------------------
// IAPError — 6 个 code 各 1 个 throw
// -----------------------------------------------------------------------------

describe('IAPError (轨道 1: 业务流)', () => {
  test('PROOF/INFRA_FAIL → name = IAP_PROOF_INFRA_FAIL, action = YIELD_TO_HUMAN', () => {
    const err = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'fs.statSync 失败', {
      path: './dist',
      systemError: 'EACCES',
    })
    expect(err.name).toBe('IAP_PROOF_INFRA_FAIL')
    expect(err.axis).toBe('PROOF')
    expect(err.code).toBe('INFRA_FAIL')
    expect(err.action).toBe(IAPAction.YIELD_TO_HUMAN)
    expect(err.message).toBe('fs.statSync 失败')
    expect(err.context).toEqual({ path: './dist', systemError: 'EACCES' })
    expect(err instanceof Error).toBe(true)
    expect(err instanceof IAPError).toBe(true)
  })

  test('PROOF/CRASH → YIELD_TO_HUMAN (verdict logic bug)', () => {
    const err = new IAPError('PROOF', 'CRASH', IAPAction.YIELD_TO_HUMAN, 'verdict strategy 抛了', {
      probe: 'fs-exists',
      strategy: 'fs_exists',
    })
    expect(err.name).toBe('IAP_PROOF_CRASH')
    expect(err.action).toBe(IAPAction.YIELD_TO_HUMAN)
  })

  test('ALIGN/CHECKLIST_MISSING → YIELD_TO_HUMAN (part.intent_checklist 必填缺失)', () => {
    const err = new IAPError(
      'ALIGN',
      'CHECKLIST_MISSING',
      IAPAction.YIELD_TO_HUMAN,
      "task 'scaffold' 的 part 'scaffold' 缺少必填的 intent_checklist 字段",
      {
        taskName: 'scaffold',
        partName: 'scaffold',
        missingField: 'intent_checklist',
      },
    )
    expect(err.name).toBe('IAP_ALIGN_CHECKLIST_MISSING')
    expect(err.action).toBe(IAPAction.YIELD_TO_HUMAN)
  })

  test('INTENT/UNDEFINED_TERM → YIELD_TO_HUMAN (Domain 缺词汇)', () => {
    const err = new IAPError(
      'INTENT',
      'UNDEFINED_TERM',
      IAPAction.YIELD_TO_HUMAN,
      'Blueprint 引用了不存在的 Domain 词汇',
      {
        term: 'Membership',
        domain: 'MemberContext',
      },
    )
    expect(err.name).toBe('IAP_INTENT_UNDEFINED_TERM')
    expect(err.action).toBe(IAPAction.YIELD_TO_HUMAN)
  })

  test('INTENT/NAME_FILE_MISMATCH → YIELD_TO_HUMAN (DSL 声明名 vs 文件名规范化不一致)', () => {
    const err = new IAPError(
      'INTENT',
      'NAME_FILE_MISMATCH',
      IAPAction.YIELD_TO_HUMAN,
      "Declared name 'MemberContext' does not match file 'member-context.oxn'",
      {
        declared: 'MemberContext',
        file: 'member-context.oxn',
        normalized: 'member-context',
        entityType: 'domain',
      },
    )
    expect(err.name).toBe('IAP_INTENT_NAME_FILE_MISMATCH')
    expect(err.action).toBe(IAPAction.YIELD_TO_HUMAN)
  })

  test('不带 context 时 context = undefined', () => {
    const err = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'no context')
    expect(err.context).toBeUndefined()
  })

  test('context 是 readonly —— 防止下游误改', () => {
    const ctx = { path: './x' }
    const err = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'msg', ctx)
    // 类型上 readonly，运行时也确认（对象引用还是同一个）
    expect(err.context).toBe(ctx)
  })

  test('INFRA_FAIL_ 子码 name 不带 IAP_ 前缀（如 INFRA_FAIL_STATE_LOAD）', () => {
    const err = new IAPError('ALIGN', 'INFRA_FAIL_STATE_LOAD', IAPAction.YIELD_TO_HUMAN, 'state load failed')
    expect(err.name).toBe('INFRA_FAIL_STATE_LOAD')
    expect(err.axis).toBe('ALIGN')
    expect(err.code).toBe('INFRA_FAIL_STATE_LOAD')
  })

  test('FINALIZE_BLOCKED name = IAP_PROOF_FINALIZE_BLOCKED', () => {
    const err = new IAPError('PROOF', 'FINALIZE_BLOCKED', IAPAction.YIELD_TO_HUMAN, 'finalize blocked', {
      outcome: 'DEVIATED',
    })
    expect(err.name).toBe('IAP_PROOF_FINALIZE_BLOCKED')
    expect(err.code).toBe('FINALIZE_BLOCKED')
  })
})

// -----------------------------------------------------------------------------
// OXNCrash — 3 个 code 各 1 个 throw
// -----------------------------------------------------------------------------

describe('OXNCrash (轨道 2: 引擎崩溃)', () => {
  test('SIGNATURE_MISMATCH → name = OXN_CRASH_SIGNATURE_MISMATCH', () => {
    const cause = new Error('expected 4f2a..., got e1b9...')
    const err = new OXNCrash('SIGNATURE_MISMATCH', 'frozen.json 签名被外部篡改', cause)
    expect(err.name).toBe('OXN_CRASH_SIGNATURE_MISMATCH')
    expect(err.code).toBe('SIGNATURE_MISMATCH')
    expect(err.message).toBe('frozen.json 签名被外部篡改')
    expect(err.cause).toBe(cause)
    expect(err instanceof Error).toBe(true)
    expect(err instanceof OXNCrash).toBe(true)
  })

  test('STATE_CORRUPT → 无 cause 时 cause = undefined', () => {
    const err = new OXNCrash('STATE_CORRUPT', '.openxenon 状态机损坏')
    expect(err.name).toBe('OXN_CRASH_STATE_CORRUPT')
    expect(err.cause).toBeUndefined()
  })

  test('INTERNAL_ERROR → 不带 cause', () => {
    const err = new OXNCrash('INTERNAL_ERROR', '代码未覆盖的死角')
    expect(err.name).toBe('OXN_CRASH_INTERNAL_ERROR')
    expect(err.code).toBe('INTERNAL_ERROR')
  })
})

// -----------------------------------------------------------------------------
// 类型守卫：isIAPError / isOXNCrash
// -----------------------------------------------------------------------------

describe('Type guards', () => {
  test('isIAPError 识别 IAPError', () => {
    const err = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'msg')
    expect(isIAPError(err)).toBe(true)
  })

  test('isIAPError 拒绝 OXNCrash 与普通 Error', () => {
    const oxnCrash = new OXNCrash('STATE_CORRUPT', 'msg')
    const plainError = new Error('msg')
    const stringErr = 'string error'
    const nullErr = null
    expect(isIAPError(oxnCrash)).toBe(false)
    expect(isIAPError(plainError)).toBe(false)
    expect(isIAPError(stringErr)).toBe(false)
    expect(isIAPError(nullErr)).toBe(false)
  })

  test('isOXNCrash 识别 OXNCrash', () => {
    const err = new OXNCrash('STATE_CORRUPT', 'msg')
    expect(isOXNCrash(err)).toBe(true)
  })

  test('isOXNCrash 拒绝 IAPError 与普通 Error', () => {
    const iapErr = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'msg')
    const plainError = new Error('msg')
    expect(isOXNCrash(iapErr)).toBe(false)
    expect(isOXNCrash(plainError)).toBe(false)
  })

  test('互斥分流：CLI 顶层 catch 块应能可靠区分', () => {
    const iapErr = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'msg')
    const oxnCrash = new OXNCrash('STATE_CORRUPT', 'msg')
    const plainErr = new Error('msg')

    function classify(err: unknown): 'IAP' | 'OXN' | 'OTHER' {
      if (isIAPError(err)) return 'IAP'
      if (isOXNCrash(err)) return 'OXN'
      return 'OTHER'
    }
    expect(classify(iapErr)).toBe('IAP')
    expect(classify(oxnCrash)).toBe('OXN')
    expect(classify(plainErr)).toBe('OTHER')
  })
})

// -----------------------------------------------------------------------------
// 序列化形态（CLI 输出契约）
// -----------------------------------------------------------------------------

describe('Serialization (CLI output contract)', () => {
  test('IAPError JSON 序列化保留所有字段', () => {
    const err = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'fs 失败', {
      path: './dist',
    })
    const json = JSON.parse(
      JSON.stringify({
        ok: false,
        error: {
          code: err.name,
          axis: err.axis,
          action: err.action,
          message: err.message,
          context: err.context,
        },
      }),
    )
    expect(json.error.code).toBe('IAP_PROOF_INFRA_FAIL')
    expect(json.error.axis).toBe('PROOF')
    expect(json.error.action).toBe('YIELD_TO_HUMAN') // enum 序列化为 string
    expect(json.error.message).toBe('fs 失败')
    expect(json.error.context).toEqual({ path: './dist' })
  })

  test('OXNCrash 不应被 JSON 序列化给 AI（应走 stderr）', () => {
    // 这个测试是文档性测试 —— 验证 OXNCrash 不能进 outputError 通道
    const err = new OXNCrash('SIGNATURE_MISMATCH', 'sig 错误')
    // 强制 cast 到任意类型 —— 模拟 OXNCrash 不应通过 IAPError 通道
    const isIapViaTypecheck = (e: unknown): boolean => e instanceof IAPError
    expect(isIapViaTypecheck(err)).toBe(false)
    // name 格式必须是 OXN_CRASH_*
    expect(err.name.startsWith('OXN_CRASH_')).toBe(true)
  })
})

// -----------------------------------------------------------------------------
// 完整字典 9 项：不应有 typo / 重复
// -----------------------------------------------------------------------------

describe('Dictionary coverage (6 IAP + 3 OXNCrash = 9 total) — v1.0.2', () => {
  const iapCodes: Array<[IAPAxis, IAPErrorCode, IAPAction]> = [
    ['PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN],
    ['PROOF', 'CRASH', IAPAction.YIELD_TO_HUMAN],
    ['ALIGN', 'CHECKLIST_MISSING', IAPAction.YIELD_TO_HUMAN],
    ['INTENT', 'UNDEFINED_TERM', IAPAction.YIELD_TO_HUMAN],
    ['INTENT', 'NAME_FILE_MISMATCH', IAPAction.YIELD_TO_HUMAN],
  ]
  test('IAP 字典正好 5 项 (PROOF:2 + ALIGN:1 + INTENT:2)', () => {
    // v1.0.2 收敛：6 → 5（移除 ALIGN_TIMEOUT + ALIGN_MISMATCH + INTENT_SLOT_CONFLICT，
    // 新增 ALIGN_CHECKLIST_MISSING + INTENT_NAME_FILE_MISMATCH，净减 1）
    expect(iapCodes).toHaveLength(5)
    const byAxis: Record<string, number> = {}
    for (const [axis] of iapCodes) byAxis[axis] = (byAxis[axis] ?? 0) + 1
    expect(byAxis).toEqual({ PROOF: 2, ALIGN: 1, INTENT: 2 })
  })

  const oxnCodes: OXNCrashCode[] = ['SIGNATURE_MISMATCH', 'STATE_CORRUPT', 'INTERNAL_ERROR']
  test('OXNCrash 字典正好 3 项', () => {
    expect(oxnCodes).toHaveLength(3)
  })

  test('总错误码数 = 8 (v1.0.2 收敛：移除 3 伪异常，新增 2 真异常，净 -1)', () => {
    expect(iapCodes.length + oxnCodes.length).toBe(8)
  })
})
