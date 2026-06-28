/**
 * Insight module — audit-write use case (v0.6 PR-5d实现)
 *
 * Writes asset suggestions to audit pool via infra/frozen/pool-writer.
 */
import { writePoolEntry } from '@openxenon/engine/infra/frozen/pool-writer'
import type { AuditSuggestion } from './types'

export async function writeAuditSuggestion(
  projectRoot: string,
  suggestion: AuditSuggestion,
  title: string,
): Promise<{ slug: string; ok: boolean }> {
  const slug = `${suggestion.type}-${suggestion.targetName}-${Date.now()}`
  const content = `# ${title}\n\n## What\n${suggestion.suggestedContent}\n\n## Why\n${suggestion.reason}`
  const result = await writePoolEntry(projectRoot, {
    pool: 'audit',
    slug,
    title,
    content,
    metadata: { suggestion },
  })
  return { slug, ok: result.ok }
}
