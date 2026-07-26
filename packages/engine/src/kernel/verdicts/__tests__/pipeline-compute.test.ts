// =============================================================================
// pipeline-compute.test.ts — v0.5 PR-C
//
// L0-Processor 纯函数测试：PipelineInput → PipelineInsight
//
// 覆盖：
//   1. 空 input → 3 维空数组 + 0 计数
//   2. invariantEffectiveness: critical (hitRate > 0.3) / warning / ok / unused
//   3. intentCoverageGaps: 全部覆盖 / 部分覆盖 / 未覆盖
//   4. workProofTraces: work 关联 proof 后全链可见
//   5. guessProbeTypeFromInvariant 准确性
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { computePipelineInsightFromInputs, type PipelineInput } from '../pipeline-compute'

const ROOT = '/tmp/oxn-pipeline-test'

function emptyInput(): PipelineInput {
  return {
    projectRoot: ROOT,
    domains: [],
    blueprints: [],
    works: [],
    allFrozenProofs: [],
  }
}

// ─── T1: Empty ──────────────────────────────────────────────────────────────

describe('computePipelineInsightFromInputs empty', () => {
  test('空 input → 3 维空数组 + 0 计数', () => {
    const insight = computePipelineInsightFromInputs(emptyInput())
    expect(insight.schemaVersion).toBe(1)
    expect(insight.domainCount).toBe(0)
    expect(insight.blueprintCount).toBe(0)
    expect(insight.workCount).toBe(0)
    expect(insight.proofCount).toBe(0)
    expect(insight.invariantEffectiveness).toEqual([])
    expect(insight.intentCoverageGaps).toEqual([])
    expect(insight.workProofTraces).toEqual([])
  })
})

// ─── T2: invariantEffectiveness ──────────────────────────────────────────────

describe('computePipelineInsightFromInputs invariantEffectiveness', () => {
  test('critical: invariant 匹配对应 probe FAILED 多 → hitRate > 0.3', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      domains: [{ name: 'SecurityContext', invariants: [{ value: 'Shell 命令执行必须参数化' }] }],
      works: [
        {
          name: 'fix-cmd',
          domainRefs: ['SecurityContext'],
          blueprintRefs: ['dev-workflow'],
          proofs: [
            {
              proofId: 'fix-cmd',
              outcome: 'DEVIATED',
              runAt: '2026-01-01T00:00:00Z',
              probeSummary: [{ probeType: 'shell-exec', outcome: 'DEVIATED', target: '/bin/risky' }],
            },
          ],
          traceEventCount: 0,
        },
      ],
      allFrozenProofs: [],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.invariantEffectiveness.length).toBe(1)
    const inv = insight.invariantEffectiveness[0]!
    expect(inv.status).toBe('critical')
    expect(inv.hitRate).toBe(1)
  })

  test('warning: 偶尔失败', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      domains: [{ name: 'CodeQualityContext', invariants: [{ value: 'ReDoS 防护必须被 safe-regex 拦截' }] }],
      works: [
        {
          name: 'refactor-regex',
          domainRefs: ['CodeQualityContext'],
          blueprintRefs: ['dev-workflow'],
          proofs: [
            {
              proofId: 'r1',
              outcome: 'COMPLETED',
              runAt: '2026-01-01T00:00:00Z',
              probeSummary: [{ probeType: 'lint-check', outcome: 'COMPLETED' }],
            },
            {
              proofId: 'r2',
              outcome: 'COMPLETED',
              runAt: '2026-01-02T00:00:00Z',
              probeSummary: [{ probeType: 'lint-check', outcome: 'COMPLETED' }],
            },
            {
              proofId: 'r3',
              outcome: 'COMPLETED',
              runAt: '2026-01-03T00:00:00Z',
              probeSummary: [{ probeType: 'lint-check', outcome: 'COMPLETED' }],
            },
            {
              proofId: 'r4',
              outcome: 'COMPLETED',
              runAt: '2026-01-04T00:00:00Z',
              probeSummary: [{ probeType: 'lint-check', outcome: 'DEVIATED' }],
            },
          ],
          traceEventCount: 0,
        },
      ],
      allFrozenProofs: [],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.invariantEffectiveness.length).toBe(1)
    expect(insight.invariantEffectiveness[0]!.status).toBe('warning')
    expect(insight.invariantEffectiveness[0]!.hitRate).toBeCloseTo(0.25, 1)
  })

  test('ok: 从未失败', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      domains: [{ name: 'CodeQualityContext', invariants: [{ value: 'ESM 项目禁用 require()' }] }],
      works: [
        {
          name: 'migrate-to-esm',
          domainRefs: ['CodeQualityContext'],
          blueprintRefs: ['dev-workflow'],
          proofs: [
            {
              proofId: 'm1',
              outcome: 'COMPLETED',
              runAt: '2026-01-01T00:00:00Z',
              probeSummary: [{ probeType: 'ts-compiles', outcome: 'COMPLETED' }],
            },
          ],
          traceEventCount: 0,
        },
      ],
      allFrozenProofs: [],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.invariantEffectiveness[0]!.status).toBe('ok')
    expect(insight.invariantEffectiveness[0]!.hitRate).toBe(0)
  })

  test('unused: invariant 未被任何 work 引用', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      domains: [{ name: 'OrphanDomain', invariants: [{ value: '应该能 ts-compiles' }] }],
      works: [],
      allFrozenProofs: [],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.invariantEffectiveness[0]!.status).toBe('unused')
    expect(insight.invariantEffectiveness[0]!.totalWorks).toBe(0)
  })

  test('critical first in sort order', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      domains: [
        { name: 'D1', invariants: [{ value: '必须 lint 检查' }] },
        { name: 'D2', invariants: [{ value: '必须 shell 逃逸防护' }] },
      ],
      works: [
        {
          name: 'w1',
          domainRefs: ['D1', 'D2'],
          blueprintRefs: ['bp'],
          proofs: [
            {
              proofId: 'p1',
              outcome: 'DEVIATED',
              runAt: 't',
              probeSummary: [
                { probeType: 'lint-check', outcome: 'COMPLETED' },
                { probeType: 'shell-exec', outcome: 'DEVIATED' },
              ],
            },
          ],
          traceEventCount: 0,
        },
      ],
      allFrozenProofs: [],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.invariantEffectiveness[0]!.domainName).toBe('D2') // shell=worse
    expect(insight.invariantEffectiveness[1]!.domainName).toBe('D1') // lint=ok
  })
})

// ─── T3: intentCoverageGaps ─────────────────────────────────────────────────

describe('computePipelineInsightFromInputs intentCoverageGaps', () => {
  test('全部覆盖', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      blueprints: [{ name: 'bp1', slots: [{ name: 'build', observe: ['deps-resolved'] }] }],
      allFrozenProofs: [
        {
          name: 'p1',
          runAt: 't',
          outcome: 'COMPLETED',
          totalCount: 1,
          passedCount: 1,
          failedCount: 0,
          probes: [
            { probeName: 'a', ref: '@oxn/probes/deps-resolved', outcome: 'COMPLETED', passed: true, durationMs: 1 },
          ],
          _xenon_meta: { frozen_at: 't', content_hash: 'h' },
        },
      ],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.intentCoverageGaps.length).toBe(1)
    expect(insight.intentCoverageGaps[0]!.coverageRate).toBe(1)
    expect(insight.intentCoverageGaps[0]!.missing).toEqual([])
  })

  test('部分覆盖', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      blueprints: [{ name: 'bp1', slots: [{ name: 'verify', observe: ['lint-check', 'ts-compiles', 'test-pass'] }] }],
      allFrozenProofs: [
        {
          name: 'p1',
          runAt: 't',
          outcome: 'COMPLETED',
          totalCount: 1,
          passedCount: 1,
          failedCount: 0,
          probes: [
            { probeName: 'a', ref: '@oxn/probes/ts-compiles', outcome: 'COMPLETED', passed: true, durationMs: 1 },
          ],
          _xenon_meta: { frozen_at: 't', content_hash: 'h' },
        },
      ],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.intentCoverageGaps[0]!.coverageRate).toBeCloseTo(0.333, 1)
    expect(insight.intentCoverageGaps[0]!.missing).toEqual(['lint-check', 'test-pass'])
  })

  test('未覆盖', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      blueprints: [{ name: 'bp1', slots: [{ name: 'build', observe: ['lint-check'] }] }],
      allFrozenProofs: [],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.intentCoverageGaps[0]!.coverageRate).toBe(0)
    expect(insight.intentCoverageGaps[0]!.missing).toEqual(['lint-check'])
  })
})

// ─── T4: workProofTraces ────────────────────────────────────────────────────

describe('computePipelineInsightFromInputs workProofTraces', () => {
  test('work→proof 关联', () => {
    const input: PipelineInput = {
      ...emptyInput(),
      works: [
        {
          name: 'my-work',
          domainRefs: ['D1'],
          blueprintRefs: ['bp1'],
          proofs: [
            {
              proofId: 'my-work',
              outcome: 'DEVIATED',
              runAt: 't',
              probeSummary: [{ probeType: 'lint-check', outcome: 'DEVIATED' }],
            },
          ],
          traceEventCount: 42,
        },
      ],
    }
    const insight = computePipelineInsightFromInputs(input)
    expect(insight.workProofTraces.length).toBe(1)
    const trace = insight.workProofTraces[0]!
    expect(trace.workName).toBe('my-work')
    expect(trace.domains).toEqual(['D1'])
    expect(trace.proofs.length).toBe(1)
    expect(trace.traceEventCount).toBe(42)
  })
})
