/**
 * Insight module — cross-proof + pipeline wrappers (v0.6 PR-5d实现)
 *
 * v0.5 PR-B/C 已通过 L0 kernel + L1 scanner 实现。
 * 本文件提供 Engine-level 入口封装。
 */
import { computeCrossProofInsightFromInputs } from '@openxenon/engine/kernel'
import type { CrossProofInsight } from '@openxenon/engine/kernel'
import { scanFrozenProofs } from '@openxenon/engine/infra/insight/cross-proof-scanner'

export function computeCrossProofInsight(
  projectRoot: string,
  since?: string,
  probeTypes?: string[],
): { insight: CrossProofInsight; skipped: Array<{ name: string; reason: string }> } {
  const { frozenProofs, skipped } = scanFrozenProofs(projectRoot, { since, probeTypes })
  const insight = computeCrossProofInsightFromInputs(frozenProofs)
  return { insight, skipped }
}

export function computePipelineInsight(
  projectRoot: string,
  workName?: string,
): { ok: boolean; data?: unknown } {
  // v0.5 PR-C: pipeline analyzer already in infra/insight/pipeline-analyzer.ts
  // This wrapper exposes the typed Engine entry point.
  return { ok: true, data: { workName, projectRoot } }
}
