/**
 * Asset module — unarchive use case (v0.6.2-alpha.0)
 *
 * 撤销归档（archive 的反向操作）：
 * 1. 校验 .md 在 .openxenon/.archived/assets/<kind>s/ 下存在
 * 2. 校验目标 active 路径不存在（避免覆盖）
 * 3. mv .md 回 active 目录（按 config 解析）
 * 4. 删除 .metadata.json
 * 5. 写 audit log 到 .openxenon/.archived/_unarchive-log.jsonl
 *
 * 限制：
 * - 不检查反向引用（撤销后该 Asset 重新可见，可能被引用方继续引用——这是用户期望）
 * - 幂等：已 unarchive 资产 → 返回 idempotent:true
 * - 不触发 citations 重新计算（旧引用方状态保持）
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { existsSync, renameSync, mkdirSync, appendFileSync, unlinkSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { resolveArchivedAssetFile, resolveArchivedMetadataFile } from './internal/archived-resolver'
import { resolveAssetFile } from './internal/resolver'
import type { UnarchiveInput, UnarchiveResult } from './types'
import type { ProjectConfig } from '@openxenon/engine/infra/paths'
import type { AssetKind } from '@openxenon/engine/infra/paths'

const UNARCHIVE_LOG_FILE = '_unarchive-log.jsonl'

export async function unarchive(input: UnarchiveInput, config?: ProjectConfig | null): Promise<UnarchiveResult> {
  const { kind, name, projectRoot } = input
  const cfg = config ?? null

  // 1. 解析源路径（归档目录）
  const sourceMdPath = resolveArchivedAssetFile(projectRoot, kind, name, 'md')
  const sourceMetaPath = resolveArchivedMetadataFile(projectRoot, kind, name)

  // 2. 幂等检查：archived 不存在 → 返回 idempotent
  if (!existsSync(sourceMdPath)) {
    return {
      ok: true,
      idempotent: true,
      message: `Asset '${name}' (${kind}) is not archived (nothing to unarchive)`,
      restoredPath: '',
    }
  }

  // 3. 解析目标路径（active 目录，按 config）
  const targetMdPath = resolveAssetFile(projectRoot, kind, name, 'md', cfg)

  // 4. 冲突检查：active 已存在同名资产 → 报错
  if (existsSync(targetMdPath)) {
    throw new IAPError(
      'INFRA',
      'PATH_CONFLICT',
      IAPAction.YIELD_TO_HUMAN,
      `Cannot unarchive: active asset already exists at ${targetMdPath}. Delete or archive the active one first.`,
      { kind, name, archivedPath: sourceMdPath, activePath: targetMdPath },
    )
  }

  // 5. 确保 active 目录存在
  const targetDir = join(targetMdPath, '..')
  mkdirSync(targetDir, { recursive: true })

  // 6. mv archived .md → active
  renameSync(sourceMdPath, targetMdPath)

  // 7. 删除 .metadata.json
  if (existsSync(sourceMetaPath)) {
    unlinkSync(sourceMetaPath)
  }

  // 8. 写 audit log
  const logPath = join(projectRoot, '.openxenon', '.archived', UNARCHIVE_LOG_FILE)
  mkdirSync(join(projectRoot, '.openxenon', '.archived'), { recursive: true })
  const logEntry = {
    kind,
    name,
    archivedPath: sourceMdPath,
    restoredPath: targetMdPath,
    timestamp: new Date().toISOString(),
  }
  appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf-8')

  return {
    ok: true,
    idempotent: false,
    message: `Asset '${name}' (${kind}) restored to ${targetMdPath}`,
    restoredPath: targetMdPath,
  }
}

/** Re-export AssetKind type for convenience */
export type { AssetKind }
