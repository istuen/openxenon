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
import { t } from '@openxenon/engine/infra/i18n'
import {
  BOUNDARY_DIR,
  CACHE_DIR,
  PROBE_STATS_JSON,
  computeCrossProofInsightFromInputs,
  computeInsightFromInputs,
  computePipelineInsightFromInputs,
  type CrossProofInsight,
} from '@openxenon/engine/kernel'
import { readInsightInputs } from '@openxenon/engine/infra/probes/insight-collector'
import { scanFrozenProofs } from '@openxenon/engine/infra/insight/cross-proof-scanner'
import { scanPipelineInput } from '@openxenon/engine/infra/insight/pipeline-analyzer'
import { getFormatFromArgs, output, outputUserInputError, type OutputFormat } from './output'
import {
  parseCrossProofArgs,
  renderInsightHuman,
  renderCrossProofHuman,
  renderPipelineHuman,
} from '@openxenon/engine/Insight/insight-manager'

interface CrossProofCliArgs {
  since?: string
  proofs?: string
  'probe-types'?: string
  limit?: string
}

function getProjectRoot(): string {
  return process.cwd()
}

function getProbeStatsPath(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON)
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
    const pipeline = ctx.args.pipeline === true

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

async function runPipelineMode(args: Record<string, unknown>, format: OutputFormat) {
  const projectRoot = getProjectRoot()
  const workFilter = (args.work as string | undefined) ?? undefined

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
            outcome: fp.outcome,
            runAt: fp.runAt,
            probeSummary: fp.probes.map((p) => ({
              probeType: p.ref.replace(/^@oxn\/probes?\//, '') || p.ref,
              outcome: p.outcome,
            })),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      traceEventCount: w.traceEventCount,
    })),
    allFrozenProofs: scanResult.allFrozenProofs,
  })

  output(
    {
      ok: true,
      data: insight,
      human: renderPipelineHuman(insight),
    },
    format,
  )
}
