// =============================================================================
// pool-review.ts (v0.5 PR-D)
//
// 读取 audit pool 条目 + 渲染为人类可读视图
// 注：仅读操作，不修改任何状态
// =============================================================================

import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { defineCommand } from 'citty'
import { output, outputUserInputError } from './output'
import { safeValidateImprovementSuggestion, type ImprovementSuggestion } from '../kernel/index'

const AUDIT_POOL = 'audit'

function findAuditEntry(
  projectRoot: string,
  slug: string,
): {
  mdPath: string
  frozenPath: string
  body: string
} | null {
  const poolsDir = join(projectRoot, '.openxenon', 'pools')
  const mdPath = join(poolsDir, `${slug}.md`)
  const frozenPath = join(poolsDir, slug, 'frozen.json')

  // 也尝试在 audit 子目录找
  const auditMdPath = join(poolsDir, AUDIT_POOL, `${slug}.md`)
  const auditFrozenPath = join(poolsDir, AUDIT_POOL, slug, 'frozen.json')

  if (existsSync(auditMdPath)) {
    return {
      mdPath: auditMdPath,
      frozenPath: auditFrozenPath,
      body: readFileSync(auditMdPath, 'utf-8'),
    }
  }
  if (existsSync(mdPath)) {
    return {
      mdPath,
      frozenPath,
      body: readFileSync(mdPath, 'utf-8'),
    }
  }
  return null
}

function renderReviewHuman(slug: string, body: string, frozen: ImprovementSuggestion | null): string {
  const lines: string[] = []
  lines.push(`=== Audit Pool Review: ${slug} ===`)
  lines.push('')

  if (frozen) {
    const m = frozen.metadata
    lines.push(`Target: ${m.target}:${m.targetName}  (${m.targetPath})`)
    lines.push(`Kind: ${m.kind}`)
    if (m.source) lines.push(`Source: ${m.source}`)
    lines.push(`Created: ${frozen.frozenAt}`)
    lines.push('')
    lines.push('--- Body ---')
    lines.push(body)
    lines.push('--- End Body ---')
    lines.push('')
    lines.push('--- Patch (will be applied on approve) ---')
    lines.push(m.patch)
    lines.push('--- End Patch ---')
  } else {
    lines.push('(frozen.json not found or invalid schema)')
    lines.push('')
    lines.push(body)
  }

  return lines.join('\n')
}

export default defineCommand({
  meta: { name: 'review', description: 'Read and display an audit pool entry' },
  args: {
    slug: { type: 'positional', required: true, description: 'Audit pool entry slug' },
    '--json': { type: 'boolean', description: 'JSON output' },
  },
  run({ args }) {
    const format = args.json === true ? 'json' : 'human'
    const slug = args.slug as string
    const projectRoot = process.cwd()

    const entry = findAuditEntry(projectRoot, slug)
    if (!entry) {
      return outputUserInputError('OXN_POOL_ENTRY_NOT_FOUND', `Audit pool entry not found: ${slug}`, {
        suggestion: 'Run `oxn pool list` to see existing entries.',
        format,
      })
    }

    let frozen: ImprovementSuggestion | null = null
    if (existsSync(entry.frozenPath)) {
      try {
        const raw = JSON.parse(readFileSync(entry.frozenPath, 'utf-8'))
        const v = safeValidateImprovementSuggestion(raw)
        if (v.success) frozen = v.data
      } catch {
        /* ignore */
      }
    }

    if (format === 'json') {
      output({
        ok: true,
        data: {
          slug,
          body: entry.body,
          frozen,
        },
        human: renderReviewHuman(slug, entry.body, frozen),
      })
    } else {
      console.log(renderReviewHuman(slug, entry.body, frozen))
    }
  },
})
