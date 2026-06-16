// =============================================================================
// pool-create.ts (v0.2 T13)
// =============================================================================
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { defineCommand } from 'citty'
import { output } from './output'
import { writePoolEntry } from '../infra/frozen/pool-writer'
import type { IntentPool } from '../infra/frozen/pool-writer'

const VALID_POOLS: IntentPool[] = ['research', 'design', 'issue', 'audit', 'journal']

export default defineCommand({
  meta: { name: 'pool-create', description: 'Create a new Intent Pool entry' },
  args: {
    pool: { type: 'string', required: true, description: 'Pool type: research/design/issue/audit/journal' },
    slug: { type: 'string', required: true, description: 'Unique kebab-case slug' },
    title: { type: 'string', required: true, description: 'Entry title' },
    content: { type: 'string', description: 'Markdown content (or empty for template)' },
  },
  async run({ args }) {
    const pool = args.pool as string
    const slug = args.slug as string
    const title = args.title as string
    const content = (args.content as string) ?? ''

    if (!VALID_POOLS.includes(pool as IntentPool)) {
      throw new Error(`Invalid pool "${pool}". Must be one of: ${VALID_POOLS.join(', ')}`)
    }

    const projectRoot = process.cwd()
    const poolDir = join(projectRoot, '.openxenon', 'pools', pool)
    mkdirSync(join(poolDir, slug), { recursive: true })

    const result = await writePoolEntry(projectRoot, {
      pool: pool as IntentPool,
      slug,
      title,
      content: content || '## Why\n\n## How\n\n',
    })

    output({ ok: true, ...result })
  },
})
