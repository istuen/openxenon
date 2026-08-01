// =============================================================================
// _tool-resolver.test.ts — RFC-0015 D5.2 stackTools 配置 3 场景 + role 容错测试
//
// resolveToolCommand(context, opts) 必须返回:
//   - context.stackTools 找到匹配 tool (name 或 role) → tool.command
//   - 未匹配 → opts.fallback (BWC)
//   - context.stackTools undefined → opts.fallback (BWC)
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { resolveToolCommand } from '../_tool-resolver'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

function ctxWith(stackTools?: ProbeContextBase['stackTools']): ProbeContextBase {
  return { projectRoot: '/tmp', stackTools }
}

describe('resolveToolCommand (RFC-0015 D5.1+D5.2)', () => {
  test('case 1: stackTools 配置 bun-test → tool.command 优先', () => {
    const ctx = ctxWith([{ name: 'bun-test', command: 'bun test --bail' }])
    const r = resolveToolCommand(ctx, { toolName: 'bun-test', fallback: 'bun test' })
    expect(r).toBe('bun test --bail')
  })

  test('case 2: stackTools 配置 jest 但 toolName=bun-test → fallback (BWC 不变)', () => {
    const ctx = ctxWith([{ name: 'jest', command: 'jest' }])
    const r = resolveToolCommand(ctx, { toolName: 'bun-test', fallback: 'bun test' })
    expect(r).toBe('bun test')
  })

  test('case 3: stackTools=[] → fallback', () => {
    const ctx = ctxWith([])
    const r = resolveToolCommand(ctx, { toolName: 'bun-test', fallback: 'bun test' })
    expect(r).toBe('bun test')
  })

  test('case 4: stackTools undefined → fallback (BWC)', () => {
    const ctx = ctxWith(undefined)
    const r = resolveToolCommand(ctx, { toolName: 'bun-test', fallback: 'bun test' })
    expect(r).toBe('bun test')
  })

  test('case 5: role 容错匹配 — "runtime + test runner" 匹配 test 关键词', () => {
    const ctx = ctxWith([{ name: 'bun', role: 'runtime + test runner', command: 'bun test' }])
    const r = resolveToolCommand(ctx, {
      toolName: undefined,
      roleKeyword: ['test runner', 'tester'],
      fallback: 'bun test',
    })
    expect(r).toBe('bun test')
  })

  test('case 6: biome tool override lint-check fallback', () => {
    const ctx = ctxWith([{ name: 'biome', command: 'biome check --apply' }])
    const r = resolveToolCommand(ctx, { toolName: 'biome', fallback: 'bun run lint' })
    expect(r).toBe('biome check --apply')
  })

  test('case 7: toolName 匹配优先于 role 容错匹配 (精确匹配胜)', () => {
    // 两个 tool 都满足 role 关键词, 优先 toolName 精确匹配
    const ctx = ctxWith([
      { name: 'eslint', role: 'linter', command: 'eslint .' },
      { name: 'biome', role: 'linter', command: 'biome check' },
    ])
    const r = resolveToolCommand(ctx, {
      toolName: 'biome',
      roleKeyword: ['linter'],
      fallback: 'bun run lint',
    })
    expect(r).toBe('biome check')
  })

  test('case 8: tool 没 command 字段 → fallback (跳过该 tool, 试下一个或 fallback)', () => {
    const ctx = ctxWith([{ name: 'biome', version: '1.0' }]) // 无 command
    const r = resolveToolCommand(ctx, { toolName: 'biome', fallback: 'biome check' })
    expect(r).toBe('biome check')
  })
})
