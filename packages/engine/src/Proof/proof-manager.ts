/**
 * packages/engine/src/Proof/proof-manager.ts (v0.6 清理后; RFC-0015 D1.1 重命名)
 *
 * 仅保留 CLI 实际使用的 2 个 human 渲染函数:
 *   - renderProbeDescribeHuman
 *   - renderOutcomeHuman (RFC-0015 D1.1 由 renderVerdictHuman 重命名)
 *
 * v0.6 移除: createProof / runProof (CLI 未使用, 由 src/cli/proof.ts 直接走 executeProbe + writeFrozenProof)
 *
 * 旧名 renderVerdictHuman / verdictWritten 以 @deprecated alias 保留 1 个大版本（v0.8.x），
 * v0.9.0 物理删除。(RFC-0015 D1.1)
 */

import { join } from 'path'
import { BOUNDARY_DIR, PROOFS_DIR, PROOF_FROZEN_JSON } from '@openxenon/engine/kernel'
import type { describeProbe } from '@openxenon/engine/kernel'
import { isFrozenFileReadOnly, type readFrozenProof } from './proof-frozen-writer'

function getProofDir(projectRoot: string, name: string): string {
  return join(projectRoot, BOUNDARY_DIR, PROOFS_DIR, name)
}

export function renderProbeDescribeHuman(info: ReturnType<typeof describeProbe> & object): string {
  const lines: string[] = []
  lines.push(`# ${info.name}`)
  lines.push(info.description)
  lines.push('')
  lines.push('Inputs:')
  for (const inp of info.inputs) {
    const req = inp.required ? '(required)' : '(optional)'
    lines.push(`  - ${inp.name}: ${inp.type} ${req} — ${inp.description}`)
  }
  if (info.examples.length > 0) {
    lines.push('')
    lines.push('Examples:')
    for (const ex of info.examples) {
      const inputs = JSON.stringify(ex.inputs)
      lines.push(`  - ${ex.name}:`)
      lines.push(`      oxn proof probe add <proof> ${info.name} --input-json '${inputs}'`)
    }
  }
  return lines.join('\n')
}

/**
 * 渲染 proof run 的 outcome 结果（人类可读）。
 *   - outcome: COMPLETED / DEVIATED / INCONCLUSIVE
 *   - outcomeWritten: outcome.md 是否已成功写盘（false 时降级为仅 frozen 信息）
 *   - outcomePath: outcome.md 绝对路径（用来 hop user 到编辑器）
 *
 * (RFC-0015 D1.1 由 renderVerdictHuman 重命名为 renderOutcomeHuman；旧名作为 @deprecated alias 保留)
 */
export function renderOutcomeHuman(
  name: string,
  frozen: NonNullable<ReturnType<typeof readFrozenProof>['frozen']>,
  projectRoot: string,
  outcomePath: string | null = null,
  outcomeWritten: boolean = false,
): string {
  const lines: string[] = []
  lines.push(`Proof "${name}" outcome: ${frozen.outcome} (${frozen.passedCount}/${frozen.totalCount})`)
  for (const p of frozen.probes) {
    const icon = p.passed ? '✅' : '❌'
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.durationMs}ms`)
  }
  lines.push(`\nProof saved: ${join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON)}`)
  lines.push(`Read-only: ${isFrozenFileReadOnly(join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON))}`)
  if (outcomeWritten && outcomePath) {
    lines.push(`Outcome doc: ${outcomePath}`)
  }
  return lines.join('\n')
}

/* ─── Deprecated aliases (RFC-0015 D1.1; 保留至 v0.9.0 删除) ─── */
export const renderVerdictHuman = renderOutcomeHuman
