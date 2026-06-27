// =============================================================================
// suggestion-generator.test.ts — v0.5 PR-D
//
// L1-Infra: 从 Insight JSON 提取结构化改进建议
// 覆盖：
//   1. fromPipeline: critical invariant → add-invariant suggestion
//   2. fromPipeline: warning invariant → add-invariant suggestion
//   3. fromPipeline: ok invariant → null (no suggestion)
//   4. fromPipeline: unused → null
//   5. fromCrossProof: high failRate probe → suggestion
//   6. fromCrossProof: low failRate → null
//   7. generateSuggestionFromInsight 顶层入口
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { generateSuggestionFromInsight } from '../suggestion-generator'
import type { CrossProofInsight, PipelineInsight } from '../../../kernel/index'

function mkPipelineInsight(
  invariants: Array<{
    domainName: string
    invariantText: string
    status: 'critical' | 'warning' | 'ok' | 'unused'
    totalWorks: number
    failedWorks: number
    totalProofs: number
    failedProofs: number
    hitRate: number
  }>,
): PipelineInsight {
  return {
    schemaVersion: 1,
    projectRoot: '/tmp',
    domainCount: 1,
    blueprintCount: 0,
    workCount: 0,
    proofCount: 0,
    invariantEffectiveness: invariants,
    intentCoverageGaps: [],
    workProofTraces: [],
    meta: {
      insightVersion: '0.1.0',
      dataSources: ['domains', 'blueprints', 'works', 'proofs', 'trace.jsonl'],
    },
    generatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function mkCrossProofInsight(
  probes: Array<{ probeType: string; totalRuns: number; failedProofs: number; failRate: number }>,
): CrossProofInsight {
  return {
    schemaVersion: 1,
    projectRoot: '/tmp',
    proofCount: 0,
    generatedAt: '2026-01-01T00:00:00.000Z',
    trendMatrix: [],
    correlationMatrix: [],
    trends: [],
    probeEffectiveness: probes.map((p) => ({
      ...p,
      failureVerdicts: { FAILED: p.failedProofs, INCONCLUSIVE: 0 },
    })),
    meta: { insightVersion: '0.1.0', dataSources: ['frozen.json'] },
  }
}

describe('fromPipeline (via generateSuggestionFromInsight)', () => {
  test('critical invariant → suggestion', () => {
    const insight = mkPipelineInsight([
      {
        domainName: 'TestDomain',
        invariantText: 'C1: must use ESM',
        status: 'critical',
        totalWorks: 5,
        failedWorks: 3,
        totalProofs: 10,
        failedProofs: 5,
        hitRate: 0.5,
      },
    ])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'pipeline')
    expect(draft).not.toBeNull()
    expect(draft?.title).toContain('TestDomain')
    expect(draft?.meta.target).toBe('domain')
    expect(draft?.meta.targetName).toBe('TestDomain')
    expect(draft?.meta.kind).toBe('add-invariant')
    expect(draft?.meta.patch).toContain('invariant')
  })

  test('warning invariant → suggestion', () => {
    const insight = mkPipelineInsight([
      {
        domainName: 'TestDomain',
        invariantText: 'C2: avoid CJS require',
        status: 'warning',
        totalWorks: 5,
        failedWorks: 1,
        totalProofs: 10,
        failedProofs: 1,
        hitRate: 0.1,
      },
    ])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'pipeline')
    expect(draft).not.toBeNull()
  })

  test('ok invariant → null (不需改进)', () => {
    const insight = mkPipelineInsight([
      {
        domainName: 'TestDomain',
        invariantText: 'C3: trivial',
        status: 'ok',
        totalWorks: 5,
        failedWorks: 0,
        totalProofs: 10,
        failedProofs: 0,
        hitRate: 0,
      },
    ])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'pipeline')
    expect(draft).toBeNull()
  })

  test('unused invariant → null (未被引用)', () => {
    const insight = mkPipelineInsight([
      {
        domainName: 'TestDomain',
        invariantText: 'C4: orphan',
        status: 'unused',
        totalWorks: 0,
        failedWorks: 0,
        totalProofs: 0,
        failedProofs: 0,
        hitRate: 0,
      },
    ])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'pipeline')
    expect(draft).toBeNull()
  })

  test('other-domain invariant 不会为 target-domain 触发', () => {
    const insight = mkPipelineInsight([
      {
        domainName: 'OtherDomain',
        invariantText: 'C5: other rule',
        status: 'critical',
        totalWorks: 1,
        failedWorks: 1,
        totalProofs: 5,
        failedProofs: 3,
        hitRate: 0.6,
      },
    ])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'pipeline')
    expect(draft).toBeNull()
  })
})

describe('fromCrossProof (via generateSuggestionFromInsight)', () => {
  test('高 failRate probe → suggestion', () => {
    const insight = mkCrossProofInsight([{ probeType: 'shell-exec', totalRuns: 5, failedProofs: 4, failRate: 0.8 }])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'cross-proof')
    expect(draft).not.toBeNull()
    expect(draft?.meta.patch).toContain('shell-exec')
  })

  test('failRate < 50% → null', () => {
    const insight = mkCrossProofInsight([{ probeType: 'ts-compiles', totalRuns: 5, failedProofs: 1, failRate: 0.2 }])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'cross-proof')
    expect(draft).toBeNull()
  })

  test('failedProofs < 2 → null (数据不足)', () => {
    const insight = mkCrossProofInsight([{ probeType: 'ts-compiles', totalRuns: 1, failedProofs: 1, failRate: 1.0 }])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'cross-proof')
    expect(draft).toBeNull()
  })

  test('按 failRate 降序取 worst probe', () => {
    const insight = mkCrossProofInsight([
      { probeType: 'low-fail', totalRuns: 5, failedProofs: 3, failRate: 0.6 },
      { probeType: 'high-fail', totalRuns: 5, failedProofs: 5, failRate: 1.0 },
    ])
    const draft = generateSuggestionFromInsight(JSON.stringify(insight), 'TestDomain', 'cross-proof')
    expect(draft?.meta.patch).toContain('high-fail')
  })
})

describe('generateSuggestionFromInsight 错误处理', () => {
  test('无效 JSON → 抛错', () => {
    expect(() => generateSuggestionFromInsight('not json', 'TestDomain', 'pipeline')).toThrow()
  })
})
