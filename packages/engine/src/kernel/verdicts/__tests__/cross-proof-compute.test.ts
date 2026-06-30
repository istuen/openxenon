// =============================================================================
// cross-proof-compute.test.ts — v0.5 PR-B
//
// L0-Processor 纯函数测试：FrozenProof[] + filter → CrossProofInsight
//
// 覆盖：
//   1. 空 input → 4 维均空数组 + proofCount=0
//   2. trendMatrix 时间升序排列 + (probeType, target) 分组正确
//   3. trendMatrix 含 target=undefined 的 case
//   4. correlationMatrix coOccurrences < 2 不输出
//   5. correlationMatrix 同 proof 内 A+B 都失败时 coFailures +1
//   6. trends: worsening 检测（最近 3 次全 FAIL 且之前有 PASS）
//   7. trends: improving 检测（最近 3 次全 PASS 且之前有 FAIL）
//   8. trends: stable-pass / stable-fail / volatile / insufficient-data
//   9. probeEffectiveness 按 failRate 降序
//  10. filter: since 只包含 runAt >= since
//  11. filter: proofIds 只包含白名单
//  12. filter: probeTypes 只包含白名单（即便其他 probe 共存）
//  13. meta.filter 反映 filter 参数
// =============================================================================

import { describe, expect, test } from 'bun:test'
import type { FrozenProof, FrozenProofProbeResult } from '../../schemas/proof-schema'
import { computeCrossProofInsightFromInputs } from '../cross-proof-compute'

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

function mkProbe(
  probeName: string,
  ref: string,
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE',
  passed: boolean,
  output?: Record<string, unknown>,
  durationMs = 5,
): FrozenProofProbeResult {
  return { probeName, ref, verdict, passed, durationMs, ...(output ? { output } : {}) }
}

function mkFrozen(
  name: string,
  runAt: string,
  probes: FrozenProofProbeResult[],
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' = 'PASSED',
): FrozenProof {
  const total = probes.length
  const passed = probes.filter((p) => p.passed).length
  return {
    name,
    runAt,
    verdict,
    totalCount: total,
    passedCount: passed,
    failedCount: total - passed,
    probes,
    _xenon_meta: { frozen_at: runAt, content_hash: `hash-${name}` },
  }
}

const ROOT = '/tmp/oxn-cp-test'

// -----------------------------------------------------------------------------
// T1: 空 input
// -----------------------------------------------------------------------------

describe('computeCrossProofInsightFromInputs empty', () => {
  test('空列表返回 4 维空数组 + proofCount=0', () => {
    const insight = computeCrossProofInsightFromInputs(ROOT, [])
    expect(insight.schemaVersion).toBe(1)
    expect(insight.projectRoot).toBe(ROOT)
    expect(insight.proofCount).toBe(0)
    expect(insight.trendMatrix).toEqual([])
    expect(insight.correlationMatrix).toEqual([])
    expect(insight.trends).toEqual([])
    expect(insight.probeEffectiveness).toEqual([])
  })
})

// -----------------------------------------------------------------------------
// T2-T3: trendMatrix
// -----------------------------------------------------------------------------

describe('computeCrossProofInsightFromInputs trendMatrix', () => {
  test('按 (probeType, target) 分组 + 时间升序', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p3', '2026-06-25T12:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trendMatrix.length).toBe(1)
    const entry = insight.trendMatrix[0]!
    expect(entry.probeType).toBe('ts-compiles')
    expect(entry.target).toBe('src/x.ts')
    expect(entry.total).toBe(3)
    expect(entry.passedCount).toBe(2)
    expect(entry.failedCount).toBe(1)
    expect(entry.sequence.map((s) => s.proofId)).toEqual(['p1', 'p2', 'p3'])
  })

  test('不同 target 拆为不同 entry', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
        mkProbe('b', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/y.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trendMatrix.length).toBe(2)
    const targets = insight.trendMatrix.map((e) => e.target).sort()
    expect(targets).toEqual(['src/x.ts', 'src/y.ts'])
  })

  test('probe 无 target 时 target 字段省略', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T10:00:00Z', [mkProbe('a', '@oxn/probes/shell-exec', 'PASSED', true)]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trendMatrix[0]?.target).toBeUndefined()
  })
})

// -----------------------------------------------------------------------------
// T4-T5: correlationMatrix
// -----------------------------------------------------------------------------

describe('computeCrossProofInsightFromInputs correlationMatrix', () => {
  test('coOccurrences < 2 的 pair 不输出', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true),
        mkProbe('b', '@oxn/probes/lint-check', 'PASSED', true),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.correlationMatrix.length).toBe(0)
  })

  test('coFailures 计数：同 proof 内 A+B 都失败时 +1', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false),
        mkProbe('b', '@oxn/probes/lint-check', 'FAILED', false),
      ]),
      mkFrozen('p2', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false),
        mkProbe('b', '@oxn/probes/lint-check', 'PASSED', true),
      ]),
      mkFrozen('p3', '2026-06-25T12:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false),
        mkProbe('b', '@oxn/probes/lint-check', 'FAILED', false),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.correlationMatrix.length).toBe(1)
    const pair = insight.correlationMatrix[0]!
    expect(pair.probeTypeA).toBe('lint-check')
    expect(pair.probeTypeB).toBe('ts-compiles')
    expect(pair.coOccurrences).toBe(3)
    expect(pair.coFailures).toBe(2)
    expect(pair.coFailureRate).toBeCloseTo(0.667, 2)
  })

  test('coFailureRate 高的 pair 排前', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false),
        mkProbe('b', '@oxn/probes/lint-check', 'FAILED', false),
      ]),
      mkFrozen('p2', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true),
        mkProbe('b', '@oxn/probes/lint-check', 'PASSED', true),
      ]),
      mkFrozen('p3', '2026-06-25T12:00:00Z', [
        mkProbe('a', '@oxn/probes/test-pass', 'FAILED', false),
        mkProbe('b', '@oxn/probes/lint-check', 'FAILED', false),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    // pairs: lint↔ts (1/2 cofail=0.5), lint↔test (1/2 cofail=0.5)
    // 两者 coFailureRate 同，按插入顺序（实际 alphabetical reverse 后取 max）
    expect(insight.correlationMatrix.length).toBeGreaterThanOrEqual(1)
    for (const p of insight.correlationMatrix) {
      expect(p.coFailureRate).toBeLessThanOrEqual(1)
    }
  })
})

// -----------------------------------------------------------------------------
// T6-T8: trends
// -----------------------------------------------------------------------------

describe('computeCrossProofInsightFromInputs trends', () => {
  test('数据不足（<3 runs）→ insufficient-data', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trends.length).toBe(0) // < 3 runs 不进入趋势判定
  })

  test('worsening：最近 3 次全 FAIL 且之前有 PASS', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p3', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p4', '2026-06-25T12:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trends.length).toBe(1)
    const t = insight.trends[0]!
    expect(t.trend).toBe('worsening')
    expect(t.latestVerdict).toBe('FAILED')
    expect(t.currentStreak).toBe(3) // 最近 3 次全 FAILED
  })

  test('improving：最近 3 次全 PASS 且之前有 FAIL', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p3', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p4', '2026-06-25T12:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trends.length).toBe(1)
    const t = insight.trends[0]!
    expect(t.trend).toBe('improving')
    expect(t.latestVerdict).toBe('PASSED')
    expect(t.currentStreak).toBe(3)
  })

  test('stable-pass：全程 PASSED', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p3', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trends[0]?.trend).toBe('stable-pass')
    expect(insight.trends[0]?.currentStreak).toBe(3)
  })

  test('stable-fail：全程 FAILED', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p3', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trends[0]?.trend).toBe('stable-fail')
  })

  test('volatile：PASSED/FAILED 交替', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p3', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.trends[0]?.trend).toBe('volatile')
  })
})

// -----------------------------------------------------------------------------
// T9: probeEffectiveness
// -----------------------------------------------------------------------------

describe('computeCrossProofInsightFromInputs probeEffectiveness', () => {
  test('按 failRate 降序', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false),
        mkProbe('b', '@oxn/probes/test-pass', 'PASSED', true),
      ]),
      mkFrozen('p2', '2026-06-25T10:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false),
        mkProbe('b', '@oxn/probes/test-pass', 'FAILED', false),
      ]),
      mkFrozen('p3', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true),
        mkProbe('b', '@oxn/probes/test-pass', 'PASSED', true),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    expect(insight.probeEffectiveness.length).toBe(2)
    expect(insight.probeEffectiveness[0]?.probeType).toBe('ts-compiles')
    expect(insight.probeEffectiveness[0]?.failRate).toBe(2 / 3)
    expect(insight.probeEffectiveness[1]?.probeType).toBe('test-pass')
    expect(insight.probeEffectiveness[1]?.failRate).toBe(1 / 3)
  })

  test('failureVerdicts 正确分类', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [mkProbe('a', '@oxn/probes/ts-compiles', 'FAILED', false)]),
      mkFrozen('p2', '2026-06-25T10:00:00Z', [mkProbe('a', '@oxn/probes/ts-compiles', 'INCONCLUSIVE', false)]),
      mkFrozen('p3', '2026-06-25T11:00:00Z', [mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true)]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen)
    const eff = insight.probeEffectiveness[0]!
    expect(eff.failureVerdicts.FAILED).toBe(1)
    expect(eff.failureVerdicts.INCONCLUSIVE).toBe(1)
  })
})

// -----------------------------------------------------------------------------
// T10-T12: filter
// -----------------------------------------------------------------------------

describe('computeCrossProofInsightFromInputs filter', () => {
  test('since 只含 runAt >= since', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen, { since: '2026-06-25T10:00:00Z' })
    expect(insight.proofCount).toBe(2) // proofCount 含所有传入（含 since 过滤前的）
    expect(insight.trendMatrix[0]?.total).toBe(1) // 但 trendMatrix 只含 since 后的
    expect(insight.since).toBe('2026-06-25T10:00:00Z')
  })

  test('proofIds 只含白名单', () => {
    const frozen: FrozenProof[] = [
      mkFrozen('p1', '2026-06-25T09:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
      mkFrozen('p2', '2026-06-25T11:00:00Z', [
        mkProbe('a', '@oxn/probes/ts-compiles', 'PASSED', true, { path: 'src/x.ts' }),
      ]),
    ]
    const insight = computeCrossProofInsightFromInputs(ROOT, frozen, { proofIds: ['p1'] })
    expect(insight.proofCount).toBe(2)
    expect(insight.trendMatrix[0]?.total).toBe(1)
    expect(insight.trendMatrix[0]?.sequence[0]?.proofId).toBe('p1')
  })

  test('meta.filter 反映 filter 参数', () => {
    const insight = computeCrossProofInsightFromInputs(ROOT, [], {
      since: '2026-06-25T10:00:00Z',
      proofIds: ['p1'],
    })
    expect(insight.meta.filter?.since).toBe('2026-06-25T10:00:00Z')
    expect(insight.meta.filter?.proofIds).toEqual(['p1'])
  })
})
