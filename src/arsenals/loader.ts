import type { Scope, StandardAsset, LoadStandardOptions } from '../infra/loader'
export type { Scope, StandardAsset }

import { BUILTIN_PARTS, BUILTIN_PROBES } from './builtin'
import type { AssetState, AssetType } from './paths'

import {
  generateCompiledArtifact,
  listStandards,
  loadArsenalsByState,
  loadArsenalsByTypeAndState,
  loadStandardByName,
  loadStandardByPath,
  resolveAssetPath,
} from '../infra/loader'

import { promoteToCanonical } from './promoter'

import { getProjectBoundaryPath } from '../cli/project'

const getProjectBoundary = (): string => getProjectBoundaryPath(process.cwd())

export function loadBuiltinAssets(type: AssetType): StandardAsset[] {
  const assets: StandardAsset[] = []

  if (type === 'probes') {
    for (const [name, def] of Object.entries(BUILTIN_PROBES)) {
      assets.push({
        name,
        type: 'probes' as AssetType,
        state: 'canonical' as AssetState,
        path: `builtin:${name}`,
        content: JSON.stringify(def),
      })
    }
  }

  if (type === 'parts') {
    for (const [name, def] of Object.entries(BUILTIN_PARTS)) {
      assets.push({
        name,
        type: 'parts' as AssetType,
        state: 'canonical' as AssetState,
        path: `builtin:${name}`,
        content: JSON.stringify(def),
      })
    }
  }

  return assets
}

export const arsenalListStandards = (
  state?: 'draft' | 'canonical',
  scope?: 'project' | 'global' | 'fallback' | 'builtin',
) => {
  return listStandards(scope || 'fallback', getProjectBoundary(), state)
}

export const arsenalLoadStandardByName = (name: string, type: AssetType, options?: LoadStandardOptions) => {
  return loadStandardByName('project', getProjectBoundary(), name, type, options)
}

export { generateCompiledArtifact, loadStandardByPath, promoteToCanonical }

export const arsenalLoadArsenalsByState = (
  state: 'draft' | 'canonical',
  scope?: 'project' | 'global' | 'fallback' | 'builtin',
) => {
  return loadArsenalsByState(scope || 'fallback', getProjectBoundary(), state)
}

export const arsenalLoadArsenalsByTypeAndState = (
  type: AssetType,
  state: 'draft' | 'canonical',
  scope?: 'project' | 'global' | 'fallback' | 'builtin',
) => {
  return loadArsenalsByTypeAndState(scope || 'fallback', getProjectBoundary(), type, state)
}

export const arsenalResolveAssetPath = (name: string, type: AssetType, state: 'draft' | 'canonical') => {
  return resolveAssetPath('project', getProjectBoundary(), name, type, state)
}
