/**
 * Proof module — probe utilities (v0.6 PR-5c续)
 */

export function nextProbeName(content: string): string {
  const matches = content.match(/probe "p(\d+)"/g) ?? []
  let max = 0
  for (const m of matches) {
    const n = Number(m.match(/p(\d+)/)?.[1] ?? '0')
    if (n > max) max = n
  }
  return `p${max + 1}`
}

export function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
