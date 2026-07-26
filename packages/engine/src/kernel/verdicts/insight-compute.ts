// =============================================================================
// insight-compute.ts (v0.1.2)
//
// L0-Processor 纯函数：frozen.json + probe-stats.json → Insight
//
// 输入：已加载的 FrozenProof + ProbeStats（IO 由 L1-Infra 完成）
// 输出：Insight 对象（无 IO）
//
// 调用方向：仅 L3-CLI 可调。L1-Infra 不可调（避免 §4.1 违规）。
//
// 设计要点：
//   - evidenceChain：从 frozen.probes 提取 fact/conclusion
//   - emergentPatterns：从 probeStats 推出三种模式信号
//   - probeStats 视图：聚合 stats 的关键指标
// =============================================================================

import { getSemanticNameByInternalRef } from './catalog'
import { extractTarget } from './extraction'
import type { FrozenProof, FrozenProofProbeResult } from '../schemas/proof-schema'
import type { ProbeStats } from '../schemas/probe-stats-schema'
import type { Evidence, EmergentPattern, Insight, ProbeStatsView, ProbeTypeStatsView } from '../schemas/insight-schema'

/** 从 frozen probe 的 output.outcome 抽 fact（优先 message，fallback 到 actual 序列化） */
function extractFact(probe: FrozenProofProbeResult): string {
  const output = probe.output as { outcome?: { message?: string; actual?: unknown } } | undefined
  const outcome = output?.outcome
  if (outcome?.message) return outcome.message
  if (outcome?.actual !== undefined) return JSON.stringify(outcome.actual)
  return probe.errorMessage ?? '(no detail)'
}

/** 从 frozen probe 的 ref 反查语义名；fallback 去前缀 */
function resolveTypeName(ref: string): string {
  const byRef = getSemanticNameByInternalRef(ref)
  if (byRef) return byRef
  return ref.replace(/^@oxn\/probes?\//, '') || ref
}

/** 从 probe + frozen run 推导 conclusion */
function deriveConclusion(probe: FrozenProofProbeResult): string {
  if (probe.passed) return '满足验收'
  // FAILED：优先 errorMessage，否则用 fact
  const reason = probe.errorMessage ?? extractFact(probe)
  return `验收未通过：${reason}`
}

/**
 * 把 frozen.json 的 probes 转成 evidence chain（第一层）。
 */
export function evidenceChainFromFrozen(frozen: FrozenProof): Evidence[] {
  return frozen.probes.map((p) => {
    const probeType = resolveTypeName(p.ref)
    const target = extractTarget(p)
    return {
      probe: p.probeName,
      probeType,
      ...(target !== undefined ? { target } : {}),
      fact: extractFact(p),
      conclusion: deriveConclusion(p),
    }
  })
}

/**
 * 把 probe-stats.json 转成 Insight 内的精简视图（第二层）。
 */
export function buildProbeStatsView(stats: ProbeStats): ProbeStatsView {
  const totalRuns = stats.proofRuns.length
  let totalProbes = 0
  let totalPass = 0
  const byType: Record<string, ProbeTypeStatsView> = {}

  for (const [type, s] of Object.entries(stats.probes) as [string, ProbeStats['probes'][string]][]) {
    totalProbes += s.totalCount
    totalPass += s.passCount

    const consecutiveFailsByTarget: Record<string, number> = {}
    for (const [target, ts] of Object.entries(s.targets)) {
      if (ts.consecutiveFails > 0) {
        consecutiveFailsByTarget[target] = ts.consecutiveFails
      }
    }

    byType[type] = {
      total: s.totalCount,
      pass: s.passCount,
      fail: s.failCount,
      consecutiveFailsByTarget,
    }
  }

  const overallPassRate = totalProbes > 0 ? totalPass / totalProbes : 0

  return {
    totalRuns,
    totalProbes,
    overallPassRate,
    byType,
  }
}

/**
 * 从 probe-stats + 本次 frozen 推导涌现模式（第三层）。
 *
 * 三种模式：
 *   1. consecutive-fail: 本次 proof 失败的 probe 中，凡 stats.consecutiveFails ≥ 2
 *   2. cross-proof-repeat: 同一 probe type 在 ≥ 3 个 proofRuns 中出现过
 *   3. cross-proof-fail-clusters: 同一 probe type + target 在 ≥ 2 个 proofRuns 中都失败
 */
export function detectEmergentPatterns(stats: ProbeStats, thisFrozen: FrozenProof): EmergentPattern[] {
  const patterns: EmergentPattern[] = []

  // 模式 1: consecutive-fail（撞墙信号）
  for (const p of thisFrozen.probes) {
    if (p.passed) continue
    const typeName = resolveTypeName(p.ref)
    const target = extractTarget(p)
    if (target === undefined) continue

    const typeStats = stats.probes[typeName]
    const targetStats = typeStats?.targets[target]
    if (!targetStats) continue

    if (targetStats.consecutiveFails >= 2) {
      patterns.push({
        type: 'consecutive-fail',
        probeType: typeName,
        target,
        occurrences: targetStats.consecutiveFails,
        details: {
          total: targetStats.total,
          pass: targetStats.pass,
          fail: targetStats.fail,
          lastRun: targetStats.lastRun,
        },
      })
    }
  }

  // 模式 2: cross-proof-repeat（重复模式信号）
  for (const [typeName, typeStats] of Object.entries(stats.probes) as [string, ProbeStats['probes'][string]][]) {
    // 统计该 probe type 出现在多少个独立 proofRuns 中
    const proofsWithThisType = new Set<string>()
    for (const run of stats.proofRuns) {
      for (const s of run.probeSummary) {
        if (s.type === typeName) proofsWithThisType.add(run.proofId)
      }
    }
    if (proofsWithThisType.size >= 3) {
      patterns.push({
        type: 'cross-proof-repeat',
        probeType: typeName,
        occurrences: proofsWithThisType.size,
        details: {
          totalRuns: typeStats.totalCount,
          passRuns: typeStats.passCount,
          failRuns: typeStats.failCount,
          proofIds: Array.from(proofsWithThisType),
        },
      })
    }
  }

  // 模式 3: cross-proof-fail-clusters（设计缺陷信号）
  // 统计 (probeType + target) 在多少个独立 proofRuns 中都失败
  const failClusterMap: Record<string, { proofIds: Set<string>; occurrences: number }> = {}
  for (const run of stats.proofRuns) {
    if (run.outcome !== 'DEVIATED') continue
    for (const s of run.probeSummary) {
      if (s.passed || !s.target) continue
      const key = `${s.type}\x00${s.target}`
      if (!failClusterMap[key]) {
        failClusterMap[key] = { proofIds: new Set(), occurrences: 0 }
      }
      failClusterMap[key]!.proofIds.add(run.proofId)
      failClusterMap[key]!.occurrences += 1
    }
  }

  for (const [key, cluster] of Object.entries(failClusterMap)) {
    if (cluster.proofIds.size >= 2) {
      const [probeType, target] = key.split('\x00') as [string, string]
      patterns.push({
        type: 'cross-proof-fail-clusters',
        probeType,
        target,
        occurrences: cluster.proofIds.size,
        details: {
          totalOccurrences: cluster.occurrences,
          proofIds: Array.from(cluster.proofIds),
        },
      })
    }
  }

  return patterns
}

/**
 * 完整组装 Insight（顶层入口）。
 */
export function computeInsightFromInputs(
  projectRoot: string,
  proofId: string,
  frozen: FrozenProof,
  stats: ProbeStats,
): Insight {
  return {
    schemaVersion: 1,
    projectRoot,
    proofId,
    generatedAt: new Date().toISOString(),
    proof: {
      name: frozen.name,
      outcome: frozen.outcome,
      runAt: frozen.runAt,
      evidenceChain: evidenceChainFromFrozen(frozen),
    },
    probeStats: buildProbeStatsView(stats),
    emergentPatterns: detectEmergentPatterns(stats, frozen),
    meta: {
      insightVersion: '0.1.0',
      dataSources: ['frozen.json', 'probe-stats.json'],
    },
  }
}
