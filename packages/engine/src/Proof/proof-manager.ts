/**
 * packages/engine/src/Proof/proof-manager.ts (v0.6 清理后)
 *
 * 仅保留 CLI 实际使用的 2 个 human 渲染函数:
 *   - renderProbeDescribeHuman
 *   - renderVerdictHuman
 *
 * v0.6 移除: createProof / runProof (CLI 未使用, 由 src/cli/proof.ts 直接走 executeProbe + writeFrozenProof)
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

export function renderVerdictHuman(
  name: string,
  frozen: NonNullable<ReturnType<typeof readFrozenProof>['frozen']>,
  projectRoot: string,
  outcomePath: string | null = null,
  verdictWritten: boolean = false,
): string {
  const lines: string[] = []
  lines.push(`Proof "${name}" outcome: ${frozen.outcome} (${frozen.passedCount}/${frozen.totalCount})`)
  for (const p of frozen.probes) {
    const icon = p.passed ? '✅' : '❌'
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.durationMs}ms`)
  }
  lines.push(`\nProof saved: ${join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON)}`)
  lines.push(`Read-only: ${isFrozenFileReadOnly(join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON))}`)
  if (verdictWritten && outcomePath) {
    lines.push(`Verdict doc: ${outcomePath}`)
  }
  return lines.join('\n')
}
