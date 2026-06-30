import { join } from 'path'
import {
  BOUNDARY_DIR,
  CACHE_DIR,
  PROBE_STATS_JSON,
  computeCrossProofInsightFromInputs,
  computeInsightFromInputs,
  computePipelineInsightFromInputs,
  type CrossProofFilter,
  type CrossProofInsight,
  type Insight,
  type PipelineInsight,
} from '@openxenon/engine/kernel'
import { readInsightInputs } from '@openxenon/engine/infra/probes/insight-collector'
import { scanFrozenProofs } from '@openxenon/engine/infra/insight/cross-proof-scanner'
import { scanPipelineInput } from '@openxenon/engine/infra/insight/pipeline-analyzer'

export interface CrossProofCliArgs {
  since?: string
  proofs?: string
  'probe-types'?: string
  limit?: string
}

export function parseCrossProofArgs(args: CrossProofCliArgs): CrossProofFilter & { limit?: number } {
  const filter: CrossProofFilter & { limit?: number } = {}
  if (args.since) filter.since = args.since
  if (args.proofs) {
    filter.proofIds = args.proofs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (args['probe-types']) {
    const types = args['probe-types']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (types.length > 0) {
      ;(filter as CrossProofFilter & { probeTypes?: string[] }).probeTypes = types
    }
  }
  if (args.limit) filter.limit = Number.parseInt(args.limit, 10)
  return filter
}

export function renderInsightHuman(insight: Insight): string {
  const lines: string[] = []
  lines.push(`=== Insight: ${insight.proofId} (${insight.proof.verdict}) ===`)
  lines.push(`Run at: ${insight.proof.runAt}`)
  lines.push('')

  lines.push(`## Evidence (${insight.proof.evidenceChain.length})`)
  for (const e of insight.proof.evidenceChain) {
    const icon = e.conclusion.startsWith('满足验收') ? '✅' : '❌'
    const targetStr = e.target ? ` (${e.target})` : ''
    lines.push(`  ${icon} ${e.probe} [${e.probeType}]${targetStr}`)
    lines.push(`     fact: ${e.fact}`)
    lines.push(`     conclusion: ${e.conclusion}`)
  }

  lines.push('')
  lines.push(`## Probe Stats (${insight.probeStats.totalRuns} runs)`)
  lines.push(`  Overall pass rate: ${(insight.probeStats.overallPassRate * 100).toFixed(1)}%`)
  for (const [type, s] of Object.entries(insight.probeStats.byType)) {
    const consecutiveFails = Object.entries(s.consecutiveFailsByTarget)
    if (consecutiveFails.length > 0) {
      lines.push(
        `  ${type}: ${s.pass}/${s.total} pass (consecutive fails: ${consecutiveFails.map(([t, n]) => `${t}=${n}`).join(', ')})`,
      )
    } else {
      lines.push(`  ${type}: ${s.pass}/${s.total} pass`)
    }
  }

  lines.push('')
  lines.push(`## Emergent Patterns (${insight.emergentPatterns.length})`)
  if (insight.emergentPatterns.length === 0) {
    lines.push('  (none detected)')
  } else {
    for (const p of insight.emergentPatterns) {
      const targetStr = p.target ? ` → ${p.target}` : ''
      lines.push(`  • [${p.type}] ${p.probeType}${targetStr} (occurrences=${p.occurrences})`)
    }
  }

  return lines.join('\n')
}

export function renderCrossProofHuman(
  insight: CrossProofInsight,
  skipped: Array<{ name: string; reason: string }>,
): string {
  const lines: string[] = []
  lines.push(`=== Cross-Proof Insight (${insight.proofCount} proofs) ===`)
  if (insight.since) lines.push(`Since: ${insight.since}`)
  lines.push(`Generated at: ${insight.generatedAt}`)
  if (skipped.length > 0) {
    lines.push(`Skipped: ${skipped.length} (e.g. ${skipped[0]?.name ?? '?'}: ${skipped[0]?.reason ?? '?'})`)
  }
  lines.push('')

  lines.push(`## Probe Effectiveness (${insight.probeEffectiveness.length} probe types)`)
  if (insight.probeEffectiveness.length === 0) {
    lines.push('  (no probe data)')
  } else {
    for (const p of insight.probeEffectiveness) {
      const failPct = (p.failRate * 100).toFixed(1)
      lines.push(
        `  ${p.probeType}: ${p.failedProofs}/${p.totalRuns} failed (${failPct}%) [F:${p.failureVerdicts.FAILED}, I:${p.failureVerdicts.INCONCLUSIVE}]`,
      )
    }
  }
  lines.push('')

  lines.push(`## Trend Signals (${insight.trends.length})`)
  if (insight.trends.length === 0) {
    lines.push('  (none detected; need ≥3 runs per (probeType, target))')
  } else {
    const icon = (trend: string): string => {
      switch (trend) {
        case 'worsening':
          return '📉'
        case 'improving':
          return '📈'
        case 'volatile':
          return '🔀'
        case 'stable-pass':
          return '✅'
        case 'stable-fail':
          return '❌'
        default:
          return '⚠️'
      }
    }
    for (const t of insight.trends) {
      const targetStr = t.target ? ` → ${t.target}` : ''
      lines.push(
        `  ${icon(t.trend)} [${t.trend}] ${t.probeType}${targetStr} (latest: ${t.latestVerdict}, streak=${t.currentStreak}, window=${t.windowSize})`,
      )
    }
  }
  lines.push('')

  const top10 = insight.trendMatrix.slice(0, 10)
  lines.push(`## Trend Matrix (top ${top10.length} of ${insight.trendMatrix.length})`)
  if (top10.length === 0) {
    lines.push('  (no trend data)')
  } else {
    for (const e of top10) {
      const targetStr = e.target ? ` \`${e.target}\`` : ' (no target)'
      const seqStr = e.sequence
        .slice(-5)
        .map((s) => (s.verdict === 'PASSED' ? '✅' : s.verdict === 'INCONCLUSIVE' ? '⚠️' : '❌'))
        .join('')
      lines.push(
        `  ${e.probeType}${targetStr}: total=${e.total} (P${e.passedCount}/F${e.failedCount}/I${e.inconclusiveCount}) last5=${seqStr}`,
      )
    }
  }
  lines.push('')

  const top5corr = insight.correlationMatrix.slice(0, 5)
  lines.push(`## Correlation Matrix (top ${top5corr.length} of ${insight.correlationMatrix.length})`)
  if (top5corr.length === 0) {
    lines.push('  (no significant correlations; need ≥2 co-occurrences)')
  } else {
    for (const c of top5corr) {
      const rate = (c.coFailureRate * 100).toFixed(1)
      lines.push(`  ${c.probeTypeA} ↔ ${c.probeTypeB}: ${c.coOccurrences} co-occur, ${c.coFailures} co-fail (${rate}%)`)
    }
  }

  return lines.join('\n')
}

function resolveTypeNameSimple(ref: string): string {
  return ref.replace(/^@oxn\/probes?\//, '') || ref
}

function extractTargetFromProbe(probe: { output?: unknown }): string | undefined {
  const output = probe.output
  if (output === null || output === undefined) return undefined
  if (typeof output !== 'object') return undefined
  const obj = output as Record<string, unknown>
  const candidates = [obj.params, obj.target, obj.path, obj.url, obj.command, obj.file]
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c
    if (c && typeof c === 'object') {
      for (const v of Object.values(c as Record<string, unknown>)) {
        if (typeof v === 'string' && v.length > 0) return v
      }
    }
  }
  return undefined
}

export function renderPipelineHuman(insight: PipelineInsight): string {
  const lines: string[] = []
  lines.push(
    `=== Pipeline Insight (${insight.domainCount} domains, ${insight.blueprintCount} blueprints, ${insight.workCount} works, ${insight.proofCount} proofs) ===`,
  )
  lines.push('')

  lines.push(`## Invariant Effectiveness (${insight.invariantEffectiveness.length})`)
  if (insight.invariantEffectiveness.length === 0) {
    lines.push('  (no invariants found)')
  } else {
    for (const inv of insight.invariantEffectiveness) {
      const icon =
        inv.status === 'critical' ? '❌' : inv.status === 'warning' ? '⚠️' : inv.status === 'unused' ? '💤' : '✅'
      const rate = (inv.hitRate * 100).toFixed(0)
      lines.push(`  ${icon} [${inv.status}] ${inv.domainName}: ${inv.invariantText.slice(0, 80)}`)
      lines.push(`     works=${inv.totalWorks} failed=${inv.failedWorks} proofs=${inv.totalProofs} hitRate=${rate}%`)
    }
  }
  lines.push('')

  lines.push(`## Intent Coverage Gaps (${insight.intentCoverageGaps.length})`)
  if (insight.intentCoverageGaps.length === 0) {
    lines.push('  (no blueprints with observe declarations)')
  } else {
    for (const gap of insight.intentCoverageGaps) {
      const rate = (gap.coverageRate * 100).toFixed(0)
      const missingStr = gap.missing.length > 0 ? ` missing=[${gap.missing.join(', ')}]` : ''
      lines.push(
        `  ${gap.source} (${gap.sourceType}): ${gap.actual.length}/${gap.declared.length} covered (${rate}%)${missingStr}`,
      )
    }
  }
  lines.push('')

  lines.push(`## Work → Proof Traces (${insight.workProofTraces.length})`)
  if (insight.workProofTraces.length === 0) {
    lines.push('  (no work-proof traces)')
  } else {
    for (const trace of insight.workProofTraces) {
      const proofStr = trace.proofs.map((p) => `${p.verdict === 'PASSED' ? '✅' : '❌'} ${p.proofId}`).join(', ')
      lines.push(`  ${trace.workName}: ${proofStr}`)
    }
  }

  return lines.join('\n')
}

export interface SingleProofInsightResult {
  ok: true
  insight: Insight
}

export function computeSingleProofInsight(projectRoot: string, proofName: string): SingleProofInsightResult {
  const statsPath = join(projectRoot, BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON)
  const inputs = readInsightInputs(projectRoot, proofName, statsPath)
  if ('error' in inputs) {
    throw new Error(inputs.error)
  }
  const insight = computeInsightFromInputs(projectRoot, proofName, inputs.frozen, inputs.stats)
  return { ok: true, insight }
}

export interface CrossProofInsightResult {
  ok: true
  insight: CrossProofInsight
  skipped: Array<{ name: string; reason: string }>
}

export function computeCrossProofInsightData(
  projectRoot: string,
  filter: CrossProofFilter & { limit?: number },
): CrossProofInsightResult {
  const scanResult = scanFrozenProofs(projectRoot, filter)
  if (!scanResult.ok) {
    throw new Error(scanResult.reason ?? 'scan failed')
  }
  if (scanResult.frozen.length === 0) {
    throw new Error(`no frozen proofs found under ${join(projectRoot, '.openxenon', 'proofs')}`)
  }
  const limitedFrozen =
    filter.limit && filter.limit > 0 && scanResult.frozen.length > filter.limit
      ? scanResult.frozen.slice(scanResult.frozen.length - filter.limit)
      : scanResult.frozen
  const insight = computeCrossProofInsightFromInputs(projectRoot, limitedFrozen, filter)
  return { ok: true, insight, skipped: scanResult.skipped }
}

export interface PipelineInsightResult {
  ok: true
  insight: PipelineInsight
}

export function computePipelineInsightData(projectRoot: string, workFilter?: string): PipelineInsightResult {
  const scanResult = scanPipelineInput(projectRoot)
  if (
    scanResult.domains.length === 0 &&
    scanResult.blueprints.length === 0 &&
    scanResult.works.length === 0 &&
    scanResult.allFrozenProofs.length === 0
  ) {
    throw new Error('no domains, blueprints, works, or proofs found in .openxenon/')
  }

  const filteredWorks = workFilter ? scanResult.works.filter((w) => w.workName === workFilter) : scanResult.works

  const insight = computePipelineInsightFromInputs({
    projectRoot,
    domains: scanResult.domains,
    blueprints: scanResult.blueprints,
    works: filteredWorks.map((w) => ({
      name: w.workName,
      domainRefs: w.domainRefs,
      blueprintRefs: w.blueprintRefs,
      proofs: w.proofIds
        .map((pid) => {
          const fp = scanResult.allFrozenProofs.find((p) => p.name === pid)
          if (!fp) return null
          return {
            proofId: fp.name,
            verdict: fp.verdict,
            runAt: fp.runAt,
            probeSummary: fp.probes.map((p) => ({
              probeType: resolveTypeNameSimple(p.ref),
              verdict: p.verdict,
              ...(extractTargetFromProbe(p) !== undefined ? { target: extractTargetFromProbe(p) } : {}),
            })),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      traceEventCount: w.traceEventCount,
    })),
    allFrozenProofs: scanResult.allFrozenProofs,
  })

  return { ok: true, insight }
}
