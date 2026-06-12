// =============================================================================
// probe-stats-updater.ts (v0.1.2)
//
// L0-Processor 纯函数：把一次 proof run 的 frozen.json 增量合并到 probe-stats。
//
// 输入：当前 stats（可能为空） + 新的 FrozenProof
// 输出：新 stats（不可变，不修改入参）
//
// 调用方向：仅 L3-CLI 可调（编排）。L1-Infra 不可调（避免 §4.1 违规）。
//
// 累计语义：
//   - totalCount / passCount / failCount：单调递增
//   - targets.<name>.consecutiveFails：最近一次失败 +1；最近一次成功则清零
//   - proofRuns：FIFO 上限 MAX_PROOF_RUNS 条
// =============================================================================

import { MAX_PROOF_RUNS } from '../constants'
import { getSemanticNameByInternalRef } from './catalog'
import { extractTarget } from './extraction'
import type { FrozenProof } from '../schemas/proof-schema'
import {
  emptyProbeStats,
  type ProbeRunRecord,
  type ProbeStats,
  type ProbeTargetStats,
  type ProbeTypeStats,
} from '../schemas/probe-stats-schema'

/** 从 frozen probe 的 ref 反查语义名；fallback 到 ref 去前缀 */
function resolveTypeName(ref: string): string {
  const byRef = getSemanticNameByInternalRef(ref)
  if (byRef) return byRef
  // fallback：去 @oxn/probes/ 或 @oxn/probe/ 前缀
  return ref.replace(/^@oxn\/probes?\//, '') || ref
}

/**
 * 把一次 frozen proof 合并进 stats（纯函数）。
 *
 * 不修改入参；返回全新的 stats 对象。
 * FIFO 截断：proofRuns 超过 MAX_PROOF_RUNS 时丢弃最旧的。
 */
export function updateProbeStats(stats: ProbeStats, frozen: FrozenProof): ProbeStats {
  // 浅克隆顶层（probes / proofRuns 重新构造）
  const probes: Record<string, ProbeTypeStats> = {}
  for (const [type, s] of Object.entries(stats.probes) as [string, ProbeTypeStats][]) {
    probes[type] = {
      totalCount: s.totalCount,
      passCount: s.passCount,
      failCount: s.failCount,
      lastRun: s.lastRun,
      targets: { ...s.targets },
    }
  }

  const proofRuns: ProbeRunRecord[] = [...stats.proofRuns]

  // 累计每个 probe 的统计
  const probeSummary: ProbeRunRecord['probeSummary'] = []

  for (const p of frozen.probes) {
    const typeName = resolveTypeName(p.ref)
    const target = extractTarget(p)
    const existing = probes[typeName] ?? {
      totalCount: 0,
      passCount: 0,
      failCount: 0,
      lastRun: frozen.runAt,
      targets: {},
    }

    const newTypeStats: ProbeTypeStats = {
      ...existing,
      totalCount: existing.totalCount + 1,
      passCount: existing.passCount + (p.passed ? 1 : 0),
      failCount: existing.failCount + (p.passed ? 0 : 1),
      lastRun: frozen.runAt,
    }

    // target 细分（如果有 target）
    if (target !== undefined) {
      const existingTarget: ProbeTargetStats = newTypeStats.targets[target] ?? {
        total: 0,
        pass: 0,
        fail: 0,
        consecutiveFails: 0,
        lastRun: frozen.runAt,
      }
      const newTarget: ProbeTargetStats = {
        total: existingTarget.total + 1,
        pass: existingTarget.pass + (p.passed ? 1 : 0),
        fail: existingTarget.fail + (p.passed ? 0 : 1),
        consecutiveFails: p.passed ? 0 : existingTarget.consecutiveFails + 1,
        lastRun: frozen.runAt,
      }
      newTypeStats.targets = { ...newTypeStats.targets, [target]: newTarget }
    }

    probes[typeName] = newTypeStats
    probeSummary.push({
      type: typeName,
      ...(target !== undefined ? { target } : {}),
      passed: p.passed,
    })
  }

  // 追加 proofRun 记录 + FIFO 截断
  // v1.1 fix-p3-refactor probe-stats-splice-clarify: 显式说明
  //   - `proofRuns` 是浅克隆副本 ([...stats.proofRuns] line 56)
  //   - 这里的 `push` + `splice` 只动副本, 不修改入参 stats.proofRuns
  //   - 入参 stats 保持完整不可变 (functional update 范式)
  const newRun: ProbeRunRecord = {
    proofId: frozen.name,
    timestamp: frozen.runAt,
    verdict: frozen.verdict,
    probeSummary,
  }
  proofRuns.push(newRun)
  if (proofRuns.length > MAX_PROOF_RUNS) {
    proofRuns.splice(0, proofRuns.length - MAX_PROOF_RUNS)
  }

  return {
    schemaVersion: 1,
    projectRoot: stats.projectRoot,
    probes,
    proofRuns,
    updatedAt: new Date().toISOString(),
  }
}

/** 便捷函数：空 stats + 一次 frozen → 新 stats */
export function initProbeStatsFromFrozen(projectRoot: string, frozen: FrozenProof): ProbeStats {
  return updateProbeStats(emptyProbeStats(projectRoot), frozen)
}
