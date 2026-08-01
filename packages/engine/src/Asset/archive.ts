/**
 * Asset module — archive use case (v0.6.1-alpha.4 Asset Lifecycle 闭环)
 *
 * 归档 Asset：
 * 1. 读 Asset .md
 * 2. 校验无引用（孤儿才允许归档，被引用 → IAPError YIELD_TO_HUMAN）
 * 3. mv .md → .openxenon/.archived/assets/<kind>s/X.md
 * 4. 写 metadata.json 记录归档原因 + 时间 + 引用方（应为空）
 * 5. planLock 仍可查（只读 — 归档资产不允许 run，但 planLock 卡片保留供审计）
 *
 * 限制：
 * - 不触发 citations 重新计算（旧版 citations 保持，引用方仍可见历史引用）
 * - 不修改任何引用方资产
 * - 归档操作可幂等（已归档资产返回 idempotent:true，不报错）
 *
 * L0–L3 兼容性：
 * - L1-Infra 层（src/engine/Asset/）
 * - 不 import L0-Processor / L2-Work / L3
 */

import { existsSync, renameSync, mkdirSync, writeFileSync, unlinkSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { resolveAssetFile } from './internal/resolver'
import { resolveArchivedAssetFile, resolveArchivedMetadataFile } from './internal/archived-resolver'
import { listAssetReferences } from './internal/reference-checker'
import type { ArchiveInput, ArchiveResult } from './types'

export async function archive(input: ArchiveInput): Promise<ArchiveResult> {
  const { kind, name, reason, projectRoot } = input

  // 1. 解析源路径（主路径 + fallback）
  const sourceMdPath = resolveAssetFile(projectRoot, kind, name, 'md')

  // 2. 解析归档目标路径
  const targetMdPath = resolveArchivedAssetFile(projectRoot, kind, name, 'md')
  const targetMetaPath = resolveArchivedMetadataFile(projectRoot, kind, name)

  // 3. 幂等检查：已归档 → 返回 idempotent
  if (existsSync(targetMdPath)) {
    return {
      ok: true,
      idempotent: true,
      archivedPath: targetMdPath,
      message: `Asset '${name}' (${kind}) is already archived at ${targetMdPath}`,
    }
  }

  // 4. 检查源文件存在
  if (!existsSync(sourceMdPath)) {
    throw new IAPError('INFRA', 'PATH_CONFLICT', IAPAction.YIELD_TO_HUMAN, `Asset '${name}' (${kind}) not found`, {
      kind,
      name,
      expectedPath: sourceMdPath,
    })
  }

  // 5. 校验无引用（孤儿才允许归档）
  const references = listAssetReferences(projectRoot)
  const inRefs = references.find((r) => r.kind === kind && r.name === name)
  if (inRefs && inRefs.referencedBy.length > 0) {
    throw new IAPError(
      'INTENT',
      'ASSET_HAS_REFS',
      IAPAction.YIELD_TO_HUMAN,
      `Asset '${name}' (${kind}) is referenced by ${inRefs.referencedBy.length} other asset(s): ${inRefs.referencedBy.map((r) => `${r.kind}::${r.name}`).join(', ')}. Update or remove references before archiving.`,
      { kind, name, referencedBy: inRefs.referencedBy },
    )
  }

  // 6. 移动文件
  const targetDir = join(targetMdPath, '..')
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }
  if (existsSync(sourceMdPath)) {
    renameSync(sourceMdPath, targetMdPath)
  }

  // 7. 写 metadata.json
  const metadata = {
    kind,
    name,
    reason,
    archivedAt: new Date().toISOString(),
    archivedPath: targetMdPath,
    originalPath: sourceMdPath,
    referencesAtArchive: 0, // 由 step 5 校验保证
    planLockReadOnly: true,
  }
  writeFileSync(targetMetaPath, JSON.stringify(metadata, null, 2), 'utf-8')

  return {
    ok: true,
    idempotent: false,
    archivedPath: targetMdPath,
    metadataPath: targetMetaPath,
    message: `Asset '${name}' (${kind}) archived to ${targetMdPath}`,
  }
}

// 重新导出 unlinkSync 供其他模块使用
export { unlinkSync }
