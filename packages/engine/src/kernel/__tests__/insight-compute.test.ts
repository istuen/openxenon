// =============================================================================
// insight-compute.test.ts — v0.1.2 PR-B
//
// 覆盖：
//   1. evidenceChainFromFrozen — PASSED/FAILED 的 fact + conclusion
//   2. evidenceChainFromFrozen — 从 verdict.params 抽 target
//   3. evidenceChainFromFrozen — unknown ref 走 fallback
//   4. buildProbeStatsView — overallPassRate 计算正确
//   5. buildProbeStatsView — consecutiveFailsByTarget 只列 fail > 0
//   6. detectEmergentPatterns — consecutive-fail 模式（≥2 次）
//   7. detectEmergentPatterns — cross-proof-repeat 模式（≥3 个 proof）
//   8. detectEmergentPatterns — cross-proof-fail-clusters 模式（≥2 个 proof）
//   9. computeInsightFromInputs — 顶层入口 + schema 校验通过
//  10. 不可变性：不修改入参
// =============================================================================

import { describe, expect, test } from 'bun:test'
import {
  evidenceChainFromFrozen,
  buildProbeStatsView,
  detectEmergentPatterns,
  computeInsightFromInputs,
} from '../verdicts/insight-compute'
import { safeValidateInsight } from '../schemas/insight-schema'
import { emptyProbeStats, type ProbeStats } from '../schemas/probe-stats-schema'
import type { FrozenProof } from '../schemas/proof-schema'

// ───────── Helpers ─────────

function makeFrozen(
  name: string,
  runAt: string,
  probes: Array<{
    probeName: string
    ref: string
    passed: boolean
    errorMessage?: string
    params?: Record<string, unknown>
    message?: string
  }>,
): FrozenProof {
  const allPassed = probes.every((p) => p.passed)
  return {
    name,
    runAt,
    verdict: allPassed ? 'PASSED' : 'FAILED',
    totalCount: probes.length,
    passedCount: probes.filter((p) => p.passed).length,
    failedCount: probes.filter((p) => !p.passed).length,
    probes: probes.map((p) => ({
      probeName: p.probeName,
      ref: p.ref,
      passed: p.passed,
      ...(p.errorMessage ? { errorMessage: p.errorMessage } : {}),
      output: {
        observation: { probeType: 'mock', executedAt: 0 },
        verdict: {
          passed: p.passed,
          message: p.message ?? (p.passed ? 'mock pass' : 'mock fail'),
          ...(p.params ? { params: p.params } : {}),
        },
      },
      durationMs: 1,
    })),
    _xenon_meta: { frozen_at: runAt, content_hash: 'a'.repeat(64) },
  }
}

// ───────── T1: evidenceChainFromFrozen ─────────

describe('evidenceChainFromFrozen', () => {
  test('PASSED probe → conclusion = 满足验收', () => {
    const frozen = makeFrozen('p', '2026-01-01T00:00:00Z', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: true,
        params: { pattern: './dist/index.js' },
        message: 'fs-exists: hit 1 file(s) >= expected 1',
      },
    ])
    const chain = evidenceChainFromFrozen(frozen)
    expect(chain.length).toBe(1)
    expect(chain[0]?.probeType).toBe('fs-exists')
    expect(chain[0]?.target).toBe('./dist/index.js')
    expect(chain[0]?.fact).toBe('fs-exists: hit 1 file(s) >= expected 1')
    expect(chain[0]?.conclusion).toBe('满足验收')
  })

  test('FAILED probe → conclusion = 验收未通过 + errorMessage', () => {
    const frozen = makeFrozen('p', '2026-01-01T00:00:00Z', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: false,
        errorMessage: 'expected >= 1 hit(s), got 0',
        params: { pattern: './missing.js' },
        message: 'fs-exists: hit 0 file(s) < expected 1',
      },
    ])
    const chain = evidenceChainFromFrozen(frozen)
    expect(chain.length).toBe(1)
    expect(chain[0]?.conclusion).toBe('验收未通过：expected >= 1 hit(s), got 0')
  })

  test('shell-exec 的 target 是 command', () => {
    const frozen = makeFrozen('p', '2026-01-01T00:00:00Z', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/shell-exec',
        passed: true,
        params: { command: 'bun test' },
      },
    ])
    const chain = evidenceChainFromFrozen(frozen)
    expect(chain[0]?.probeType).toBe('shell-exec')
    expect(chain[0]?.target).toBe('bun test')
  })

  test('unknown ref → fallback 去前缀', () => {
    const frozen = makeFrozen('p', '2026-01-01T00:00:00Z', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/some-future-probe',
        passed: true,
      },
    ])
    const chain = evidenceChainFromFrozen(frozen)
    expect(chain[0]?.probeType).toBe('some-future-probe')
  })
})

// ───────── T2: buildProbeStatsView ─────────

describe('buildProbeStatsView', () => {
  test('overallPassRate 计算正确', () => {
    const stats = emptyProbeStats('/p')
    stats.probes['fs-exists'] = {
      totalCount: 10,
      passCount: 7,
      failCount: 3,
      lastRun: '2026-01-01T00:00:00Z',
      targets: {},
    }
    stats.probes['shell-exec'] = {
      totalCount: 5,
      passCount: 5,
      failCount: 0,
      lastRun: '2026-01-01T00:00:00Z',
      targets: {},
    }
    const view = buildProbeStatsView(stats)
    expect(view.totalProbes).toBe(15)
    expect(view.overallPassRate).toBeCloseTo(12 / 15, 5)
  })

  test('consecutiveFailsByTarget 只列 fail > 0 的 target', () => {
    const stats = emptyProbeStats('/p')
    stats.probes['fs-exists'] = {
      totalCount: 5,
      passCount: 2,
      failCount: 3,
      lastRun: '2026-01-01T00:00:00Z',
      targets: {
        './a.js': { total: 3, pass: 2, fail: 1, consecutiveFails: 0, lastRun: 't1' },
        './b.js': { total: 2, pass: 0, fail: 2, consecutiveFails: 2, lastRun: 't2' },
      },
    }
    const view = buildProbeStatsView(stats)
    expect(view.byType['fs-exists']?.consecutiveFailsByTarget).toEqual({ './b.js': 2 })
    expect(view.byType['fs-exists']?.consecutiveFailsByTarget['./a.js']).toBeUndefined()
  })

  test('空 stats → overallPassRate = 0', () => {
    const stats = emptyProbeStats('/p')
    const view = buildProbeStatsView(stats)
    expect(view.overallPassRate).toBe(0)
    expect(view.totalProbes).toBe(0)
  })
})

// ───────── T3: detectEmergentPatterns ─────────

describe('detectEmergentPatterns', () => {
  test('consecutive-fail：本 proof 失败 + stats.consecutiveFails ≥ 2', () => {
    const stats = emptyProbeStats('/p')
    stats.probes['fs-exists'] = {
      totalCount: 3,
      passCount: 1,
      failCount: 2,
      lastRun: '2026-01-03T00:00:00Z',
      targets: {
        './missing.js': { total: 3, pass: 1, fail: 2, consecutiveFails: 2, lastRun: 't' },
      },
    }
    const frozen = makeFrozen('p', '2026-01-03T00:00:00Z', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: false,
        params: { pattern: './missing.js' },
      },
    ])
    const patterns = detectEmergentPatterns(stats, frozen)
    const consecutiveFail = patterns.find((p) => p.type === 'consecutive-fail')
    expect(consecutiveFail).toBeDefined()
    expect(consecutiveFail?.probeType).toBe('fs-exists')
    expect(consecutiveFail?.target).toBe('./missing.js')
    expect(consecutiveFail?.occurrences).toBe(2)
  })

  test('consecutive-fail 本次 PASS → 不触发', () => {
    const stats = emptyProbeStats('/p')
    stats.probes['fs-exists'] = {
      totalCount: 2,
      passCount: 1,
      failCount: 1,
      lastRun: 't',
      targets: {
        './missing.js': { total: 2, pass: 1, fail: 1, consecutiveFails: 1, lastRun: 't' },
      },
    }
    const frozen = makeFrozen('p', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: true,
        params: { pattern: './missing.js' },
      },
    ])
    const patterns = detectEmergentPatterns(stats, frozen)
    expect(patterns.find((p) => p.type === 'consecutive-fail')).toBeUndefined()
  })

  test('consecutive-fail 次数 < 2 → 不触发', () => {
    const stats = emptyProbeStats('/p')
    stats.probes['fs-exists'] = {
      totalCount: 1,
      passCount: 0,
      failCount: 1,
      lastRun: 't',
      targets: {
        './x.js': { total: 1, pass: 0, fail: 1, consecutiveFails: 1, lastRun: 't' },
      },
    }
    const frozen = makeFrozen('p', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: false,
        params: { pattern: './x.js' },
      },
    ])
    const patterns = detectEmergentPatterns(stats, frozen)
    expect(patterns.find((p) => p.type === 'consecutive-fail')).toBeUndefined()
  })

  test('cross-proof-repeat：同 probe type 出现 ≥ 3 个 proof', () => {
    const stats = emptyProbeStats('/p')
    stats.probes['fs-exists'] = {
      totalCount: 10,
      passCount: 8,
      failCount: 2,
      lastRun: 't',
      targets: {},
    }
    stats.proofRuns = [
      {
        proofId: 'a',
        timestamp: 't',
        verdict: 'PASSED',
        probeSummary: [{ type: 'fs-exists', target: './x', passed: true }],
      },
      {
        proofId: 'b',
        timestamp: 't',
        verdict: 'PASSED',
        probeSummary: [{ type: 'fs-exists', target: './x', passed: true }],
      },
      {
        proofId: 'c',
        timestamp: 't',
        verdict: 'FAILED',
        probeSummary: [{ type: 'fs-exists', target: './x', passed: false }],
      },
    ]
    const frozen = makeFrozen('d', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: true,
        params: { pattern: './x' },
      },
    ])
    const patterns = detectEmergentPatterns(stats, frozen)
    const repeat = patterns.find((p) => p.type === 'cross-proof-repeat')
    expect(repeat).toBeDefined()
    expect(repeat?.probeType).toBe('fs-exists')
    expect(repeat?.occurrences).toBe(3)
  })

  test('cross-proof-repeat：< 3 个 proof 不触发', () => {
    const stats = emptyProbeStats('/p')
    stats.probes['fs-exists'] = {
      totalCount: 2,
      passCount: 2,
      failCount: 0,
      lastRun: 't',
      targets: {},
    }
    stats.proofRuns = [
      {
        proofId: 'a',
        timestamp: 't',
        verdict: 'PASSED',
        probeSummary: [{ type: 'fs-exists', target: './x', passed: true }],
      },
      {
        proofId: 'b',
        timestamp: 't',
        verdict: 'PASSED',
        probeSummary: [{ type: 'fs-exists', target: './x', passed: true }],
      },
    ]
    const frozen = makeFrozen('c', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: true,
      },
    ])
    const patterns = detectEmergentPatterns(stats, frozen)
    expect(patterns.find((p) => p.type === 'cross-proof-repeat')).toBeUndefined()
  })

  test('cross-proof-fail-clusters：同 (type+target) 失败 ≥ 2 个 proof', () => {
    const stats = emptyProbeStats('/p')
    stats.proofRuns = [
      {
        proofId: 'a',
        timestamp: 't',
        verdict: 'FAILED',
        probeSummary: [{ type: 'fs-exists', target: './missing.js', passed: false }],
      },
      {
        proofId: 'b',
        timestamp: 't',
        verdict: 'FAILED',
        probeSummary: [{ type: 'fs-exists', target: './missing.js', passed: false }],
      },
    ]
    const frozen = makeFrozen('c', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: false,
        params: { pattern: './missing.js' },
      },
    ])
    const patterns = detectEmergentPatterns(stats, frozen)
    const cluster = patterns.find((p) => p.type === 'cross-proof-fail-clusters')
    expect(cluster).toBeDefined()
    expect(cluster?.probeType).toBe('fs-exists')
    expect(cluster?.target).toBe('./missing.js')
    expect(cluster?.occurrences).toBe(2)
  })
})

// ───────── T4: computeInsightFromInputs ─────────

describe('computeInsightFromInputs', () => {
  test('顶层入口 + schema 校验通过', () => {
    const stats = emptyProbeStats('/p')
    stats.proofRuns = [{ proofId: 'p', timestamp: 't', verdict: 'PASSED', probeSummary: [] }]
    const frozen = makeFrozen('p', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: true,
        params: { pattern: './x' },
      },
    ])
    const insight = computeInsightFromInputs('/p', 'p', frozen, stats)
    expect(insight.proofId).toBe('p')
    expect(insight.proof.verdict).toBe('PASSED')
    expect(insight.proof.evidenceChain.length).toBe(1)
    expect(insight.meta.dataSources).toEqual(['frozen.json', 'probe-stats.json'])

    const v = safeValidateInsight(insight)
    expect(v.success).toBe(true)
  })

  test('不可变性：不修改入参', () => {
    const stats = emptyProbeStats('/p')
    const frozen = makeFrozen('p', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: true,
        params: { pattern: './x' },
      },
    ])
    const statsBefore = JSON.stringify(stats)
    const frozenBefore = JSON.stringify(frozen)
    const insight = computeInsightFromInputs('/p', 'p', frozen, stats)
    expect(JSON.stringify(stats)).toBe(statsBefore)
    expect(JSON.stringify(frozen)).toBe(frozenBefore)
    expect(insight.proof).not.toBe(frozen)
  })

  test('空 stats + 1 frozen → overallPassRate 反映本次', () => {
    const stats = emptyProbeStats('/p')
    const frozen = makeFrozen('p', 't', [
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        passed: true,
        params: { pattern: './x' },
      },
    ])
    const insight = computeInsightFromInputs('/p', 'p', frozen, stats)
    // 但本次 run 不在 stats 里，所以 totalProbes=0
    expect(insight.probeStats.totalProbes).toBe(0)
    expect(insight.probeStats.overallPassRate).toBe(0)
  })
})
