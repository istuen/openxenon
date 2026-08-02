/**
 * Asset module — internal path resolver (v0.6 PR-5a + v0.6.1 PR-3)
 *
 * 复用 PR-1 的 resolveAssetDir/resolveAndDetectAssetDir 并封装为 Asset 专用 helper。
 * v0.7.0: .oxn removed, .md is the only format.
 */
import { join } from 'path'
import {
  resolveAssetDir,
  resolveAssetCandidates,
  resolveAssetFileCandidatesV61,
  type AssetKind,
  type ProjectConfig,
} from '@openxenon/engine/infra/paths'
import { existsSync } from '@openxenon/engine/infra/filesystem'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'

/**
 * 解析 asset 文件的完整路径（主路径优先，fallback 为后备）.
 *
 * v0.7.0: Only .md format supported.
 * v0.6.2 I-6 fix: 读 .openxenon/config.json 的 assetRoot 配置。
 * v0.6.2-alpha.0 P0b fix: 接受 caller 传入的 config（避免重复 load + 避免 caller 缓存 config 与函数实际 load 的不一致）。
 */
export function resolveAssetFile(
  projectRoot: string,
  kind: AssetKind,
  name: string,
  ext: string = 'md',
  config?: ProjectConfig | null,
): string {
  const cfg = config ?? loadProjectConfig(projectRoot)
  const dir = resolveAssetDir(projectRoot, kind, cfg)
  return join(dir, `${name}.${ext}`)
}

/**
 * 解析 asset 文件的候选路径（主 + fallback）。
 */
export function resolveAssetFileCandidates(
  projectRoot: string,
  kind: AssetKind,
  name: string,
  ext: string = 'md',
): { primary: string; fallback: string } {
  const { primary, fallback } = resolveAssetCandidates(projectRoot, kind, null)
  return {
    primary: join(primary, `${name}.${ext}`),
    fallback: join(fallback, `${name}.${ext}`),
  }
}

/**
 * 检测 asset 文件的主路径与 fallback 冲突.
 */
export function detectAssetConflict(projectRoot: string, kind: AssetKind, name: string, ext: string = 'md'): boolean {
  const { primary, fallback } = resolveAssetFileCandidates(projectRoot, kind, name, ext)
  return existsSync(primary) && existsSync(fallback)
}

/**
 * v0.6.1 PR-3: 4 级候选 .md 优先解析（用于读路径）。
 *
 * 返回第一个存在的文件路径。如果都没找到，返回 primary .md（让 create 命令新建）。
 */
export function resolveAssetFileFirst(
  projectRoot: string,
  kind: AssetKind, // 🆕 v0.6.1-alpha.2: library/external 已删除，AssetKind 收敛为 5 类型
  name: string,
): string {
  const candidates = resolveAssetFileCandidatesV61(projectRoot, kind, name, null)
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[0]!
}
