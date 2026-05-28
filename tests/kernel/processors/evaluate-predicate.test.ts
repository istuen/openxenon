import { describe, expect, it } from 'bun:test'
import {
  evaluatePredicate,
  validateSchemaGeneric,
  transformData,
} from '../../../src/kernel/processors/evaluate-predicate'

describe('evaluatePredicate', () => {
  describe('eq operator', () => {
    it('相等时 passed=true', () => {
      const result = evaluatePredicate('test', 'test', 'eq')
      expect(result.passed).toBe(true)
      expect(result.message).toBe('Equal')
    })

    it('不相等时 passed=false', () => {
      const result = evaluatePredicate('test', 'other', 'eq')
      expect(result.passed).toBe(false)
      expect(result.message).toContain('!==')
    })

    it('不同类型比较（1 === "1" 为 false）', () => {
      const result = evaluatePredicate(1, '1', 'eq')
      expect(result.passed).toBe(false)
    })
  })

  describe('neq operator', () => {
    it('不相等时 passed=true', () => {
      const result = evaluatePredicate('test', 'other', 'neq')
      expect(result.passed).toBe(true)
    })

    it('相等时 passed=false', () => {
      const result = evaluatePredicate('test', 'test', 'neq')
      expect(result.passed).toBe(false)
    })
  })

  describe('gt operator', () => {
    it('数值比较正确', () => {
      const result = evaluatePredicate(5, 10, 'gt')
      expect(result.passed).toBe(true)
    })

    it('非数值操作数被 Number() 转换后比较', () => {
      const result = evaluatePredicate(5, '10', 'gt')
      expect(result.passed).toBe(true)
    })

    it('NaN 比较结果为 false', () => {
      const result = evaluatePredicate(5, NaN, 'gt')
      expect(result.passed).toBe(false)
    })
  })

  describe('gte operator', () => {
    it('数值比较正确', () => {
      const result = evaluatePredicate(5, 5, 'gte')
      expect(result.passed).toBe(true)
    })

    it('NaN 比较返回 false', () => {
      const result = evaluatePredicate(5, NaN, 'gte')
      expect(result.passed).toBe(false)
    })
  })

  describe('lt operator', () => {
    it('数值比较正确', () => {
      const result = evaluatePredicate(10, 5, 'lt')
      expect(result.passed).toBe(true)
    })

    it('NaN 比较返回 false', () => {
      const result = evaluatePredicate(5, NaN, 'lt')
      expect(result.passed).toBe(false)
    })
  })

  describe('lte operator', () => {
    it('数值比较正确', () => {
      const result = evaluatePredicate(5, 5, 'lte')
      expect(result.passed).toBe(true)
    })
  })

  describe('regex operator', () => {
    it('匹配时 passed=true', () => {
      const result = evaluatePredicate('^test', 'testing', 'regex')
      expect(result.passed).toBe(true)
      expect(result.message).toBe('Pattern matched')
    })

    it('不匹配时 passed=false', () => {
      const result = evaluatePredicate('^test', 'other', 'regex')
      expect(result.passed).toBe(false)
    })

    it('无效正则表达式返回 passed=false', () => {
      const result = evaluatePredicate('[[', 'test', 'regex')
      expect(result.passed).toBe(false)
      expect(result.message).toContain('Invalid regex pattern')
    })

    it('非字符串操作数返回 passed=false', () => {
      const result = evaluatePredicate('test', 123 as any, 'regex')
      expect(result.passed).toBe(false)
      expect(result.message).toContain('requires string operands')
    })

    it('正则特殊字符正确处理', () => {
      const result = evaluatePredicate('a\\.b', 'a.b', 'regex')
      expect(result.passed).toBe(true)
    })
  })

  describe('contains operator', () => {
    it('包含时 passed=true', () => {
      const result = evaluatePredicate('test', 'testing', 'contains')
      expect(result.passed).toBe(true)
    })

    it('不包含时 passed=false', () => {
      const result = evaluatePredicate('test', 'other', 'contains')
      expect(result.passed).toBe(false)
    })

    it('非字符串操作数返回 passed=false', () => {
      const result = evaluatePredicate('test', 123 as any, 'contains')
      expect(result.passed).toBe(false)
      expect(result.message).toContain('requires string operands')
    })

    it('空字符串 contains 空字符串返回 true', () => {
      const result = evaluatePredicate('', '', 'contains')
      expect(result.passed).toBe(true)
    })
  })

  describe('数值操作符边界', () => {
    it('null 被 Number() 转为 0', () => {
      const result = evaluatePredicate(0, null, 'gte')
      expect(result.passed).toBe(true)
    })

    it('undefined 被 Number() 转为 NaN', () => {
      const result = evaluatePredicate(5, undefined, 'gt')
      expect(result.passed).toBe(false)
    })
  })

  describe('default 分支', () => {
    it('未知操作符返回 passed=false', () => {
      const result = evaluatePredicate('a', 'b', 'unknown' as any)
      expect(result.passed).toBe(false)
      expect(result.message).toContain('Unknown operator')
    })
  })
})

describe('validateSchemaGeneric', () => {
  describe('正常路径', () => {
    it('shape 为 null 时直接返回 valid=true', () => {
      const result = validateSchemaGeneric(null as any, {})
      expect(result.valid).toBe(true)
    })

    it('类型匹配时 valid=true', () => {
      const shape = { type: 'object' }
      const result = validateSchemaGeneric(shape, { name: 'test' })
      expect(result.valid).toBe(true)
    })

    it('required 字段都存在时 valid=true', () => {
      const shape = { required: ['name', 'age'] }
      const actual = { name: 'test', age: 25 }
      const result = validateSchemaGeneric(shape, actual)
      expect(result.valid).toBe(true)
    })

    it('递归校验 properties 嵌套结构', () => {
      const shape = {
        type: 'object',
        properties: {
          user: { type: 'object' },
        },
      }
      const actual = { user: { name: 'test', age: 25 } }
      const result = validateSchemaGeneric(shape, actual)
      expect(result.valid).toBe(true)
    })
  })

  describe('异常路径', () => {
    it('actual 为 null 时 valid=false', () => {
      const shape = { type: 'object' }
      const result = validateSchemaGeneric(shape, null)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Type mismatch')
    })

    it('actual 非对象时 valid=false', () => {
      const shape = { type: 'object' }
      const result = validateSchemaGeneric(shape, 'string' as any)
      expect(result.valid).toBe(false)
    })

    it('类型不匹配时 valid=false', () => {
      const shape = { type: 'string' }
      const result = validateSchemaGeneric(shape, 123)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Type mismatch')
    })

    it('required 字段缺失时 valid=false', () => {
      const shape = { required: ['name'] }
      const actual = {}
      const result = validateSchemaGeneric(shape, actual)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing required')
    })

    it('array 类型判断', () => {
      const shape = { type: 'array' }
      const result = validateSchemaGeneric(shape, [1, 2, 3])
      expect(result.valid).toBe(true)
    })
  })
})

describe('transformData', () => {
  it('字段映射正确执行', () => {
    const source = { a: 1, b: 2 }
    const mapping = {
      rules: [
        { from: 'a', to: 'x' },
        { from: 'b', to: 'y' },
      ],
    }
    const result = transformData(source, mapping)
    expect(result).toEqual({ x: 1, y: 2 })
  })

  it('未匹配的字段使用 defaultValue', () => {
    const source = { a: 1 }
    const mapping = {
      rules: [
        { from: 'a', to: 'x' },
        { from: 'b', to: 'y' },
      ],
      defaultValue: 'N/A',
    }
    const result = transformData(source, mapping)
    expect(result).toEqual({ x: 1, y: 'N/A' })
  })

  it('无 rules 时返回空对象', () => {
    const source = { a: 1 }
    const mapping = { rules: [] }
    const result = transformData(source, mapping)
    expect(result).toEqual({})
  })

  it('嵌套字段映射', () => {
    const source = { user: { name: 'test' } }
    const mapping = { rules: [{ from: 'user', to: 'data' }] }
    const result = transformData(source, mapping)
    expect(result).toEqual({ data: { name: 'test' } })
  })
})
