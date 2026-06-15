// =============================================================================
// probe-stats-store.ts (v0.1.2)
//
// L1-Infra 纯 IO：读写 .openxenon/.cache/probe-stats.json。
//
// 纯洁性约束：
//   - 本模块只做文件 IO，不调 L0-Processor 任何函数（避免 §4.1 违规）
//   - 不导入 FrozenProof 类型，不做 merge；合并逻辑在 L0 的 probe-stats-updater.ts
//   - 路径由 L3-CLI 传入（避免从 kernel/constants 导入造成 L1→L0-Processor 违规）
//
// 写盘策略：原子写（.tmp → rename），与 .cache/domains.json 模式一致。
// =============================================================================

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from '../filesystem'
import { dirname } from 'path'
import { safeValidateProbeStats, type ProbeStats } from '../../kernel/index'

/**
 * 读 probe-stats.json。
 *
 * - 文件不存在 → 返回 null（首次 run 的正常情况，调用方用 emptyProbeStats 兜底）
 * - 文件存在但 JSON parse 失败 / schema 校验失败 → 返回 null（调用方兜底）
 * - 校验通过 → 返回 ProbeStats
 */
export function readProbeStatsFromFile(statsPath: string): ProbeStats | null {
  if (!existsSync(statsPath)) return null
  let raw: string
  try {
    raw = readFileSync(statsPath, 'utf-8')
  } catch {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const v = safeValidateProbeStats(parsed)
  return v.success ? v.data : null
}

/**
 * 写 probe-stats.json（原子写）。
 *
 * - 自动 mkdir -p 父目录
 * - 写 .tmp 后 rename，避免 partial write 损坏
 * - 不做 chmod（与 domains.json 一致，可重建数据）
 */
export function writeProbeStatsToFile(statsPath: string, stats: ProbeStats): void {
  const dir = dirname(statsPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpPath = `${statsPath}.tmp`
  writeFileSync(tmpPath, JSON.stringify(stats, null, 2), 'utf-8')
  renameSync(tmpPath, statsPath)
}
