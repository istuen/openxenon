export type { Scope, StandardAsset } from '../infra/loader'
export type { AssetState, AssetType } from './paths'

import { getProjectBoundaryPath } from '../kernel'
import { listStandards, loadStandardByName, promoteStandard, loadStandardByPath, loadArsenalsByState, loadArsenalsByTypeAndState, resolveAssetPath } from '../infra/loader'

const getProjectBoundary = (): string => getProjectBoundaryPath(process.cwd())

export const arsenalListStandards = (state?: 'draft' | 'canonical', scope?: 'project' | 'global' | 'fallback') => {
  return listStandards(getProjectBoundary(), state, scope)
}

export const arsenalLoadStandardByName = (name: string, type: import('../infra/loader').AssetType) => {
  return loadStandardByName(getProjectBoundary(), name, type)
}

export {
  promoteStandard,
  loadStandardByPath
}

export const arsenalLoadArsenalsByState = (state: 'draft' | 'canonical', scope?: 'project' | 'global' | 'fallback') => {
  return loadArsenalsByState(getProjectBoundary(), state, scope)
}

export const arsenalLoadArsenalsByTypeAndState = (type: import('../infra/loader').AssetType, state: 'draft' | 'canonical', scope?: 'project' | 'global' | 'fallback') => {
  return loadArsenalsByTypeAndState(getProjectBoundary(), type, state, scope)
}

export const arsenalResolveAssetPath = (name: string, type: import('../infra/loader').AssetType, state: 'draft' | 'canonical') => {
  return resolveAssetPath(getProjectBoundary(), name, type, state)
}