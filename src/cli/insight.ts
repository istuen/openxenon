// =============================================================================
// `oxn insight` — Proof → Intent 结构化反馈（v0.1.2 + v0.5 PR-B）
//
// 两种模式（互斥）：
//   1. 单 proof 模式（默认）：
//      `oxn insight <proof>`
//      读 frozen.json（本次判决）+ probe-stats.json（跨 proof 历史）→ 产出 Insight
//      不混入策略：emergentPatterns 是原始数据，AI 自己推导结论。
//
//   2. 跨 proof 模式（v0.5 PR-B 新增）：
//      `oxn insight --cross-proof`
//      主动扫描 proofs/*/frozen.json 全集 → 产出 CrossProofInsight
//      4 维分析：trendMatrix / correlationMatrix / trends / probeEffectiveness
//
//   3. Pipeline 模式（v0.5 PR-C 新增）：
//      `oxn insight --pipeline`
//      关联 domains/ + blueprints/ + works/ + proofs/ 四层资产
//      产出 PipelineInsight：invariantEffectiveness / coverageGaps / workProofTraces
//      `oxn insight --pipeline --work <name>` 追踪单个 work 的 IAP 全链
//
// 编排仅在 L3：
//   1. 构造 statsPath（避免 L1 直接导入 kernel/constants 引发 §4.1 违规）
//   2. 调 L1 readInsightInputs / scanFrozenProofs（IO + schema 校验）
//   3. 调 L0 computeInsightFromInputs / computeCrossProofInsightFromInputs（纯函数）
//   4. 调 output 输出 JSON / YAML / human
// =============================================================================

import { defineCommand } from 'citty'
import { join } from 'path'
import { t } from '../infra/i18n'
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
} from '../kernel/index'
import { readInsightInputs } from '../infra/probes/insight-collector'
import { scanFrozenProofs } from '../infra/insight/cross-proof-scanner'
import { scanPipelineInput } from '../infra/insight/pipeline-analyzer'
import { getFormatFromArgs, output, outputUserInputError, type OutputFormat } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

function getProbeStatsPath(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON)
}

/**
 * 跨 proof 模式的过滤参数（CLI args → CrossProofFilter）
 * 注：citty 把 --key 转换为 ctx.args.key（去掉前导 --，kebab 保持）
 */
interface CrossProofCliArgs {
  since?: string
  proofs?: string
  'probe-types'?: string
  limit?: string
}

function parseCrossProofArgs(args: CrossProofCliArgs): CrossProofFilter & { limit?: number } {
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

export default defineCommand({
  meta: {
    name: 'insight',
    description: t('insight.description'),
  },
  args: {
    proof: {
      type: 'string',
      description: t('insight.proof'),
    },
    '--cross-proof': {
      type: 'boolean',
      description: 'v0.5 PR-B: 跨多 proof 趋势分析（不需指定 proof）',
    },
    '--since': {
      type: 'string',
      description: '仅扫描 runAt >= 此 ISO 时间（仅 --cross-proof 模式）',
    },
    '--proofs': {
      type: 'string',
      description: '逗号分隔的 proofId 列表（仅 --cross-proof 模式）',
    },
    '--probe-types': {
      type: 'string',
      description: '逗号分隔的 probeType 列表（仅 --cross-proof 模式）',
    },
    '--limit': {
      type: 'string',
      description: '最多扫描的 proof 数（仅 --cross-proof 模式）',
    },
    '--pipeline': {
      type: 'boolean',
      description: 'v0.5 PR-C: Intent→Work→Proof 全链分析（不需指定 proof）',
    },
    '--work': {
      type: 'string',
      description: '追踪指定 work 的 IAP 全链（仅 --pipeline 模式）',
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    // citty strips leading "--" from args key (so ctx.args["cross-proof"] not ctx.args["--cross-proof"])
    const crossProof = ctx.args['cross-proof'] === true
    const pipeline = ctx.args['pipeline'] === true

    if (pipeline) {
      return runPipelineMode(ctx.args as Record<string, unknown>, format)
    }
    if (crossProof) {
      return runCrossProofMode(ctx.args as CrossProofCliArgs, format)
    }
    return runSingleProofMode(ctx.args.proof as string | undefined, format)
  },
})

async function runSingleProofMode(proofName: string | undefined, format: OutputFormat) {
  if (!proofName) {
    return outputUserInputError(
      'OXN_INSIGHT_INPUT_MISSING',
      'proof name required (or use --cross-proof for cross-proof mode)',
      { suggestion: 'Use `oxn insight <proof>` or `oxn insight --cross-proof`.', format },
    )
  }

  // 1. 编排：L3 计算 statsPath
  const projectRoot = getProjectRoot()
  const statsPath = getProbeStatsPath()

  // 2. L1 IO
  const inputs = readInsightInputs(projectRoot, proofName, statsPath)
  if ('error' in inputs) {
    return outputUserInputError('OXN_INSIGHT_INPUT_MISSING', inputs.error, {
      suggestion: 'Run `oxn proof run <name>` first, then retry.',
      format,
    })
  }

  // 3. L0 纯函数计算
  const insight = computeInsightFromInputs(projectRoot, proofName, inputs.frozen, inputs.stats)

  // 4. 输出
  output(
    {
      ok: true,
      data: insight,
      human: renderInsightHuman(insight),
    },
    format,
  )
}

async function runCrossProofMode(args: CrossProofCliArgs, format: OutputFormat) {
  // 1. 编排
  const projectRoot = getProjectRoot()
  const filter = parseCrossProofArgs(args)

  // 2. L1 IO：扫描全部 frozen.json
  const scanResult = scanFrozenProofs(projectRoot, filter)
  if (!scanResult.ok) {
    return outputUserInputError('OXN_INSIGHT_INPUT_MISSING', scanResult.reason ?? 'scan failed', {
      suggestion: 'Run at least one `oxn proof run <name>` first.',
      format,
    })
  }

  if (scanResult.frozen.length === 0) {
    return outputUserInputError(
      'OXN_INSIGHT_NO_PROOFS',
      `no frozen proofs found under ${join(projectRoot, '.openxenon', 'proofs')}`,
      {
        suggestion:
          scanResult.skipped.length > 0
            ? `Found ${scanResult.skipped.length} skipped (in-progress / failed). Run \`oxn proof run <name>\` to complete them.`
            : 'Run `oxn proof run <name>` first.',
        format,
      },
    )
  }

  // 3. L1 limit（裁剪最旧的）
  const limitedFrozen =
    filter.limit && filter.limit > 0 && scanResult.frozen.length > filter.limit
      ? scanResult.frozen.slice(scanResult.frozen.length - filter.limit)
      : scanResult.frozen

  // 4. L0 纯函数计算
  const insight = computeCrossProofInsightFromInputs(projectRoot, limitedFrozen, filter)

  // 5. 输出（含 skipped 提示）
  output(
    {
      ok: true,
      data: {
        ...insight,
        skipped: scanResult.skipped,
      } as unknown as CrossProofInsight & { skipped: typeof scanResult.skipped },
      human: renderCrossProofHuman(insight, scanResult.skipped),
    },
    format,
  )
}

/** 单 proof Insight 的 human 渲染（保留原实现） */
function renderInsightHuman(insight: Insight): string {
  const lines: string[] = []
  lines.push(`=== Insight: ${insight.proofId} (${insight.proof.verdict}) ===`)
  lines.push(`Run at: ${insight.proof.runAt}`)
  lines.push('')

  // 第一层：证据
  lines.push(`## Evidence (${insight.proof.evidenceChain.length})`)
  for (const e of insight.proof.evidenceChain) {
    const icon = e.conclusion.startsWith('满足验收') ? '✅' : '❌'
    const targetStr = e.target ? ` (${e.target})` : ''
    lines.push(`  ${icon} ${e.probe} [${e.probeType}]${targetStr}`)
    lines.push(`     fact: ${e.fact}`)
    lines.push(`     conclusion: ${e.conclusion}`)
  }

  // 第二层：历史视角
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

  // 第三层：涌现模式
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

/** 跨 proof CrossProofInsight 的 human 渲染 */
function renderCrossProofHuman(insight: CrossProofInsight, skipped: Array<{ name: string; reason: string }>): string {
  const lines: string[] = []
  lines.push(`=== Cross-Proof Insight (${insight.proofCount} proofs) ===`)
  if (insight.since) lines.push(`Since: ${insight.since}`)
  lines.push(`Generated at: ${insight.generatedAt}`)
  if (skipped.length > 0) {
    lines.push(`Skipped: ${skipped.length} (e.g. ${skipped[0]?.name ?? '?'}: ${skipped[0]?.reason ?? '?'})`)
  }
  lines.push('')

  // 维度 4：探针有效性（最优先，决策导向）
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

  // 维度 3：恶化/改善信号
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

  // 维度 1：trend matrix（仅显示活跃 top 10）
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

  // 维度 2：关联矩阵（top 5）
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

// ─── Pipeline 模式（v0.5 PR-C） ───────────────────────────────────────────

async function runPipelineMode(args: Record<string, unknown>, format: OutputFormat) {
  const projectRoot = getProjectRoot()
  const workFilter = (args['work'] as string | undefined) ?? undefined

  // 1. L1 IO：跨 subsystems 扫描
  const scanResult = scanPipelineInput(projectRoot)

  if (
    scanResult.domains.length === 0 &&
    scanResult.blueprints.length === 0 &&
    scanResult.works.length === 0 &&
    scanResult.allFrozenProofs.length === 0
  ) {
    return outputUserInputError(
      'OXN_INSIGHT_NO_DATA',
      'no domains, blueprints, works, or proofs found in .openxenon/',
      {
        suggestion:
          'Create a domain (`oxn domain create`), blueprint (`oxn blueprint create`), work (`oxn work create`), or run a proof (`oxn proof run`).',
        format,
      },
    )
  }

  // 2. 转换为 PipelineInput（work filter if given）
  const filteredWorks = workFilter ? scanResult.works.filter((w) => w.workName === workFilter) : scanResult.works

  // 3. L0 纯函数计算
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

  // 4. 输出
  output(
    {
      ok: true,
      data: insight,
      human: renderPipelineHuman(insight),
    },
    format,
  )
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

function renderPipelineHuman(insight: PipelineInsight): string {
  const lines: string[] = []
  lines.push(
    `=== Pipeline Insight (${insight.domainCount} domains, ${insight.blueprintCount} blueprints, ${insight.workCount} works, ${insight.proofCount} proofs) ===`,
  )
  lines.push('')

  // 维度 1：Invariant Effectiveness
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

  // 维度 2：Coverage Gaps
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

  // 维度 3：Work→Proof Traces
  lines.push(`## Work → Proof Traces (${insight.workProofTraces.length})`)
  if (insight.workProofTraces.length === 0) {
    lines.push('  (no works with associated proofs)')
  } else {
    for (const trace of insight.workProofTraces) {
      const proofList =
        trace.proofs.length > 0 ? trace.proofs.map((p) => `${p.verdict}/${p.proofId}`).join(', ') : '(no proofs)'
      const domainList = trace.domains.length > 0 ? ` [${trace.domains.join(', ')}]` : ''
      lines.push(
        `  ${trace.workName}${domainList}: ${trace.proofs.length} proofs (${proofList}), ${trace.traceEventCount} trace events`,
      )
    }
  }

  return lines.join('\n')
}
