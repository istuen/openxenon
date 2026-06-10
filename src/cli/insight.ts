// =============================================================================
// `oxn insight` — Proof → Intent 结构化反馈（v0.1.2）
//
// 读 frozen.json（本次判决）+ probe-stats.json（跨 proof 历史）→ 产出 Insight。
// 不混入策略：emergentPatterns 是原始数据，AI 自己推导结论。
//
// 编排仅在 L3：
//   1. 构造 statsPath（避免 L1 直接导入 kernel/constants 引发 §4.1 违规）
//   2. 调 L1 readInsightInputs（IO + schema 校验）
//   3. 调 L0 computeInsightFromInputs（纯函数）
//   4. 调 output 输出 JSON / YAML / human
// =============================================================================

import { defineCommand } from 'citty'
import { join } from 'path'
import { BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON } from '../kernel/constants'
import { readInsightInputs } from '../infra/probes/insight-collector'
import { computeInsightFromInputs } from '../kernel/verdicts/insight-compute'
import { getFormatFromArgs, output, outputUserInputError } from './output'
import type { Insight } from '../kernel/schemas/insight-schema'

function getProjectRoot(): string {
  return process.cwd()
}

function getProbeStatsPath(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON)
}

export default defineCommand({
  meta: {
    name: 'insight',
    description: '读取 frozen.json + probe-stats.json，产出结构化 Insight（v0.1.2 P→I 反馈；不混入策略）',
  },
  args: {
    proof: {
      type: 'string',
      required: true,
      description: 'Proof 名称（必填）',
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const proofName = ctx.args.proof as string

    // 1. 编排：L3 计算 statsPath（避免 L1 → kernel/constants 违规）
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
  },
})

/** Human 渲染（控制台友好版） */
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
