/**
 * Asset module — list use case (v0.6 PR-5a)
 */
import { readdirSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { resolveAssetDir, ALL_ASSET_KINDS } from '@openxenon/engine/infra/paths'
import type { ListInput, ListResult, AssetFormat } from './types'

export function list(input: ListInput): ListResult {
  const dir = resolveAssetDir(input.projectRoot, input.kind, null)
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

export function listAll(projectRoot: string): ListResult {
  const all: ListResult['assets'] = []
  for (const kind of ALL_ASSET_KINDS) {
    const r = list({ kind, projectRoot })
    all.push(...r.assets)
  }
  return { assets: all }
}
