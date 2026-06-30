// =============================================================================
// pool-approve.ts (v0.5 PR-D)
//
// 审批通过 audit pool 建议 → 原子覆盖目标 Intent 资产
//
// 流程：
//   1. 读 audit pool frozen.json → 验证内容
//   2. 解析 metadata（target + kind + patch）
//   3. 调用 intent-overwriter 原子覆盖
//   4. 更新 frozen.json（追加 approvalRecord）
//   5. 输出审批结果
//
// 安全设计：
//   - dry-run 模式：只算 hash 不写盘
//   - 失败时 frozen.json 不更新（可重试）
// =============================================================================

import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { defineCommand } from 'citty'
import { output, outputUserInputError } from './output'
import {
  IAPError,
  IAPAction,
  type ApprovalRecord,
  type ImprovementSuggestion,
  safeValidateImprovementSuggestion,
} from '@openxenon/engine/kernel'
import {
  overwriteIntent,
  resolveTargetPath,
  ensureWritable,
  type OverwriteResult,
} from '@openxenon/engine/infra/insight/intent-overwriter'

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
    throw new IAPError(
      'INFRA',
      'INFRA_FAIL',
      IAPAction.YIELD_TO_HUMAN,
      `audit pool frozen.json schema invalid: ${v.error.issues.map((i) => i.message).join('; ')}`,
      { component: 'pool-approve', frozenPath },
    )
  }
  return v.data
}

/** 写回 frozen.json（追加 approvalRecord 到 metadata） */
function writeApprovalRecord(frozenPath: string, record: ApprovalRecord): void {
  const raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
  // 不修改 schema，仅在 metadata 内追加 approval 字段
  if (raw.metadata) {
    raw.metadata.approval = record
  }
  ensureWritable(frozenPath)
  writeFileSync(frozenPath, JSON.stringify(raw, null, 2), 'utf-8')
}

export default defineCommand({
  meta: { name: 'approve', description: 'Approve an audit pool entry and apply changes' },
  args: {
    slug: { type: 'positional', required: true, description: 'Audit pool entry slug' },
    'dry-run': { type: 'boolean', description: 'Preview only, do not write' },
    operator: { type: 'string', description: 'Operator identity (default: operator)' },
    '--json': { type: 'boolean', description: 'JSON output' },
  },
  run({ args }) {
    const slug = args.slug as string
    const dryRun = args['dry-run'] === true
    const operator = (args.operator as string) ?? 'operator'
    const format = args.json === true ? 'json' : 'human'
    const projectRoot = process.cwd()

    // 1. 定位 + 读 frozen.json
    const frozenPath = findAuditEntry(projectRoot, slug)
    if (!frozenPath) {
      return outputUserInputError('OXN_POOL_ENTRY_NOT_FOUND', `Audit pool entry not found: ${slug}`, {
        suggestion: 'Run `oxn pool review <slug>` to verify the entry exists.',
        format,
      })
    }
    const frozen = readFrozenBody(frozenPath)

    // 2. 解析目标路径
    const targetPath = resolveTargetPath(projectRoot, frozen.metadata.targetPath)
    if (!existsSync(targetPath)) {
      return outputUserInputError('OXN_INTENT_TARGET_MISSING', `Target file not found: ${targetPath}`, {
        suggestion:
          'The target Intent file may have been deleted or moved. Update the audit entry or recreate the target file.',
        format,
      })
    }

    // 3. 调 overwriter 原子覆盖
    let result: OverwriteResult
    try {
      result = overwriteIntent({
        targetPath,
        meta: frozen.metadata,
        operator,
        dryRun,
      })
    } catch (e) {
      if (e instanceof IAPError) throw e
      throw new IAPError(
        'INFRA',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `Failed to apply patch: ${e instanceof Error ? e.message : String(e)}`,
        { component: 'pool-approve', slug, targetPath },
      )
    }

    // 4. 写回 frozen.json（追加 approval 记录）
    if (!dryRun) {
      try {
        writeApprovalRecord(frozenPath, result.approvalRecord)
      } catch (e) {
        throw new IAPError(
          'INFRA',
          'INFRA_FAIL',
          IAPAction.YIELD_TO_HUMAN,
          `Patch applied but failed to update frozen.json: ${e instanceof Error ? e.message : String(e)}`,
          { component: 'pool-approve', slug },
        )
      }
    }

    // 5. 输出
    const human = [
      `=== Approve: ${slug} ${dryRun ? '(DRY RUN)' : ''} ===`,
      `Target: ${frozen.metadata.targetPath}`,
      `Kind: ${frozen.metadata.kind}`,
      `Before SHA-256: ${result.beforeHash}`,
      `After SHA-256: ${result.afterHash}`,
      `Approved by: ${result.approvalRecord.approvedBy}`,
      `Approved at: ${result.approvalRecord.approvedAt}`,
      `Mode: ${dryRun ? 'dry-run (no file written)' : 'committed'}`,
    ].join('\n')

    output({
      ok: true,
      data: {
        slug,
        targetPath,
        dryRun,
        beforeHash: result.beforeHash,
        afterHash: result.afterHash,
        approvalRecord: result.approvalRecord,
      },
      human,
      format,
    })
  },
})
