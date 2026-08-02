// =============================================================================
// Insight unit test (ADR-0088 ADR-P4)
//
// 覆盖 insight-manager.ts 的 3 个 pure function:
//   - parseCrossProofArgs (CLI 参数解析)
//   - renderInsightHuman / renderCrossProofHuman / renderPipelineHuman (human render)
//
// computeSingleProofInsight / computeCrossProofInsightData /
// computePipelineInsightData 依赖真实 fs + scanFrozenProofs 等，
// 在 e2e 测试覆盖 (insight-e2e.test.ts)。本文件专注 pure function 边界。
// =============================================================================

import { describe, expect, test } from 'bun:test'
import {
  parseCrossProofArgs,
  renderInsightHuman,
  renderCrossProofHuman,
  renderPipelineHuman,
  type CrossProofCliArgs,
} from '../insight-manager'

// 构造最小合法 Insight 用于 render 测试（cast 不检查运行时字段）
function mkInsight(overrides: {
  proofId?: string
  outcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE'
  runAt?: string
  evidenceChain?: Array<{ probe: string; probeType: string; target?: string; fact: string; conclusion: string }>
}): Parameters<typeof renderInsightHuman>[0] {
  return {
    schemaVersion: 1,
    projectRoot: '/tmp',
    proofId: overrides.proofId ?? 'p1',
    generatedAt: overrides.runAt ?? '2026-08-01T12:00:00Z',
    proof: {
      name: overrides.proofId ?? 'p1',
      outcome: overrides.outcome,
      runAt: overrides.runAt ?? '2026-08-01T12:00:00Z',
      evidenceChain: overrides.evidenceChain ?? [],
    },
    probeStats: { totalRuns: 0, totalProbes: 0, overallPassRate: 0, byType: {} },
    emergentPatterns: [],
  } as unknown as Parameters<typeof renderInsightHuman>[0]
}

describe('Insight / parseCrossProofArgs (pure)', () => {
  test('1. 空 args → 空 filter', () => {
    const r = parseCrossProofArgs({})
    expect(r).toEqual({})
  })

  test('2. only since → filter 含 since', () => {
    const r = parseCrossProofArgs({ since: '2026-07-01' })
    expect(r.since).toBe('2026-07-01')
    expect(r.limit).toBeUndefined()
  })

  test('3. proofs=foo,bar,baz → filter.proofIds 数组 3 元素 trim 空格', () => {
    const r = parseCrossProofArgs({ proofs: 'foo, bar ,baz' })
    expect(r.proofIds).toEqual(['foo', 'bar', 'baz'])
  })

  test('4. proofs 空字符串 → proofIds 空数组', () => {
    const r = parseCrossProofArgs({ proofs: ',,' })
    expect(r.proofIds).toEqual([])
  })

  test('5. probe-types=lint-check,ts-compiles → filter.probeTypes 数组', () => {
    const r = parseCrossProofArgs({ 'probe-types': 'lint-check,ts-compiles' })
    expect(r.probeTypes).toEqual(['lint-check', 'ts-compiles'])
  })

  test('6. probe-types 仅分隔符 → 不写入 probeTypes', () => {
    const r = parseCrossProofArgs({ 'probe-types': ',,' })
    expect(r.probeTypes).toBeUndefined()
  })

  test('7. limit=10 → filter.limit=10', () => {
    const r = parseCrossProofArgs({ limit: '10' })
    expect(r.limit).toBe(10)
  })

  test('8. limit 非数字 → filter.limit=NaN (caller 校验)', () => {
    // Number.parseInt('abc', 10) === NaN; 函数不校验，caller 责任
    const r = parseCrossProofArgs({ limit: 'abc' })
    expect(Number.isNaN(r.limit)).toBe(true)
  })

  test('9. 全字段 → 完整 filter', () => {
    const args: CrossProofCliArgs = {
      since: '2026-08-01',
      proofs: 'a,b',
      'probe-types': 'lint-check',
      limit: '5',
    }
    const r = parseCrossProofArgs(args)
    expect(r.since).toBe('2026-08-01')
    expect(r.proofIds).toEqual(['a', 'b'])
    expect(r.probeTypes).toEqual(['lint-check'])
    expect(r.limit).toBe(5)
  })
})

describe('Insight / renderInsightHuman (pure)', () => {
  test('1. COMPLETED insight → 含 === Insight: header + Run at + Evidence 段', () => {
    const insight = mkInsight({
      proofId: 'p1',
      outcome: 'COMPLETED',
      runAt: '2026-08-01T12:00:00Z',
      evidenceChain: [
        { probe: 'lint-check', probeType: 'lint-check', target: './src', fact: '0 errors', conclusion: '满足验收' },
        {
          probe: 'ts-compiles',
          probeType: 'ts-compiles',
          target: './tsconfig.json',
          fact: 'OK',
          conclusion: '满足验收',
        },
      ],
    })
    const out = renderInsightHuman(insight)
    expect(out).toContain('=== Insight: p1 (COMPLETED) ===')
    expect(out).toContain('Run at: 2026-08-01T12:00:00Z')
    expect(out).toContain('## Evidence (2)')
    expect(out).toContain('lint-check')
    expect(out).toContain('ts-compiles')
    expect(out).toContain('✅')
  })

  test('2. DEVIATED insight → header 含 (DEVIATED) 标记', () => {
    const insight = mkInsight({ proofId: 'p2', outcome: 'DEVIATED', evidenceChain: [] })
    const out = renderInsightHuman(insight)
    expect(out).toContain('=== Insight: p2 (DEVIATED) ===')
    expect(out).toContain('## Evidence (0)')
  })

  test('3. INCONCLUSIVE insight → header 含 (INCONCLUSIVE) 标记', () => {
    const insight = mkInsight({ proofId: 'p3', outcome: 'INCONCLUSIVE' })
    const out = renderInsightHuman(insight)
    expect(out).toContain('(INCONCLUSIVE)')
  })

  test('4. evidenceChain conclusion starts with 验收未通过 → ❌ icon', () => {
    const insight = mkInsight({
      proofId: 'p4',
      outcome: 'DEVIATED',
      evidenceChain: [
        { probe: 'lint-check', probeType: 'lint-check', fact: '3 errors', conclusion: '验收未通过：3 errors found' },
      ],
    })
    const out = renderInsightHuman(insight)
    expect(out).toContain('❌')
    expect(out).toContain('3 errors found')
  })

  test('5. evidenceChain 含 target → 渲染 target', () => {
    const insight = mkInsight({
      outcome: 'COMPLETED',
      evidenceChain: [
        { probe: 'p1', probeType: 'fs-exists', target: './package.json', fact: 'exists', conclusion: '满足验收' },
      ],
    })
    const out = renderInsightHuman(insight)
    expect(out).toContain('./package.json')
  })
})

describe('Insight / renderCrossProofHuman (pure)', () => {
  // CrossProofInsight schema: trendMatrix + correlationMatrix + trends + probeBehaviorPattern
  function mkCrossProofInsight(overrides: {
    proofCount?: number
    since?: string | null
  }): Parameters<typeof renderCrossProofHuman>[0] {
    return {
      schemaVersion: 1 as const,
      projectRoot: '/tmp',
      proofCount: overrides.proofCount ?? 0,
      since: overrides.since ?? null,
      generatedAt: '2026-08-01T12:00:00Z',
      trendMatrix: [],
      correlationMatrix: [],
      trends: [],
      probeBehaviorPattern: [],
    } as unknown as Parameters<typeof renderCrossProofHuman>[0]
  }

  test('1. insight 含 5 proofs + since → header + since', () => {
    const insight = mkCrossProofInsight({ proofCount: 5, since: '2026-07-01' })
    const out = renderCrossProofHuman(insight, [])
    expect(out).toContain('=== Cross-Proof Insight (5 proofs) ===')
    expect(out).toContain('Since: 2026-07-01')
  })

  test('2. skipped 数组含 entry → 渲染 skipped 段', () => {
    const insight = mkCrossProofInsight({ proofCount: 0 })
    const skipped = [
      { name: 'broken-proof', reason: 'invalid frozen.json' },
      { name: 'another-broken', reason: 'schema mismatch' },
    ]
    const out = renderCrossProofHuman(insight, skipped)
    expect(out).toContain('Skipped:')
    expect(out).toContain('broken-proof')
    expect(out).toContain('invalid frozen.json')
  })

  test('3. insight 无 since 且 skipped 空 → header 但无 Since/Skipped 段', () => {
    const insight = mkCrossProofInsight({ proofCount: 0 })
    const out = renderCrossProofHuman(insight, [])
    expect(out).toContain('=== Cross-Proof Insight (0 proofs) ===')
    expect(out).not.toContain('Since:')
    expect(out).not.toContain('Skipped:')
  })
})

describe('Insight / renderPipelineHuman (pure)', () => {
  // PipelineInsight schema: invariantEffectiveness[] + intentCoverageGaps[] + workProofTraces[]
  // 即使 3 个数组空，渲染能 handle (no invariants / no blueprints / no traces 段)
  const emptyPipelineInsight = (counts: {
    domainCount: number
    blueprintCount: number
    workCount: number
    proofCount: number
  }) =>
    ({
      schemaVersion: 1 as const,
      projectRoot: '/tmp',
      generatedAt: '2026-08-01T12:00:00Z',
      ...counts,
      invariantEffectiveness: [],
      intentCoverageGaps: [],
      workProofTraces: [],
      meta: {
        insightVersion: 'v1',
        dataSources: ['domains', 'blueprints', 'works', 'proofs'] as const,
      },
    }) as unknown as Parameters<typeof renderPipelineHuman>[0]

  test('1. 4 维度统计 → header 完整 + body 段', () => {
    const insight = emptyPipelineInsight({ domainCount: 5, blueprintCount: 3, workCount: 2, proofCount: 8 })
    const out = renderPipelineHuman(insight)
    expect(out).toContain('=== Pipeline Insight (5 domains, 3 blueprints, 2 works, 8 proofs) ===')
    expect(out).toContain('## Invariant Effectiveness (0)')
    expect(out).toContain('## Intent Coverage Gaps (0)')
    expect(out).toContain('## Work → Proof Traces (0)')
  })

  test('2. 所有计数 0 → header (0 domains, 0 blueprints, 0 works, 0 proofs)', () => {
    const insight = emptyPipelineInsight({ domainCount: 0, blueprintCount: 0, workCount: 0, proofCount: 0 })
    const out = renderPipelineHuman(insight)
    expect(out).toContain('(0 domains, 0 blueprints, 0 works, 0 proofs)')
  })

  test('3. 大数 (50+) → 渲染无 overflow', () => {
    const insight = emptyPipelineInsight({ domainCount: 50, blueprintCount: 100, workCount: 200, proofCount: 1000 })
    const out = renderPipelineHuman(insight)
    expect(out).toContain('50 domains')
    expect(out).toContain('1000 proofs')
  })

  test('4. invariantEffectiveness 含 critical → ❌ icon', () => {
    const insight = emptyPipelineInsight({ domainCount: 1, blueprintCount: 0, workCount: 0, proofCount: 1 })
    ;(insight as any).invariantEffectiveness.push({
      domainName: 'test-domain',
      invariantText: 'invariant that fails',
      totalWorks: 1,
      failedWorks: 1,
      totalProofs: 1,
      failedProofs: 1,
      hitRate: 1.0,
      status: 'critical',
    })
    const out = renderPipelineHuman(insight as any)
    expect(out).toContain('❌ [critical] test-domain')
    expect(out).toContain('hitRate=100%')
  })

  test('5. intentCoverageGaps 含 missing → missing=[...] 渲染', () => {
    const insight = emptyPipelineInsight({ domainCount: 0, blueprintCount: 1, workCount: 0, proofCount: 0 })
    ;(insight as any).intentCoverageGaps.push({
      source: 'blueprint-x',
      sourceType: 'blueprint',
      declared: ['lint-check', 'ts-compiles'],
      actual: ['lint-check'],
      missing: ['ts-compiles'],
      coverageRate: 0.5,
    })
    const out = renderPipelineHuman(insight as any)
    expect(out).toContain('blueprint-x (blueprint): 1/2 covered (50%)')
    expect(out).toContain('missing=[ts-compiles]')
  })
})
