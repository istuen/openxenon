/**
 * Asset module — internal path resolver (v0.6 PR-5a)
 *
 * 复用 PR-1 的 resolveAssetDir/resolveAndDetectAssetDir 并封装为 Asset 专用 helper。
 */
import { join } from 'path'
import {
  resolveAssetDir,
  resolveAssetCandidates,
  type AssetKind,
} from '@openxenon/engine/infra/paths'
import { existsSync } from '@openxenon/engine/infra/filesystem'

/**
 * 解析 asset 文件的完整路径（主路径优先，fallback 为后备）.
 */
export function resolveAssetFile(
  projectRoot: string,
  kind: AssetKind,
  name: string,
  ext: string = 'oxn',
): string {
  const dir = resolveAssetDir(projectRoot, kind, null)
  return join(dir, `${name}.${ext}`)
}

/**
 * 解析 asset 文件的候选路径（主 + fallback）。
 */
export function resolveAssetFileCandidates(
  projectRoot: string,
  kind: AssetKind,
  name: string,
  ext: string = 'oxn',
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
export function detectAssetConflict(
  projectRoot: string,
  kind: AssetKind,
  name: string,
  ext: string = 'oxn',
): boolean {
  const { primary, fallback } = resolveAssetFileCandidates(projectRoot, kind, name, ext)
  return existsSync(primary) && existsSync(fallback)
}
