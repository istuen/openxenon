// =============================================================================
// json-path probe (RFC-0016 D3)
//
// 验证 JSON 文件中 JSONPath 值匹配预期。
//
// 一等公民 verdict: 不依赖 jq (跨平台命令不统一: jq/python-c/node-e),
//   用 Node JSON.parse + 自实现简化 JSONPath (约 50 行, 支持 $.a / $.a.b / $.a[0] / $.a[*])。
//
// 简化 JSONPath 子集 (RFC-0016 D3 决策):
//   - $.<key>           — object key 访问
//   - $.<key>.<key>     — 嵌套 object key
//   - $.<key>[<index>]  — array index 访问
//   - $.<key>[*]        — array 全展开 (匹配任一元素满足 expected)
//
// L1-Infra: 读文件走 L1 filesystem 接口, JSON.parse 是 Node 原生。
// =============================================================================

import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface JsonPathParams {
  /** JSON 文件路径（必填） */
  file: string
  /** JSONPath 表达式（必填，简化子集） */
  path: string
  /** 期望值（深度相等比较） */
  expected: unknown
}

export interface JsonPathResult {
  /** exit code 0 = 路径解析成功且值匹配 */
  passed: boolean
  /** 解析后的实际值 */
  actual?: { resolved: unknown; expected: unknown; path: string }
  /** 错误信息（JSON 解析失败 / 路径不存在 / 类型不匹配） */
  error?: string
}

/**
 * 简化 JSONPath 解析: 支持 $.a.b[0][*]
 *  返回 undefined 如果路径不存在
 */
function resolveJsonPath(data: unknown, path: string): { value: unknown; exists: boolean } {
  const trimmed = path.trim()
  if (!trimmed.startsWith('$')) {
    return { value: undefined, exists: false }
  }
  // 去掉前导 $, 按 . 和 [N] / [*] 拆
  const segments: Array<{ type: 'key'; value: string } | { type: 'index'; value: number } | { type: 'all' }> = []
  let i = 1 // skip $
  while (i < trimmed.length) {
    if (trimmed[i] === '.') {
      i++
      let key = ''
      while (i < trimmed.length && trimmed[i] !== '.' && trimmed[i] !== '[') {
        key += trimmed[i]
        i++
      }
      if (key) segments.push({ type: 'key', value: key })
    } else if (trimmed[i] === '[') {
      i++
      if (trimmed[i] === '*') {
        segments.push({ type: 'all' })
        i += 2 // skip '*]
      } else if (trimmed[i] === '"' || trimmed[i] === "'") {
        const quote = trimmed[i]
        i++
        let key = ''
        while (i < trimmed.length && trimmed[i] !== quote) {
          key += trimmed[i]
          i++
        }
        i++ // skip quote + ']'
        segments.push({ type: 'key', value: key })
      } else {
        let num = ''
        while (i < trimmed.length && trimmed[i] !== ']') {
          num += trimmed[i]
          i++
        }
        i++ // skip ]
        segments.push({ type: 'index', value: Number.parseInt(num, 10) })
      }
    } else {
      i++
    }
  }

  let current: unknown = data
  for (const seg of segments) {
    if (current === null || current === undefined) return { value: undefined, exists: false }
    if (seg.type === 'key') {
      if (typeof current !== 'object' || Array.isArray(current)) return { value: undefined, exists: false }
      const obj = current as Record<string, unknown>
      if (!(seg.value in obj)) return { value: undefined, exists: false }
      current = obj[seg.value]
    } else if (seg.type === 'index') {
      if (!Array.isArray(current)) return { value: undefined, exists: false }
      if (seg.value < 0 || seg.value >= current.length) return { value: undefined, exists: false }
      current = current[seg.value]
    } else {
      // all — 数组展开（特殊语义, caller 处理）
      return { value: undefined, exists: false }
    }
  }
  return { value: current, exists: true }
}

/** 深度相等比较 (JSON 值) */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return a === b
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  if (Array.isArray(b)) return false
  const objA = a as Record<string, unknown>
  const objB = b as Record<string, unknown>
  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)
  if (keysA.length !== keysB.length) return false
  return keysA.every((k) => k in objB && deepEqual(objA[k], objB[k]))
}

export async function executeJsonPath(params: JsonPathParams, context: ProbeContext): Promise<JsonPathResult> {
  const filePath = params.file.startsWith('/') ? params.file : join(context.projectRoot, params.file)

  if (!existsSync(filePath)) {
    return { passed: false, error: `file not found: ${filePath}` }
  }

  let data: unknown
  try {
    const content = readFileSync(filePath, 'utf-8')
    data = JSON.parse(content)
  } catch (err) {
    return {
      passed: false,
      error: err instanceof Error ? `JSON parse failed: ${err.message}` : 'JSON parse failed',
    }
  }

  // 支持 [*] 全展开语义: 任一元素匹配 → pass
  if (params.path.endsWith('[*]')) {
    // 路径不含 [*]: 视为 1 元素数组, 直接 resolve
    const arrayPath = params.path.replace(/\[\*\]$/, '')
    const { value, exists } = resolveJsonPath(data, arrayPath)
    if (!exists || !Array.isArray(value)) {
      return {
        passed: false,
        actual: { resolved: value, expected: params.expected, path: params.path },
        error: `path does not resolve to array: ${arrayPath}`,
      }
    }
    const match = value.some((item) => deepEqual(item, params.expected))
    return {
      passed: match,
      actual: { resolved: value, expected: params.expected, path: params.path },
      error: match ? undefined : 'no array element matches expected',
    }
  }

  const { value, exists } = resolveJsonPath(data, params.path)
  if (!exists) {
    return {
      passed: false,
      actual: { resolved: undefined, expected: params.expected, path: params.path },
      error: `path does not exist: ${params.path}`,
    }
  }

  const match = deepEqual(value, params.expected)
  return {
    passed: match,
    actual: { resolved: value, expected: params.expected, path: params.path },
    error: match
      ? undefined
      : `value mismatch: expected=${JSON.stringify(params.expected)} actual=${JSON.stringify(value)}`,
  }
}
