/**
 * Asset module — delete use case (v0.6.1-alpha.1 Asset Lifecycle 闭环)
 *
 * 硬删除 Asset（不归档，不可恢复，除非 git history）：
 * 1. 校验无引用（拒绝被引用资产删除）
 * 2. 校验 force flag（无 force → IAPError YIELD_TO_HUMAN）
 * 3. 物理删除 .md + .metadata.json
 * 4. 写一条警告日志到 .openxenon/.archived/_delete-log.jsonl
 *
 * 限制：
 * - 不可逆（删除后只能从 git history 恢复）
 * - 拒绝被引用资产（无 --force-keep-refs 选项）
 * - 拒绝归档中的资产（要先 unarchive）
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { existsSync, unlinkSync, mkdirSync, appendFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { resolveAssetFile } from './internal/resolver'
import { isAssetReferenced } from './internal/reference-checker'
import type { AssetKind } from '@openxenon/engine/infra/paths'
import type { DeleteInput, DeleteResult } from './types'

export async function deleteAsset(input: DeleteInput): Promise<DeleteResult> {
  const { kind, name, force, projectRoot } = input

  // 1. 解析源路径（主路径 + fallback）
  const sourceOxnPath = resolveAssetFile(projectRoot, kind, name, 'oxn')
  const sourceMdPath = resolveAssetFile(projectRoot, kind, name, 'md')

  // 2. 幂等检查：不存在 → 返回 idempotent
  if (!existsSync(sourceOxnPath) && !existsSync(sourceMdPath)) {
    return {
      ok: true,
      idempotent: true,
      deletedPath: sourceOxnPath,
      message: `Asset '${name}' (${kind}) does not exist (already deleted?)`,
    }
  }

  // 3. 校验 force flag
  if (!force) {
    throw new IAPError(
      'INFRA',
      'FORCE_REQUIRED',
      IAPAction.YIELD_TO_HUMAN,
      `Deleting Asset '${name}' (${kind}) requires --force flag. Use archive instead if you want reversibility.`,
      { kind, name, suggestion: 'Use --force to confirm, or archive instead' },
    )
  }

  // 4. 校验无引用
  const refCheck = isAssetReferenced(projectRoot, kind as AssetKind, name)
  if (refCheck.referenced) {
    throw new IAPError(
      'INTENT',
      'ASSET_HAS_REFS',
      IAPAction.YIELD_TO_HUMAN,
      `Asset '${name}' (${kind}) is referenced by ${refCheck.referencedBy.length} other asset(s): ${refCheck.referencedBy.map((r) => `${r.kind}::${r.name}`).join(', ')}. Update or remove references before deleting.`,
      { kind, name, referencedBy: refCheck.referencedBy },
    )
  }

  // 5. 物理删除
  if (existsSync(sourceOxnPath)) {
    unlinkSync(sourceOxnPath)
  }
  if (existsSync(sourceMdPath)) {
    unlinkSync(sourceMdPath)
  }

  // 6. 写删除日志（保留审计 trail）
  const logDir = join(projectRoot, '.openxenon', '.archived')
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  const logEntry = {
    action: 'delete',
    kind,
    name,
    deletedAt: new Date().toISOString(),
    deletedPath: sourceOxnPath,
    force,
  }
  const logPath = join(logDir, '_delete-log.jsonl')
  appendFileSync(logPath, `${JSON.stringify(logEntry)}\n`, 'utf-8')

  return {
    ok: true,
    idempotent: false,
    deletedPath: sourceOxnPath,
    logPath,
    message: `Asset '${name}' (${kind}) deleted (audit log at ${logPath})`,
  }
}
