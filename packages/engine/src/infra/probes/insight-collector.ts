// =============================================================================
// insight-collector.ts (v0.1.2)
//
// L1-Infra 纯 IO：读 frozen.json + probe-stats.json，提供给 L0 计算函数。
//
// 纯洁性约束：
//   - 本模块只做文件 IO + schema 校验，不调 L0-Processor 任何计算函数
//   - 路径由 L3-CLI 传入（避免 L1→L0-Processor 违规：kernel/constants 在 L0-Processor 层）
//   - 校验失败返回 { error } 而不是抛错（调用方决定降级策略）
// =============================================================================

import { join } from 'path'
import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import {
  safeValidateProbeStats,
  type ProbeStats,
  safeValidateFrozenProof,
  type FrozenProof,
} from '@openxenon/engine/kernel/index'

/**
 * 读 frozen.json（带签名校验） + probe-stats.json，返回 Insight 计算所需的两份数据。
 *
 * - frozen.json 路径：projectRoot + .openxenon/proofs/<proofName>/frozen.json（项目内固定约定）
 * - stats 路径：由 L3 传入（path-to-probe-stats.json）
 *
 * 返回：
 *   - { frozen, stats } — 两份数据均通过校验
 *   - { error } — 文件缺失 / JSON parse 失败 / schema 校验失败
 */
export function readInsightInputs(
  projectRoot: string,
  proofName: string,
  statsPath: string,
): { frozen: FrozenProof; stats: ProbeStats } | { error: string } {
  const frozenPath = join(projectRoot, '.openxenon', 'proofs', proofName, 'frozen.json')

  // 1. 读 frozen.json（验签由 safeValidateFrozenProof 内部完成 — 实际上 schema 校验不走 SHA-256，
  //    仅校验 schema 合法性；签名校验由 readFrozenProof 走。这里用直接 JSON 读 + schema 校验，
  //    与 insight 输入要求一致：frozen 已经被签名了，Insight 是事后视图，签名校验交给 proof show）。
  if (!existsSync(frozenPath)) {
    return { error: `frozen.json not found: ${frozenPath}. Run \`oxn proof run ${proofName}\` first.` }
  }

  let frozenRaw: unknown
  try {
    frozenRaw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
  } catch (e) {
    return { error: `frozen.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}` }
  }

  const vFrozen = safeValidateFrozenProof(frozenRaw)
  if (!vFrozen.success) {
    return {
      error: `frozen.json schema invalid: ${vFrozen.error.issues.map((i) => i.message).join('; ')}`,
    }
  }

  // 2. 读 probe-stats.json
  if (!existsSync(statsPath)) {
    return {
      error: `probe-stats.json not found: ${statsPath}. Run at least one \`oxn proof run\` first.`,
    }
  }

  let statsRaw: unknown
  try {
    statsRaw = JSON.parse(readFileSync(statsPath, 'utf-8'))
  } catch (e) {
    return {
      error: `probe-stats.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  const vStats = safeValidateProbeStats(statsRaw)
  if (!vStats.success) {
    return {
      error: `probe-stats.json schema invalid: ${vStats.error.issues.map((i) => i.message).join('; ')}`,
    }
  }

  return { frozen: vFrozen.data, stats: vStats.data }
}
