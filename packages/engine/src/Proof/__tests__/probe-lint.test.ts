// =============================================================================
// probe-lint.test.ts — RFC-0015 D3.2 三注册表一致性检查
// =============================================================================

import { afterEach, describe, expect, test } from 'bun:test'
import { assertRegistryConsistency, PROBE_REGISTRY_DRIFT } from '../probe-lint'
import { probeRegistry, registerProbeHandler } from '@openxenon/engine/infra/probes'
import type { ProbeObservation } from '@openxenon/engine/kernel/index'
import { PROBE_VERDICT_STRATEGIES } from '@openxenon/engine/kernel/verdicts/verdict'

const baselineStrategyKeys = new Set(Object.keys(PROBE_VERDICT_STRATEGIES))
const baselineHandlerKeys = new Set(probeRegistry.getRegisteredTypes())

afterEach(() => {
  for (const key of Object.keys(PROBE_VERDICT_STRATEGIES)) {
    if (!baselineStrategyKeys.has(key)) {
      delete PROBE_VERDICT_STRATEGIES[key]
    }
  }
  for (const key of probeRegistry.getRegisteredTypes()) {
    if (!baselineHandlerKeys.has(key)) {
      ;(probeRegistry as unknown as { handlers: Map<string, unknown> }).handlers.delete(key)
    }
  }
})

describe('assertRegistryConsistency (RFC-0015 D3.2)', () => {
  test('export 包含 PROBE_REGISTRY_DRIFT 常量', () => {
    expect(PROBE_REGISTRY_DRIFT).toBe('PROBE_REGISTRY_DRIFT')
  })

  test('case 1: 三注册表完全一致 → ok:true', () => {
    const r = assertRegistryConsistency()
    expect(r.ok).toBe(true)
  })

  test('case 2: 新 handler 但 catalog 不引用 → orphan handler error', () => {
    registerProbeHandler('unmapped-handler-test-1', async () => {
      return { probeType: 'unmapped-handler-test-1', executedAt: Date.now() } as ProbeObservation
    })

    const r = assertRegistryConsistency()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('unmapped-handler-test-1'))).toBe(true)
    }
  })

  test('case 3: 新 strategy 但 catalog 不引用 → orphan strategy error', () => {
    PROBE_VERDICT_STRATEGIES['unmapped-strategy-test'] = (() => ({
      passed: true,
      outcome: 'COMPLETED',
      message: 'mock',
    })) as never

    const r = assertRegistryConsistency()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('unmapped-strategy-test'))).toBe(true)
    }
  })

  test('case 4: alias 形式注册 (e.g. fs-exists:probes) → 反向命中 OK', () => {
    const r = assertRegistryConsistency()
    expect(r.ok).toBe(true)
  })

  test('case 5: 老 alias (e.g. exec-exit-zero) → 在 aliasForms 白名单, 不报 orphan', () => {
    const r = assertRegistryConsistency()
    expect(r.ok).toBe(true)
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('exec-exit-zero'))).toBe(false)
    }
  })

  test('case 6: multiple errors 一并返 (不 first-fail)', () => {
    registerProbeHandler('orphan-handler-multi', async () => {
      return { probeType: 'orphan-handler-multi', executedAt: Date.now() } as ProbeObservation
    })
    PROBE_VERDICT_STRATEGIES['orphan-strategy-multi'] = (() => ({
      passed: true,
      outcome: 'COMPLETED',
      message: 'mock',
    })) as never

    const r = assertRegistryConsistency()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThanOrEqual(2)
      expect(r.errors.some((e) => e.includes('orphan-handler-multi'))).toBe(true)
      expect(r.errors.some((e) => e.includes('orphan-strategy-multi'))).toBe(true)
    }
  })
})
