// =============================================================================
// pool-list.ts (v0.2 T13)
// =============================================================================
import { join } from 'node:path'
import { readdirSync } from '../infra/filesystem'
import { defineCommand } from 'citty'
import { output } from './output'
import type { IntentPool } from '../infra/frozen/pool-writer'

const POOLS: IntentPool[] = ['research', 'design', 'issue', 'audit', 'journal']

export default defineCommand({
  meta: { name: 'pool-list', description: 'List all pools and their entries' },
  args: { pool: { type: 'string', description: 'Filter to specific pool' } },
  async run({ args }) {
    const root = join(process.cwd(), '.openxenon', 'pools')
    const limit = args.pool as string | undefined
    const result: Array<{ pool: string; entries: string[]; count: number }> = []

    for (const pool of POOLS) {
      if (limit && pool !== limit) continue
      const poolDir = join(root, pool)
      let entries: string[] = []
      try {
        entries = readdirSync(poolDir).filter((f) => f.endsWith('.md'))
      } catch {
        entries = []
      }
      result.push({ pool, entries, count: entries.length })
    }
    output({ ok: true, pools: result })
  },
})
