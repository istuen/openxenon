/**
 * Asset module — list use case (v0.6 PR-5a)
 *
 * v0.6.2 I-4: 支持 scope 模式
 *   - 'prj'（默认）：仅项目内
 *   - 'oxn'：仅 builtin（@oxn scope）
 *   - 'effective'：项目 + builtin-only（项目同名覆盖 builtin）
 */
import { readdirSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { resolveAssetDir, ALL_ASSET_KINDS } from '@openxenon/engine/infra/paths'
import type { ListInput, ListResult, AssetFormat, AssetScope } from './types'
import type { AssetKind } from '@openxenon/engine/infra/paths'
import { getBuiltinRegistry } from '@openxenon/engine/oxl/scope/oxn-builtin-registry'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'

export function list(input: ListInput): ListResult {
  const scope = input.scope ?? 'prj'
  const config = loadProjectConfig(input.projectRoot)

  // 1. 项目内资产
  const projectAssets: ListResult['assets'] = []
  if (scope === 'prj' || scope === 'effective') {
    const dir = resolveAssetDir(input.projectRoot, input.kind, config)
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
      for (const f of files) {
        projectAssets.push({
          kind: input.kind,
          name: f.replace(/\.md$/, ''),
          path: `${dir}/${f}`,
          format: 'md' as AssetFormat,
          scope: 'prj' as AssetScope,
        })
      }
    }
  }

  // 2. builtin 资产（目前仅 blueprint 类有 builtin）
  const builtinAssets: ListResult['assets'] = []
  if (scope === 'oxn' || scope === 'effective') {
    if (input.kind === 'blueprint') {
      const registry = getBuiltinRegistry()
      const bps = registry.listByType('blueprint')
      for (const bp of bps) {
        builtinAssets.push({
          kind: input.kind,
          name: bp.name,
          path: `@oxn/blueprint/${bp.name}`,
          format: 'md' as AssetFormat,
          scope: 'oxn' as AssetScope,
        })
      }
    }
  }

  // 3. effective: 项目覆盖 builtin（同名项目资产保留 builtin-only）
  if (scope === 'effective') {
    const seen = new Set<string>()
    const merged: ListResult['assets'] = []
    for (const a of projectAssets) {
      seen.add(a.name)
      merged.push(a)
    }
    for (const a of builtinAssets) {
      if (!seen.has(a.name)) merged.push(a)
    }
    return { assets: merged }
  }

  return { assets: scope === 'oxn' ? builtinAssets : projectAssets }
}

export function listAll(projectRoot: string, kind?: AssetKind | null, scope?: AssetScope | 'effective'): ListResult {
  const all: ListResult['assets'] = []
  const kinds: AssetKind[] = kind ? [kind] : [...ALL_ASSET_KINDS]
  for (const k of kinds) {
    const r = list({ kind: k, projectRoot, scope })
    all.push(...r.assets)
  }
  return { assets: all }
}
