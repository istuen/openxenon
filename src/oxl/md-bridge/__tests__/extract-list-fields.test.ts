/**
 * src/oxl/md-bridge/__tests__/extract-list-fields.test.ts
 *
 * 列表字段递归提取器测试
 *
 * 覆盖：
 * - 标量字段 "- key: value"
 * - 数组字段 "- key:" + 子 list（listItem 是标量）
 * - 嵌套字段 "- key:" + 子 list（listItem 是 "- sub: value"）
 * - 嵌套字段递归 2 层
 * - maxDepth 守卫
 * - 便捷函数：getScalar / getArray / getNestedFields
 */

import { describe, test, expect } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root, List } from 'mdast'
import { extractListFields, fieldsToRecord, getScalar, getArray, getNestedFields } from '../extract-list-fields.js'

/** 工具：MD 字符串 → 第一个 list 节点 */
function parseFirstList(md: string): List {
  const root = unified().use(remarkParse).parse(md) as Root
  const list = root.children.find((c) => c.type === 'list') as List
  if (!list) throw new Error('No list found in input MD')
  return list
}

describe('extractListFields — 标量', () => {
  test('单标量字段', () => {
    const list = parseFirstList('- name: Intent\n')
    const fields = extractListFields(list)
    expect(fields).toEqual([{ key: 'name', value: 'Intent' }])
  })

  test('多标量字段', () => {
    const list = parseFirstList('- type: enum\n- required: true\n- default: dev\n')
    const fields = extractListFields(list)
    expect(fields).toEqual([
      { key: 'type', value: 'enum' },
      { key: 'required', value: 'true' },
      { key: 'default', value: 'dev' },
    ])
  })

  test('标量值带空格', () => {
    const list = parseFirstList('- desc: 声明式意图不可执行\n')
    const fields = extractListFields(list)
    expect(fields[0]?.value).toBe('声明式意图不可执行')
  })
})

describe('extractListFields — 数组', () => {
  test('单元素数组', () => {
    const list = parseFirstList('- deps:\n  - build\n')
    const fields = extractListFields(list)
    expect(fields).toEqual([{ key: 'deps', value: ['build'] }])
  })

  test('多元素数组', () => {
    const list = parseFirstList('- deps:\n  - build\n  - test\n  - lint\n')
    const fields = extractListFields(list)
    expect(fields).toEqual([{ key: 'deps', value: ['build', 'test', 'lint'] }])
  })

  test('空 deps 数组', () => {
    const list = parseFirstList('- deps: []\n')
    const fields = extractListFields(list)
    expect(fields).toEqual([{ key: 'deps', value: '[]' }])
  })
})

describe('extractListFields — 嵌套字段', () => {
  test('单层嵌套字段', () => {
    const list = parseFirstList('- part: build_module\n  - skill_context: 打包\n  - probe: test\n    - scheme: fs\n')
    const fields = extractListFields(list)
    expect(fields).toHaveLength(1)
    expect(fields[0]?.key).toBe('part')
    expect(Array.isArray(fields[0]?.value)).toBe(true)
    if (Array.isArray(fields[0]?.value)) {
      expect(fields[0]?.value).toHaveLength(2)
      expect(fields[0]?.value[0]).toEqual({ key: 'skill_context', value: '打包' })
    }
  })

  test('递归嵌套字段（probe 内有 scheme）', () => {
    const list = parseFirstList('- part: build\n  - probe: test\n    - scheme: fs\n    - expect: exists=true\n')
    const fields = extractListFields(list)
    const partField = fields[0]
    if (partField && Array.isArray(partField.value)) {
      const probeField = partField.value[0]
      if (probeField && Array.isArray(probeField.value)) {
        expect(probeField.value).toHaveLength(2)
        expect(probeField.value[0]).toEqual({ key: 'scheme', value: 'fs' })
        expect(probeField.value[1]).toEqual({ key: 'expect', value: 'exists=true' })
      }
    }
  })
})

describe('extractListFields — maxDepth 守卫', () => {
  test('超 maxDepth 返回字符串数组（防无限递归）', () => {
    const list = parseFirstList('- a:\n  - b:\n    - c:\n      - d: value\n')
    const fields = extractListFields(list, { maxDepth: 1 })
    expect(fields).toHaveLength(1)
    expect(fields[0]?.key).toBe('a')
    expect(Array.isArray(fields[0]?.value)).toBe(true)
  })
})

describe('便捷函数', () => {
  function setup() {
    return parseFirstList(
      '- name: Intent\n- desc: declaration\n- deps:\n  - build\n  - test\n- part: p1\n  - skill: x\n',
    )
  }

  test('fieldsToRecord 转扁平 Record', () => {
    const list = setup()
    const fields = extractListFields(list)
    const record = fieldsToRecord(fields)
    expect(record.name).toBe('Intent')
    expect(record.desc).toBe('declaration')
    expect(record.deps).toEqual(['build', 'test'])
  })

  test('getScalar 返字符串', () => {
    const fields = extractListFields(setup())
    expect(getScalar(fields, 'name')).toBe('Intent')
    expect(getScalar(fields, 'desc')).toBe('declaration')
    expect(getScalar(fields, 'missing')).toBeUndefined()
  })

  test('getArray 返字符串数组', () => {
    const fields = extractListFields(setup())
    expect(getArray(fields, 'deps')).toEqual(['build', 'test'])
    expect(getArray(fields, 'missing')).toEqual([])
  })

  test('getNestedFields 返嵌套 ListField[]', () => {
    const fields = extractListFields(setup())
    const nested = getNestedFields(fields, 'part')
    expect(nested).toHaveLength(1)
    expect(nested[0]?.key).toBe('skill')
    expect(nested[0]?.value).toBe('x')
  })
})
