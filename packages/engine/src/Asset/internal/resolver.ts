/**
 * Asset module — internal path resolver (v0.6 PR-5a + v0.6.1 PR-3)
 *
 * 复用 PR-1 的 resolveAssetDir/resolveAndDetectAssetDir 并封装为 Asset 专用 helper。
 * v0.7.0: .oxn removed, .md is the only format.
 * v0.6.2 I-6 fix: 接受可选 config 参数；缺省时 lazy 加载 .openxenon/config.json。
 */
import { join } from 'path'
import {
  resolveAssetDir,
  resolveAssetCandidates,
  resolveAssetFileCandidatesV61,
  type AssetKind,
  type ProjectConfig,
} from '@openxenon/engine/infra/paths'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'
import { existsSync } from '@openxenon/engine/infra/filesystem'

/**
 * 解析 asset 文件的完整路径（主路径优先，fallback 为后备）.
 *
 * v0.7.0: Only .md format supported.
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
  config?: ProjectConfig | null,
): { primary: string; fallback: string } {
  const cfg = config ?? loadProjectConfig(projectRoot)
  const { primary, fallback } = resolveAssetCandidates(projectRoot, kind, cfg)
  return {
    primary: join(primary, `${name}.${ext}`),
    fallback: join(fallback, `${name}.${ext}`),
  }
}

/**
 * 检测 asset 文件的主路径与 fallback 冲突.
 */
export function detectAssetConflict(
  projectRoot: string,
  kind: AssetKind,
  name: string,
  ext: string = 'md',
  config?: ProjectConfig | null,
): boolean {
  const { primary, fallback } = resolveAssetFileCandidates(projectRoot, kind, name, ext, config)
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
  config?: ProjectConfig | null,
): string {
  const cfg = config ?? loadProjectConfig(projectRoot)
  const candidates = resolveAssetFileCandidatesV61(projectRoot, kind, name, cfg)
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[0]!
}
