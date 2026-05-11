export type { StandardAsset } from '../infra/loader'
export type { Scope } from '../infra/loader'
import type { AssetType } from './paths'

import { getProjectBoundaryPath } from '../kernel'
import { listStandards, loadStandardByName, promoteStandard, loadStandardByPath, loadArsenalsByState, loadArsenalsByTypeAndState, resolveAssetPath } from '../infra/loader'

const getProjectBoundary = (): string => getProjectBoundaryPath(process.cwd())

export const arsenalListStandards = (state?: 'draft' | 'canonical', scope?: 'project' | 'global' | 'fallback' | 'builtin') => {
  return listStandards(getProjectBoundary(), state, scope)
}

export const arsenalLoadStandardByName = (name: string, type: AssetType) => {
  return loadStandardByName(getProjectBoundary(), name, type)
}

export {
  promoteStandard,
  loadStandardByPath
}

export const arsenalLoadArsenalsByState = (state: 'draft' | 'canonical', scope?: 'project' | 'global' | 'fallback' | 'builtin') => {
  return loadArsenalsByState(getProjectBoundary(), state, scope)
}

export const arsenalLoadArsenalsByTypeAndState = (type: AssetType, state: 'draft' | 'canonical', scope?: 'project' | 'global' | 'fallback' | 'builtin') => {
  return loadArsenalsByTypeAndState(getProjectBoundary(), type, state, scope)
}

export const arsenalResolveAssetPath = (name: string, type: AssetType, state: 'draft' | 'canonical') => {
  return resolveAssetPath(getProjectBoundary(), name, type, state)
}