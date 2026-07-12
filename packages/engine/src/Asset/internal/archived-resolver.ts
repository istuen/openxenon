/**
 * Asset/internal/archived-resolver.ts — v0.6.1-alpha.1 Asset Lifecycle
 *
 * 解析 .openxenon/.archived/<kind>/<name>.md 路径
 *
 * 归档目录约定：
 * - 根：<projectRoot>/.openxenon/.archived/
 * - 按 kind 分目录：.archived/domains/ / .archived/blueprints/ / ...
 * - 每归档资产有 2 个文件：
 *   - <name>.md  (canonical 归档资产)
 *   - .metadata.json (归档原因 + 时间 + 引用方信息)
 *
 * L0–L3 兼容性：
 * - L1-Infra 层（src/engine/Asset/internal/）
 * - 不 import L0-Processor / L2-Work / L3
 */

import { join } from 'node:path'

/** 归档根目录名 */
export const ARCHIVED_DIR = '.archived'

/** 归档 metadata 文件名 */
export const ARCHIVED_METADATA_FILE = '.metadata.json'

/** 归档 metadata 文件名（用于路径拼接，不带前导点） */
const METADATA_BASENAME = 'metadata.json'

/**
 * 解析归档 Asset 的物理路径
 *
 * @param projectRoot OXN 项目根目录
 * @param kind Asset kind: domain / blueprint / stack / roadmap / library / external
 * @param name Asset name
 * @param ext 文件扩展名：'md'
 * @returns .openxenon/.archived/<kind>/<name>.<ext> 完整路径
 */
export function resolveArchivedAssetFile(projectRoot: string, kind: string, name: string, ext: 'md' = 'md'): string {
  return join(projectRoot, '.openxenon', ARCHIVED_DIR, `${kind}s`, `${name}.${ext}`)
}

/**
 * 解析归档目录路径（用于 mkdir -p 或 readdirSync）
 *
 * 用法：getArchivedAssetDir(root, 'domain') → '.openxenon/.archived/domains/'
 *
 * @returns .openxenon/.archived/<kind>s/ 目录路径
 */
export function getArchivedAssetDir(projectRoot: string, kind: string): string {
  return join(projectRoot, '.openxenon', ARCHIVED_DIR, `${kind}s`)
}

/**
 * 解析归档 metadata.json 路径
 *
 * 与 .md 同级（不带子目录，flat 结构）
 *
 * @returns .openxenon/.archived/<kind>s/<name>.metadata.json 完整路径
 */
export function resolveArchivedMetadataFile(projectRoot: string, kind: string, name: string): string {
  return join(projectRoot, '.openxenon', ARCHIVED_DIR, `${kind}s`, `${name}.${METADATA_BASENAME}`)
}

/**
 * 检查归档目录是否存在
 */
export function archivedAssetDirExists(projectRoot: string, kind: string): boolean {
  const { existsSync } = require('node:fs')
  return existsSync(getArchivedAssetDir(projectRoot, kind))
}
