/**
 * Asset module — evolve use case (v0.6.1-alpha.1 Asset Lifecycle 闭环)
 *
 * 演进 Asset（创建新版本，旧版不变）：
 * 1. 读旧 .md
 * 2. 复制内容到 newName（如果 newName 不存在）
 * 3. 旧版 auditTrail 加新项：`evolved to <newName> at <time>`
 * 4. 新版 auditTrail 加新项：`evolved from <oldName> at <time>`
 * 5. citations 自增（旧版被引用 +1；新版从 0 开始）
 *
 * 限制：
 * - 不修改旧版内容（除 auditTrail 项追加）
 * - 不触发 references 自动重写（需调用方手动改）
 * - 引用方资产**不**自动改 reference（新版本独立存在）
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { existsSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { resolveAssetFile } from './internal/resolver'
import type { EvolveInput, EvolveResult } from './types'
import type { ProjectConfig } from '@openxenon/engine/infra/paths'

export async function evolve(input: EvolveInput, config?: ProjectConfig | null): Promise<EvolveResult> {
  const { kind, name, newName, projectRoot } = input

  if (!newName || newName === name) {
    throw new IAPError(
      'INFRA',
      'PATH_CONFLICT',
      IAPAction.YIELD_TO_HUMAN,
      `Evolve requires newName different from current name. Got: '${newName}' (current: '${name}')`,
      { kind, name, newName },
    )
  }

  // 1. 解析路径
  const oldOxnPath = resolveAssetFile(projectRoot, kind, name, 'oxn', config)
  const newOxnPath = resolveAssetFile(projectRoot, kind, newName, 'oxn', config)

  if (!existsSync(oldOxnPath)) {
    throw new IAPError(
      'INFRA',
      'PATH_CONFLICT',
      IAPAction.YIELD_TO_HUMAN,
      `Cannot evolve: source Asset '${name}' (${kind}) not found at ${oldOxnPath}`,
      { kind, name, path: oldOxnPath },
    )
  }

  if (existsSync(newOxnPath)) {
    throw new IAPError(
      'INFRA',
      'PATH_CONFLICT',
      IAPAction.YIELD_TO_HUMAN,
      `Cannot evolve: target Asset '${newName}' (${kind}) already exists at ${newOxnPath}`,
      { kind, name: newName, path: newOxnPath },
    )
  }

  // 2. 读旧 .md
  const oldContent = readFileSync(oldOxnPath, 'utf-8')
  const now = new Date().toISOString()

  // 3. 写新版（复制旧内容 + auditTrail 项）
  const newAuditTrailEntry = `// auditTrail: evolved from ${name} at ${now}`
  const newContent = appendAuditTrail(oldContent, newAuditTrailEntry)
  writeFileSync(newOxnPath, newContent, 'utf-8')

  // 4. 写旧版 auditTrail（追加项）
  const oldAuditTrailEntry = `// auditTrail: evolved to ${newName} at ${now}`
  const oldContentUpdated = appendAuditTrail(oldContent, oldAuditTrailEntry)
  writeFileSync(oldOxnPath, oldContentUpdated, 'utf-8')

  // 5. 同样处理 .md 镜像（如果有）
  const oldMdPath = resolveAssetFile(projectRoot, kind, name, 'md', config)
  const newMdPath = resolveAssetFile(projectRoot, kind, newName, 'md', config)
  if (existsSync(oldMdPath)) {
    const oldMdContent = readFileSync(oldMdPath, 'utf-8')
    const newMdContent = appendAuditTrail(oldMdContent, `<!-- auditTrail: evolved from ${name} at ${now} -->`)
    writeFileSync(newMdPath, newMdContent, 'utf-8')

    const oldMdContentUpdated = appendAuditTrail(oldMdContent, `<!-- auditTrail: evolved to ${newName} at ${now} -->`)
    writeFileSync(oldMdPath, oldMdContentUpdated, 'utf-8')
  }

  return {
    ok: true,
    oldName: name,
    newName,
    oldPath: oldOxnPath,
    newPath: newOxnPath,
    evolvedAt: now,
    message: `Asset '${name}' evolved to '${newName}'. Update references manually.`,
  }
}

/**
 * 在 .md 内容末尾追加 auditTrail 项（带注释前缀避免 parser 干扰）
 */
function appendAuditTrail(content: string, entry: string): string {
  // 如果已有 auditTrail 段（comment 形式），追加
  if (content.includes('// auditTrail:')) {
    return `${content.trimEnd()}\n${entry}\n`
  }
  // 否则在文件开头注释段后追加
  return `${content.trimEnd()}\n\n${entry}\n`
}
