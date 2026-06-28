// =============================================================================
// ReDoS guard tests for fs-match probe (C4 P0 fix)
//
// 覆盖 src/infra/probes/regex-safety.ts 的 isSafeRegex 检测逻辑。
// 仅单测守卫函数本身, 不集成 executeFsMatch (后者需 tmpdir + 文件 fixture)。
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { isSafeRegex } from '../regex-safety'

describe('isSafeRegex — ReDoS guard (C4 P0)', () => {
  describe('拒收: 已知 ReDoS 攻击模式', () => {
    test('嵌套量词 (a+)+b 拒', () => {
      expect(isSafeRegex('(a+)+b')).toBe(false)
    })

    test('嵌套量词 (a*)* 拒', () => {
      expect(isSafeRegex('(a*)*')).toBe(false)
    })

    test('重叠通配符 .*.+ 拒', () => {
      expect(isSafeRegex('.*.+')).toBe(false)
    })

    test('alternation with overlap (a|a)+ 拒', () => {
      expect(isSafeRegex('(a|a)+')).toBe(false)
    })

    test('长模式 > 200 字符拒 (长度阈值)', () => {
      const longPattern = `[a-z]{1,${'a'.repeat(250)}}`
      expect(isSafeRegex(longPattern)).toBe(false)
    })
  })

  describe('通过: 正常业务 regex', () => {
    test('字符类 [a-z]+ 通过', () => {
      expect(isSafeRegex('[a-z]+')).toBe(true)
    })

    test('数字模式 \\d{3}-\\d{4} 通过', () => {
      expect(isSafeRegex('\\d{3}-\\d{4}')).toBe(true)
    })

    test('email 简易模式 [\\w.+-]+@[\\w.-]+ 通过', () => {
      expect(isSafeRegex('[\\w.+-]+@[\\w.-]+')).toBe(true)
    })

    test('字符类内含量词 [a-z]+ 不被误判', () => {
      // 字符类 [...] 内的 + 不是量词, 应被剥离
      expect(isSafeRegex('[(a-z)+]+')).toBe(true)
    })
  })

  describe('边界情况', () => {
    test('空字符串拒', () => {
      expect(isSafeRegex('')).toBe(false)
    })

    test('非字符串类型拒', () => {
      expect(isSafeRegex(null as unknown as string)).toBe(false)
      expect(isSafeRegex(undefined as unknown as string)).toBe(false)
      expect(isSafeRegex(123 as unknown as string)).toBe(false)
    })

    test('自定义 maxSafeLength 生效', () => {
      const pattern = `[a-z]{1,50}${'a'.repeat(60)}`
      expect(isSafeRegex(pattern, { maxSafeLength: 30 })).toBe(false)
      expect(isSafeRegex(pattern, { maxSafeLength: 200 })).toBe(true)
    })

    test('转义量词 \\+ \\* 不触发嵌套检测', () => {
      // 转义符应被剥离, 剩余无嵌套
      expect(isSafeRegex('\\+ \\*')).toBe(true)
    })
  })
})
