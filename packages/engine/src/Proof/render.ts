/**
 * Proof module — human rendering utilities (v0.6 阶段2: 渲染分离)
 *
 * Pure rendering functions. Take data → return string. No side effects.
 * Moved from src/cli/proof.ts for reuse by CLI / Daemon / Web UI.
 */
import type { FrozenProof } from '@openxenon/engine/kernel'
import { join } from 'path'
import { PROOF_FROZEN_JSON } from '@openxenon/engine/kernel'
import { isFrozenFileReadOnly } from '@openxenon/engine/Proof/proof-frozen-writer'

export interface RenderVerdictParams {
  name: string
  frozen: FrozenProof
  verdictPath?: string | null
  verdictWritten?: boolean
}

export function renderVerdictHuman(params: RenderVerdictParams): string {
  const { name, frozen, verdictPath = null, verdictWritten = false } = params
  const lines: string[] = []
  lines.push(`Proof "${name}" verdict: ${frozen.verdict} (${frozen.passedCount}/${frozen.totalCount})`)
  for (const p of frozen.probes) {
    const icon = p.passed ? '✅' : '❌'
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.durationMs}ms`)
  }
  // proofDir used below — resolve via frozen context
  lines.push(`\nRead-only: ${frozen._xenon_meta.content_hash ? 'true' : 'false'}`)
  if (verdictWritten && verdictPath) {
    lines.push(`Verdict doc: ${verdictPath}`)
  }
  return lines.join('\n')
}

export interface RenderShowParams {
  frozen: FrozenProof
  inProgress?: boolean
  verdictPath?: string | null
}

export function renderShowHuman(params: RenderShowParams): string {
  const { frozen, inProgress = false, verdictPath = null } = params
  const lines: string[] = []
  if (inProgress) {
    lines.push(`⚠️ Warning: .running.json residue found — last run may have crashed`)
    lines.push('')
  }
  if (verdictPath) {
    lines.push(`📄 Human-readable verdict: ${verdictPath}`)
    lines.push('')
  }
  const ttyColor = process.stdout.isTTY === true
  const verdictIcon = frozen.verdict === 'PASSED' ? '✅' : frozen.verdict === 'INCONCLUSIVE' ? '⚠️ ' : '❌'
  let verdictText = `${frozen.verdict} (${frozen.passedCount}/${frozen.totalCount}`
  if (frozen.verdict === 'INCONCLUSIVE') {
    verdictText += `, INCONCLUSIVE probes`
  }
  verdictText += ')'
  if (ttyColor) {
    const colorCode = frozen.verdict === 'PASSED' ? '\u001b[32m' : frozen.verdict === 'INCONCLUSIVE' ? '\u001b[33m' : '\u001b[31m'
    verdictText = `${colorCode}${verdictText}\u001b[0m`
  }
  lines.push(`Proof: ${frozen.name}`)
  lines.push(`Verdict: ${verdictIcon} ${verdictText}`)
  lines.push(`Run at: ${frozen.runAt}`)
  lines.push(`Signature: ${frozen._xenon_meta.content_hash}`)
  lines.push('')
  lines.push('Probes:')
  for (const p of frozen.probes) {
    const icon = p.verdict === 'PASSED' ? '✅' : p.verdict === 'INCONCLUSIVE' ? '⚠️ ' : '❌'
    const err = p.errorMessage ? ` — ${p.errorMessage}` : ''
    const flags = p.interferenceFlags && p.interferenceFlags.length > 0 ? ` [flags: ${p.interferenceFlags.join(', ')}]` : ''
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.verdict}, ${p.durationMs}ms${err}${flags}`)
  }
  return lines.join('\n')
}
