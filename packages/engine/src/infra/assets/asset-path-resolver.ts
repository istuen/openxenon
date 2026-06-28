/**
 * v0.6 PR-1: Asset Path Resolver
 *
 * 解析 Domain / Blueprint / Stack 资产的实际路径。
 *
 * 策略（按优先级）：
 *   1. 主路径：`config.assetDirs[kind]`（用户自定义）或 `assets/<kind>/`（v0.6 默认）
 *   2. fallback：`.openxenon/<kind>/`（v0.5 旧布局，向后兼容）
 *
 * 探测行为：
 *   - 主路径存在 → 用主路径
 *   - 主路径不存在但 fallback 存在 → 用 fallback（CLI 提示迁移 WARN）
 *   - 都不存在 → 返回主路径（让 create 命令新建）
 *   - 两个都存在 → 抛 IAP_ASSET_PATH_CONFLICT（需要 `oxn config migrate-assets`）
 */

import { existsSync as exists } from '../filesystem'
import { join } from 'path'
import {
  BOUNDARY_DIR,
  DEFAULT_ASSET_ROOT,
  DEFAULT_ASSET_DIRS,
  type AssetKind,
  type ProjectConfig,
  resolveAssetDir,
  resolveAssetCandidates,
  type AssetFormat,
} from '../paths'
import { IAPError, IAPAction } from '../../errors'

// Re-export for downstream consumers
export { resolveAssetDir, resolveAssetCandidates, DEFAULT_ASSET_ROOT, DEFAULT_ASSET_DIRS }
export type { AssetKind, ProjectConfig, AssetFormat }

export interface ResolvedAssetPath {
  /** 实际使用的路径 */
  path: string
  /** 是否走了 fallback（v0.5 旧布局） */
  fromFallback: boolean
  /** 同时存在（需要 migrate-assets 清理） */
  conflict: boolean
}

/**
 * v0.6 PR-1: 探测并解析 asset 实际目录路径。
 *
 * 注意：kind 为 'domain' / 'blueprint' / 'stack'。
 * work / proof 不参与 assetDir 配置（它们是流程而非资产）。
 */
export function resolveAndDetectAssetDir(
  projectRoot: string,
  kind: Exclude<AssetKind, never>, // 限定为 AssetKind（不含 work/proof）
  config: ProjectConfig | null = null,
): ResolvedAssetPath {
  if (kind !== 'domain' && kind !== 'blueprint' && kind !== 'stack') {
    throw new IAPError(
      'INFRA',
      'KIND_UNSUPPORTED',
      IAPAction.YIELD_TO_HUMAN,
      'Only domain / blueprint / stack are asset-dir configurable. Work / proof are process.',
      { kind },
    )
  }

  const boundary = join(projectRoot, BOUNDARY_DIR)
  const primary = resolveAssetDir(projectRoot, kind, config)
  // fallback 旧布局：.openxenon/<kind>/（v0.5 兼容）
  const fallback = join(boundary, kind)

  const primaryExists = exists(primary)
  const fallbackExists = exists(fallback)

  if (primaryExists && fallbackExists) {
    return { path: primary, fromFallback: false, conflict: true }
  }
  if (primaryExists) {
    return { path: primary, fromFallback: false, conflict: false }
  }
  if (fallbackExists) {
    return { path: fallback, fromFallback: true, conflict: false }
  }
  return { path: primary, fromFallback: false, conflict: false }
}

/**
 * v0.6 PR-1: 抛冲突错误（当主路径与 fallback 同时存在时）。
 */
export function throwIfAssetConflict(resolved: ResolvedAssetPath, kind: AssetKind): void {
  if (resolved.conflict) {
    throw new IAPError(
      'INFRA',
      'PATH_CONFLICT',
      IAPAction.YIELD_TO_HUMAN,
      `Both v0.6 config path and v0.5 legacy path exist for ${kind}. Run \`oxn config migrate-assets\` to consolidate.`,
      { kind, path: resolved.path },
    )
  }
}

/**
 * v0.6 PR-1: 一键迁移 — 探测旧 fallback 路径 → 移动到新主路径 → 删除 fallback → 写 config。
 *
 * 行为：
 *   - 读 project config（如有）
 *   - 探测三种 asset kind（domain / blueprint / stack）的 fallback
 *   - 若 fallback 存在但主路径不存在 → 移动文件到主路径
 *   - 若 fallback 与主路径都存在 → 跳过（需人工 merge）
 *   - 写 config.assetRoot + assetDirs 默认值
 */
export interface MigrateResult {
  moved: Array<{ kind: AssetKind; from: string; to: string; fileCount: number }>
  skipped: Array<{ kind: AssetKind; reason: string }>
  configUpdated: boolean
}

/** mkdirp + copy/move 的简化版（Infra filesystem 已封装，这里直连） */
import { renameSync, readdirSync, mkdirSync } from '../filesystem'

export function migrateAssetsToV6Layout(
  projectRoot: string,
  config: ProjectConfig | null,
  dryRun = false,
): MigrateResult {
  const result: MigrateResult = { moved: [], skipped: [], configUpdated: false }
  const kinds: Exclude<AssetKind, never>[] = ['domain', 'blueprint', 'stack']

  for (const kind of kinds) {
    const resolved = resolveAndDetectAssetDir(projectRoot, kind, config)
    if (resolved.fromFallback) {
      // 主路径不存在，fallback 有文件 → 移动
      const primary = resolveAssetDir(projectRoot, kind, config)
      if (dryRun) {
        result.moved.push({ kind, from: resolved.path, to: primary, fileCount: -1 })
        continue
      }
      // ensure parent dir
      mkdirSync(primary, { recursive: true })
      // move files one by one (avoid cross-device rename)
      let count = 0
      const files = readdirSync(resolved.path)
      for (const f of files) {
        try {
          renameSync(join(resolved.path, f), join(primary, f))
          count++
        } catch {
          // ignore individual file failures (lock etc.)
        }
      }
      result.moved.push({ kind, from: resolved.path, to: primary, fileCount: count })
    } else if (resolved.conflict) {
      result.skipped.push({ kind, reason: 'both paths exist — manual merge required' })
    } else {
      result.skipped.push({ kind, reason: 'no migration needed' })
    }
  }

  // 写 config defaults
  if (!config) {
    result.configUpdated = false
  } else {
    let changed = false
    if (!config.assetRoot) {
      config.assetRoot = DEFAULT_ASSET_ROOT
      changed = true
    }
    if (!config.assetDirs) {
      config.assetDirs = { ...DEFAULT_ASSET_DIRS }
      changed = true
    } else {
      for (const kind of kinds) {
        if (!config.assetDirs[kind as 'domain' | 'blueprint' | 'stack']) {
          config.assetDirs[kind as 'domain' | 'blueprint' | 'stack'] =
            DEFAULT_ASSET_DIRS[kind as 'domain' | 'blueprint' | 'stack']
          changed = true
        }
      }
    }
    result.configUpdated = changed
  }

  return result
}
