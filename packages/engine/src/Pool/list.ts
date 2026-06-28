/**
 * Pool module — list-pool-entries use case (v0.6 阶段5)
 */
import { readdirSync, existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import type { ListPoolEntriesInput, ListPoolEntriesResult, PoolEntrySummary, PoolKind } from './types'

export function listPoolEntries(input: ListPoolEntriesInput): ListPoolEntriesResult {
  const poolsDir = join(input.projectRoot, BOUNDARY_DIR, 'pools')
  const entries: PoolEntrySummary[] = []
  const kinds: PoolKind[] = input.pool ? [input.pool] : ['research', 'design', 'issue', 'audit', 'journal']

  for (const kind of kinds) {
    const dir = join(poolsDir, kind)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const slug = f.replace('.md', '')
      const content = readFileSync(join(dir, f), 'utf-8')
      const titleMatch = content.match(/^#\s+(.+)/m)
      entries.push({
        slug,
        pool: kind,
        title: titleMatch?.[1] ?? slug,
        status: 'pending',
        suggestedAt: '',
      })
    }
  }
  return { entries }
}

export function reviewPoolEntry(slug: string, projectRoot: string): string | null {
  const poolsDir = join(projectRoot, BOUNDARY_DIR, 'pools')
  for (const kind of ['audit', 'research', 'design', 'issue', 'journal'] as PoolKind[]) {
    const path = join(poolsDir, kind, `${slug}.md`)
    if (existsSync(path)) return readFileSync(path, 'utf-8')
  }
  return null
}

export function approvePoolEntry(_slug: string, _projectRoot: string, _dryRun = false): { ok: boolean } {
  // v0.6: approve gate via intent-overwriter.ts (v0.5 PR-D). Placeholder for now.
  return { ok: false }
}

export function rejectPoolEntry(_slug: string, _reason: string, _projectRoot: string): { ok: boolean } {
  return { ok: false }
}
