// =============================================================================
// cross-proof-scanner.ts (v0.5 PR-B)
//
// L1-Infra 纯 IO：扫描 proofs/*/frozen.json → FrozenProof[] 给 L0 计算函数。
//
// 纯洁性约束：
//   - 本模块只做文件 IO + schema 校验，不调 L0-Processor 任何计算函数
//   - 路径由 L3-CLI 传入（避免 L1→L0-Processor 违规：kernel/constants 在 L0-Processor 层）
//   - 校验失败返回 { error } 而不是抛错（调用方决定降级策略）
//
// v0.5 PR-B 设计：
//   - 主动扫描 proofs/ 子目录而非依赖 probe-stats.json 聚合
//   - 原因：probe-stats 是累积视图，丢失 per-proof 细节（如 verdict 序列、时间戳）
//   - 跨 proof 计算需要原始数据；scanFrozenProofs 直接拿 FrozenProof 列表
// =============================================================================

import { join } from 'path'
import { existsSync, readdirSync, readFileSync, statSync } from '../filesystem'
import { BOUNDARY_DIR, PROOFS_DIR, safeValidateFrozenProof, type FrozenProof } from '../../kernel/index'

export interface ScanFrozenProofsResult {
  ok: boolean
  frozen: FrozenProof[]
  /** 扫描过程中被跳过的 proof（.running.json 残留 / 解析失败）及其原因 */
  skipped: Array<{ name: string; reason: string }>
  reason?: string
}

/**
 * 扫描 .openxenon/proofs/ 下全部 frozen.json，解析并 schema 校验。
 *   - 时间升序排列（按 runAt）
 *   - 跳过 .running.json 残留的 proof（in-progress，不计入）
 *   - 跳过 frozen.json 解析失败 / schema 校验失败的 proof（记入 skipped）
 *
 * 入参 filter 与 L0 compute 的 CrossProofFilter 字段一致：since / proofIds / probeTypes。
 * 注：probeTypes 在本层不做过滤（语义解析在 L0 完成），仅传递。
 */
export function scanFrozenProofs(
  projectRoot: string,
  filter: { since?: string; proofIds?: string[] } = {},
): ScanFrozenProofsResult {
  const proofsDir = join(projectRoot, BOUNDARY_DIR, PROOFS_DIR)
  if (!existsSync(proofsDir)) {
    return { ok: false, frozen: [], skipped: [], reason: `proofs dir not found: ${proofsDir}` }
  }

  const out: FrozenProof[] = []
  const skipped: ScanFrozenProofsResult['skipped'] = []

  let entries: string[]
  try {
    entries = readdirSync(proofsDir)
  } catch (e) {
    return {
      ok: false,
      frozen: [],
      skipped: [],
      reason: `failed to read proofs dir: ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  for (const entry of entries) {
    const proofDir = join(proofsDir, entry)
    let st
    try {
      st = statSync(proofDir)
    } catch {
      continue
    }
    if (!st.isDirectory()) continue

    // 过滤 proofIds
    if (filter.proofIds && filter.proofIds.length > 0 && !filter.proofIds.includes(entry)) {
      continue
    }

    const runningPath = join(proofDir, '.running.json')
    const frozenPath = join(proofDir, 'frozen.json')

    // 跳过 in-progress（frozen.json 尚未写出或被 .running.json 覆盖标记）
    if (existsSync(runningPath)) {
      skipped.push({ name: entry, reason: 'in-progress (.running.json exists)' })
      continue
    }
    if (!existsSync(frozenPath)) {
      skipped.push({ name: entry, reason: 'frozen.json missing' })
      continue
    }

    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    } catch (e) {
      skipped.push({ name: entry, reason: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}` })
      continue
    }

    const v = safeValidateFrozenProof(raw)
    if (!v.success) {
      skipped.push({ name: entry, reason: `schema invalid: ${v.error.issues.map((i) => i.message).join('; ')}` })
      continue
    }

    // 过滤 since
    if (filter.since && v.data.runAt < filter.since) continue

    out.push(v.data)
  }

  // 按 runAt 升序
  out.sort((a, b) => a.runAt.localeCompare(b.runAt))

  return { ok: true, frozen: out, skipped }
}
