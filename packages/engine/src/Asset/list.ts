/**
 * Asset module — list use case (v0.6 PR-5a)
 * v0.6.2 I-6 fix: 接受可选 config 参数；缺省时 lazy 加载 .openxenon/config.json，
 * 让 .oxnrc / config.json 里的 assetRoot / assetDirs 真正生效。
 * v0.6.2 I-4 fix: 接受可选 scope 参数（'prj' | 'oxn' | 'effective'），默认 'prj'。
 */
import { readdirSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { resolveAssetDir, ALL_ASSET_KINDS, type ProjectConfig } from '@openxenon/engine/infra/paths'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'
import { getBuiltinRegistry } from '@openxenon/engine/oxl/scope/oxn-builtin-registry'
import type { ListInput, ListResult, AssetFormat } from './types'
import type { AssetKind } from '@openxenon/engine/infra/paths'

export type Scope = 'prj' | 'oxn' | 'effective'

export function list(input: ListInput, config?: ProjectConfig | null): ListResult {
  const cfg = config ?? loadProjectConfig(input.projectRoot)
  const scope: Scope = input.scope ?? 'prj'

  if (scope === 'oxn') {
    // builtin only
    const builtinRegistry = getBuiltinRegistry()
    const names = builtinRegistry.listBuiltinAssetNames(input.kind)
    return {
      assets: names.map((n) => ({
        kind: input.kind,
        name: n.replace(/\.md$/, ''),
        path: `<builtin>/${input.kind}/${n}`,
        format: 'md' as AssetFormat,
        scope: 'oxn' as const,
      })),
    }
  }

  // 'prj' or 'effective' both need project listing
  const dir = resolveAssetDir(input.projectRoot, input.kind, cfg)
  const prjAssets = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({
          kind: input.kind,
          name: f.replace(/\.md$/, ''),
          path: `${dir}/${f}`,
          format: 'md' as AssetFormat,
          scope: 'prj' as const,
        }))
    : []

  if (scope === 'prj') {
    return { assets: prjAssets }
  }

  // 'effective': project overrides builtin
  const builtinRegistry = getBuiltinRegistry()
  const builtinNames = builtinRegistry.listBuiltinAssetNames(input.kind).map((n) => n.replace(/\.md$/, ''))
  const prjNames = new Set(prjAssets.map((a) => a.name))
  const builtinOnly = builtinNames
    .filter((n) => !prjNames.has(n))
    .map((n) => ({
      kind: input.kind,
      name: n,
      path: `<builtin>/${input.kind}/${n}.md`,
      format: 'md' as AssetFormat,
      scope: 'oxn' as const,
    }))
  return { assets: [...prjAssets, ...builtinOnly] }
}

export function listAll(projectRoot: string, config?: ProjectConfig | null, scope?: Scope): ListResult {
  const all: ListResult['assets'] = []
  for (const kind of ALL_ASSET_KINDS) {
    const r = list({ kind, projectRoot, scope }, config)
    all.push(...r.assets)
  }
  return { assets: all }
}

// Re-export for callers
export type { AssetKind }
