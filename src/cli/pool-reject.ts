// =============================================================================
// pool-reject.ts (v0.5 PR-D)
//
// 拒绝 audit pool 建议 → 写回 frozen.json（追加 rejection 记录）
// 不修改 Intent 资产。
// =============================================================================

import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { defineCommand } from 'citty'
import { output, outputUserInputError } from './output'
import { type ImprovementSuggestion, type RejectionRecord, safeValidateImprovementSuggestion } from '../kernel/index'
import { ensureWritable } from '../infra/insight/intent-overwriter'

const AUDIT_POOL = 'audit'

function findAuditEntry(projectRoot: string, slug: string): string | null {
  const poolsDir = join(projectRoot, '.openxenon', 'pools')
  const candidates = [join(poolsDir, AUDIT_POOL, slug, 'frozen.json'), join(poolsDir, slug, 'frozen.json')]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

function readFrozenBody(frozenPath: string): ImprovementSuggestion {
  const raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
  const v = safeValidateImprovementSuggestion(raw)
  if (!v.success) {
    throw new Error(`frozen.json schema invalid: ${v.error.issues.map((i) => i.message).join('; ')}`)
  }
  return v.data
}

function writeRejectionRecord(frozenPath: string, record: RejectionRecord): void {
  const raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
  if (raw.metadata) {
    raw.metadata.rejection = record
  }
  ensureWritable(frozenPath)
  writeFileSync(frozenPath, JSON.stringify(raw, null, 2), 'utf-8')
}

export default defineCommand({
  meta: { name: 'reject', description: 'Reject an audit pool entry (no Intent changes)' },
  args: {
    slug: { type: 'positional', required: true, description: 'Audit pool entry slug' },
    reason: { type: 'string', required: true, description: 'Rejection reason' },
    operator: { type: 'string', description: 'Operator identity (default: operator)' },
    '--json': { type: 'boolean', description: 'JSON output' },
  },
  run({ args }) {
    const slug = args.slug as string
    const reason = args.reason as string
    const operator = (args.operator as string) ?? 'operator'
    const format = args.json === true ? 'json' : 'human'
    const projectRoot = process.cwd()

    const frozenPath = findAuditEntry(projectRoot, slug)
    if (!frozenPath) {
      return outputUserInputError('OXN_POOL_ENTRY_NOT_FOUND', `Audit pool entry not found: ${slug}`, {
        suggestion: 'Run `oxn pool review <slug>` to verify the entry exists.',
        format,
      })
    }
    // Validate schema (best-effort — metadata may be missing/invalid for legacy entries)
    try {
      readFrozenBody(frozenPath)
    } catch {
      /* allow reject even if metadata schema is invalid */
    }

    const record: RejectionRecord = {
      rejectedAt: new Date().toISOString(),
      rejectedBy: operator,
      reason,
    }
    writeRejectionRecord(frozenPath, record)

    output({
      ok: true,
      data: { slug, rejectionRecord: record },
      human: `=== Reject: ${slug} ===\nReason: ${reason}\nRejected by: ${operator}\nAt: ${record.rejectedAt}`,
      format,
    })
  },
})
