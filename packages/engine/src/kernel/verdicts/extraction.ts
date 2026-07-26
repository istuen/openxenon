// =============================================================================
// Probe output 提取工具 (v1.1 fix-p3-refactor extract-target-dry)
//
// DRY: probe-stats-updater.ts:29 + insight-compute.ts:32 之前是复制粘贴.
// 现在统一定义在这里, 两个 caller 改 import.
// =============================================================================

import type { FrozenProofProbeResult } from '../schemas/proof-schema'

/**
 * 从 frozen probe 的 output.outcome.params 抽出 target (path / command / url / pattern)。
 * 这是「probe 命中了什么东西」的最重要标识, 用于:
 *   - probe-stats-updater: 累计同一 target 的 failure count
 *   - insight-compute: 反馈给用户的「失败 N 次的 target」列表
 */
export function extractTarget(probe: FrozenProofProbeResult): string | undefined {
  const output = probe.output as { outcome?: { params?: Record<string, unknown> } } | undefined
  const params = output?.outcome?.params
  if (!params) return undefined
  if (typeof params.pattern === 'string') return params.pattern
  if (typeof params.command === 'string') return params.command
  if (typeof params.path === 'string') return params.path
  if (typeof params.url === 'string') return params.url
  return undefined
}
