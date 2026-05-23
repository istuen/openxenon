export type { Scope, StandardAsset } from '../infra/loader'

import {
  generateCompiledArtifact,
  listStandards,
  loadArsenalsByState,
  loadArsenalsByTypeAndState,
  loadStandardByName,
  loadStandardByPath,
  promoteStandard,
  resolveAssetPath,
} from '../infra/loader'

import { getProjectBoundaryPath } from '../kernel'
import type { AssetType } from './paths'

const getProjectBoundary = (): string => getProjectBoundaryPath(process.cwd())

export const arsenalListStandards = (
  state?: 'draft' | 'canonical',
  scope?: 'project' | 'global' | 'fallback' | 'builtin',
) => {
  return listStandards(scope || 'fallback', getProjectBoundary(), state)
}

export const arsenalLoadStandardByName = (name: string, type: AssetType) => {
  return loadStandardByName('project', getProjectBoundary(), name, type)
}

export { generateCompiledArtifact, loadStandardByPath, promoteStandard }

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
