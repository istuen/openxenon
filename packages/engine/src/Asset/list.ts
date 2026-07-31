/**
 * Asset module — list use case (v0.6 PR-5a)
 * v0.6.2 I-6 fix: 接受可选 config 参数；缺省时 lazy 加载 .openxenon/config.json，
 * 让 .oxnrc / config.json 里的 assetRoot / assetDirs 真正生效。
 */
import { readdirSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { resolveAssetDir, ALL_ASSET_KINDS, type ProjectConfig } from '@openxenon/engine/infra/paths'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'
import type { ListInput, ListResult, AssetFormat } from './types'

export function list(input: ListInput, config?: ProjectConfig | null): ListResult {
  const cfg = config ?? loadProjectConfig(input.projectRoot)
  const dir = resolveAssetDir(input.projectRoot, input.kind, cfg)
  if (!existsSync(dir)) {
    return { assets: [] }
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
  const assets = files.map((f) => {
    return {
      kind: input.kind,
      name: f.replace(/\.md$/, ''),
      path: `${dir}/${f}`,
      format: 'md' as AssetFormat,
    }
  })
  return { assets }
}

export function listAll(projectRoot: string, config?: ProjectConfig | null): ListResult {
  const all: ListResult['assets'] = []
  for (const kind of ALL_ASSET_KINDS) {
    const r = list({ kind, projectRoot }, config)
    all.push(...r.assets)
  }
  return { assets: all }
}
