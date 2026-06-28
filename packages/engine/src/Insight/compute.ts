/**
 * Insight module — compute/visualize utility (v0.6 PR-5d续)
 */

export function formatVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case 'PASSED': return '✅'
    case 'FAILED': return '❌'
    case 'INCONCLUSIVE': return '⚠️'
    default: return '❓'
  }
}

export function renderInsightHuman(
  proofName: string,
  verdict: string,
  evidenceChain: Array<{ probe: string; fact: string; conclusion: string }>,
  emergentPatterns: Array<{ type: string; probeType: string; occurrences: number }>,
): string {
  const lines: string[] = []
  const emoji = formatVerdictEmoji(verdict)
  lines.push(`=== Insight: ${proofName} ${emoji} ${verdict} ===`)
  for (const e of evidenceChain) {
    const icon = e.conclusion.startsWith('满足验收') ? '✅' : '❌'
    lines.push(`  ${icon} ${e.probe}: ${e.fact} → ${e.conclusion}`)
  }
  if (emergentPatterns.length > 0) {
    lines.push('Emergent Patterns:')
    for (const p of emergentPatterns) {
      lines.push(`  • [${p.type}] ${p.probeType} (×${p.occurrences})`)
    }
  }
  return lines.join('\n')
}
