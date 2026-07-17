// =============================================================================
// runner.test.ts — v0.7.3 P6 (ADR-0061 §D5) Stack.tools 透传到 ProbeContext
//
// 覆盖：
//   1. executeProbe 把 context.stackTools 透传到 ProbeContext
//   2. context.stackTools 未传 → ProbeContext.stackTools 为 undefined（向后兼容）
//   3. 真实 stackTools 多 tool 数组 → handler 接收到完整列表
//   4. context.stackTools 为空数组 → 不注入 stackTools 字段（避免无意义 entry）
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { executeProbe } from '../runner'
import { registerProbeHandler, type ProbeContext, type ProbeObservation } from '@openxenon/engine/infra/probes'

describe('executeProbe — v0.7.3 P6: stackTools 透传', () => {
  test('context.stackTools 透传到 ProbeContext（mock handler 验证）', async () => {
    let receivedCtx: ProbeContext | null = null
    registerProbeHandler('p6-test-mock-stack', async (_params, ctx) => {
      receivedCtx = ctx
      const obs: ProbeObservation = { probeType: 'p6-test-mock-stack', executedAt: Date.now() }
      return obs
    })

    const stackTools = [
      { name: 'bun', version: '1.3+', command: 'bun install', config: 'bun.lock', role: 'runtime' },
      { name: 'typescript', version: '5.x', command: 'bun run typecheck' },
    ]

    await executeProbe(
      { probeName: 'mock', ref: '@oxn/probes/p6-test-mock-stack', params: {} },
      { projectRoot: '/tmp', stackTools },
    )
    expect(receivedCtx).not.toBeNull()
    expect(receivedCtx?.stackTools).toHaveLength(2)
    expect(receivedCtx?.stackTools?.[0]).toMatchObject({ name: 'bun', version: '1.3+' })
    expect(receivedCtx?.stackTools?.[1]?.name).toBe('typescript')
  })

  test('context 不含 stackTools → ProbeContext.stackTools 为 undefined（向后兼容）', async () => {
    let receivedCtx: ProbeContext | null = null
    registerProbeHandler('p6-test-mock-no-stack', async (_params, ctx) => {
      receivedCtx = ctx
      const obs: ProbeObservation = { probeType: 'p6-test-mock-no-stack', executedAt: Date.now() }
      return obs
    })

    await executeProbe(
      { probeName: 'mock', ref: '@oxn/probes/p6-test-mock-no-stack', params: {} },
      { projectRoot: '/tmp' }, // 无 stackTools
    )
    expect(receivedCtx).not.toBeNull()
    expect(receivedCtx?.stackTools).toBeUndefined()
  })

  test('context.stackTools 为空数组 → 不注入 stackTools 字段', async () => {
    let receivedCtx: ProbeContext | null = null
    registerProbeHandler('p6-test-mock-empty-stack', async (_params, ctx) => {
      receivedCtx = ctx
      const obs: ProbeObservation = { probeType: 'p6-test-mock-empty-stack', executedAt: Date.now() }
      return obs
    })

    await executeProbe(
      { probeName: 'mock', ref: '@oxn/probes/p6-test-mock-empty-stack', params: {} },
      { projectRoot: '/tmp', stackTools: [] },
    )
    expect(receivedCtx?.stackTools).toBeUndefined()
  })

  test('context 含 projectRoot → ProbeContext.projectRoot 等值', async () => {
    let receivedCtx: ProbeContext | null = null
    registerProbeHandler('p6-test-mock-proot', async (_params, ctx) => {
      receivedCtx = ctx
      const obs: ProbeObservation = { probeType: 'p6-test-mock-proot', executedAt: Date.now() }
      return obs
    })

    await executeProbe(
      { probeName: 'mock', ref: '@oxn/probes/p6-test-mock-proot', params: {} },
      { projectRoot: '/custom/path', stackTools: [{ name: 'bun' }] },
    )
    expect(receivedCtx?.projectRoot).toBe('/custom/path')
  })
})
