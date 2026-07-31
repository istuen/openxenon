/**
 * Asset module — migrate use case (v0.6.2-alpha.0)
 *
 * schema 版本升级：
 * - 读 frontmatter.version（旧版）
 * - 写 frontmatter.version = 新版
 * - 重新写 .md 文件（保留其他内容不变）
 * - 写 audit log 到 .openxenon/.archived/_migrate-log.jsonl
 *
 * v0.6.2 限制：
 * - 不执行 kind compiler 的 migration map（compiler.migrations 字段尚未实现）
 * - 仅修改 frontmatter.version，其他字段不动
 * - 用户后续需手动跑 `oxn asset validate` 确认兼容性
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { resolveAssetFile } from './internal/resolver'
import type { MigrateInput, MigrateResult } from './types'
import type { ProjectConfig } from '@openxenon/engine/infra/paths'

const MIGRATE_LOG_FILE = '_migrate-log.jsonl'

/**
 * 简单 semver 比较（major.minor.patch）
 */
function compareSemver(a: string, b: string): number {
  const parseVersion = (v: string): [number, number, number] => {
    const parts = v.split('.').map((p) => Number.parseInt(p, 10))
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
  }
  const [a1, a2, a3] = parseVersion(a)
  const [b1, b2, b3] = parseVersion(b)
  if (a1 !== b1) return a1 - b1
  if (a2 !== b2) return a2 - b2
  return a3 - b3
}

export async function migrate(input: MigrateInput, config?: ProjectConfig | null): Promise<MigrateResult> {
  const { kind, name, targetVersion, projectRoot } = input
  const cfg = config ?? null

  const filePath = resolveAssetFile(projectRoot, kind, name, 'md', cfg)

  if (!existsSync(filePath)) {
    throw new IAPError('INFRA', 'PATH_CONFLICT', IAPAction.YIELD_TO_HUMAN, `Asset not found: ${filePath}`, {
      kind,
      name,
      path: filePath,
    })
  }

  const content = readFileSync(filePath, 'utf-8')

  // 解析 frontmatter（提取 version）
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    throw new IAPError('INFRA', 'PATH_CONFLICT', IAPAction.YIELD_TO_HUMAN, `Asset has no frontmatter: ${filePath}`, {
      kind,
      name,
      path: filePath,
    })
  }

  const fmContent = fmMatch[1] ?? ''
  const versionMatch = fmContent.match(/^version:\s*([^\n]+)/m)
  const oldVersion = versionMatch?.[1]?.trim() ?? '0.0.0'

  if (oldVersion === targetVersion) {
    return {
      ok: true,
      idempotent: true,
      oldVersion,
      newVersion: targetVersion,
      message: `Asset '${name}' (${kind}) already at version ${targetVersion}`,
      path: filePath,
    }
  }

  if (compareSemver(targetVersion, oldVersion) < 0) {
    throw new IAPError(
      'INTENT',
      'INCOMPLETE_ASSET_PAPER',
      IAPAction.YIELD_TO_HUMAN,
      `Target version ${targetVersion} is older than current ${oldVersion}. Migrate only supports upgrades.`,
      { kind, name, oldVersion, targetVersion },
    )
  }

  // 替换 frontmatter 中的 version 行
  const newFmContent = fmContent.replace(/^version:\s*([^\n]+)/m, `version: ${targetVersion}`)
  const newContent = content.replace(fmContent, newFmContent)

  writeFileSync(filePath, newContent, 'utf-8')

  // 写 audit log
  const logPath = join(projectRoot, '.openxenon', '.archived', MIGRATE_LOG_FILE)
  mkdirSync(join(projectRoot, '.openxenon', '.archived'), { recursive: true })
  const logEntry = {
    kind,
    name,
    oldVersion,
    newVersion: targetVersion,
    timestamp: new Date().toISOString(),
  }
  appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf-8')

  return {
    ok: true,
    idempotent: false,
    oldVersion,
    newVersion: targetVersion,
    message: `Asset '${name}' (${kind}) migrated: ${oldVersion} → ${targetVersion}`,
    path: filePath,
  }
}
