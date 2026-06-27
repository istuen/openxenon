// =============================================================================
// pool-create.ts (v0.2 T13 + v0.5 PR-D)
//
// 扩展：--from insight 选项
//   - 读 stdin 的 JSON（CrossProofInsight 或 PipelineInsight）
//   - 用 suggestion-generator 提取结构化建议
//   - 写入 audit pool entry（含 patch metadata）
// =============================================================================

import { join } from 'node:path'
import { mkdirSync, readFileSync } from '../infra/filesystem'
import { defineCommand } from 'citty'
import { output } from './output'
import { writePoolEntry } from '../infra/frozen/pool-writer'
import type { IntentPool } from '../infra/frozen/pool-writer'
import { generateSuggestionFromInsight } from '../infra/insight/suggestion-generator'

const VALID_POOLS: IntentPool[] = ['research', 'design', 'issue', 'audit', 'journal']

export default defineCommand({
  meta: { name: 'pool-create', description: 'Create a new Intent Pool entry' },
  args: {
    pool: { type: 'string', required: true, description: 'Pool type: research/design/issue/audit/journal' },
    slug: { type: 'string', description: 'Unique kebab-case slug (auto-generated if --from insight)' },
    title: { type: 'string', description: 'Entry title (auto-generated if --from insight)' },
    content: { type: 'string', description: 'Markdown content (or empty for template)' },
    'from-insight': { type: 'string', description: 'Path to insight JSON file (v0.5 PR-D)' },
    'target-domain': {
      type: 'string',
      description: 'Target domain name (required with --from-insight)',
    },
    'insight-kind': {
      type: 'string',
      description: 'Insight type: pipeline | cross-proof (default: pipeline)',
    },
  },
  async run({ args }) {
    const pool = args.pool as string
    const projectRoot = process.cwd()

    if (!VALID_POOLS.includes(pool as IntentPool)) {
      throw new Error(`Invalid pool "${pool}". Must be one of: ${VALID_POOLS.join(', ')}`)
    }

    // ─── --from insight 分支（v0.5 PR-D） ───
    if (args['from-insight']) {
      const insightPath = args['from-insight'] as string
      const targetDomain = args['target-domain'] as string | undefined
      if (!targetDomain) {
        throw new Error('--target-domain is required with --from-insight')
      }
      const insightKind = ((args['insight-kind'] as string) ?? 'pipeline') as 'pipeline' | 'cross-proof'

      const insightJson = readFileSync(insightPath, 'utf-8')
      const draft = generateSuggestionFromInsight(insightJson, targetDomain, insightKind)
      if (!draft) {
        throw new Error(`No actionable suggestion found in insight for domain "${targetDomain}" (kind=${insightKind})`)
      }

      const poolDir = join(projectRoot, '.openxenon', 'pools', pool)
      mkdirSync(join(poolDir, draft.slug), { recursive: true })

      const result = await writePoolEntry(projectRoot, {
        pool: pool as IntentPool,
        slug: draft.slug,
        title: draft.title,
        content: draft.content,
        metadata: draft.meta as unknown as Record<string, unknown>,
      })
      output({ ok: true, fromInsight: true, ...result })
      return
    }

    // ─── 标准分支（v0.2 T13） ───
    const slug = args.slug as string
    const title = args.title as string
    const content = (args.content as string) ?? ''

    if (!slug) throw new Error('--slug is required (or use --from-insight)')
    if (!title) throw new Error('--title is required (or use --from-insight)')

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
