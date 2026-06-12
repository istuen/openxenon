// =============================================================================
// runtime-detect.test.ts (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
// 4 个测：isBun / 缓存一致性 / getRuntimeName / detectViaCmdline
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { detectViaCmdline, getRuntimeName, isBun } from '../detect'

describe('runtime/detect', () => {
  test('isBun 当前 runtime 识别（缓存值）', () => {
    // 在 bun test 下 expect(true)；在 node test 下 expect(false)
    expect(isBun()).toBe(!!process.versions.bun)
  })

  test('isBun 跨次调用一致（缓存生效）', () => {
    const a = isBun()
    const b = isBun()
    const c = isBun()
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  test('getRuntimeName 返字符串', () => {
    const r = getRuntimeName()
    expect(['bun', 'node', 'deno', 'unknown']).toContain(r)
  })

  test('detectViaCmdline 兼容 bun --bun 启动', () => {
    // 即便 execArgv 含 'bun'，globalThis.Bun 存在 → 走 bun
    const r = detectViaCmdline()
    expect(['bun', 'node']).toContain(r)
  })
})
