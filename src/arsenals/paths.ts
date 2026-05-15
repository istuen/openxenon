import { join } from 'path'
import { GLOBAL_BOUNDARY_PATH } from '../infra/global'

export const ARSENALS_ROOT = join(GLOBAL_BOUNDARY_PATH, 'arsenals')
export const ARSENALS_PROBES = join(ARSENALS_ROOT, 'probes')
export const ARSENALS_STAGES = join(ARSENALS_ROOT, 'stages')
export const ARSENALS_BLUEPRINTS = join(ARSENALS_ROOT, 'blueprints')

export const FORGES_ROOT = join(GLOBAL_BOUNDARY_PATH, 'forges')
export const FORGES_PROBES = join(FORGES_ROOT, 'probes')
export const FORGES_STAGES = join(FORGES_ROOT, 'stages')
export const FORGES_BLUEPRINTS = join(FORGES_ROOT, 'blueprints')

export type AssetState = 'draft' | 'canonical'
export type AssetType = 'probes' | 'stages' | 'blueprints'

export const ARSENALS_DIRECTORY_STRUCTURE = {
  old: {
    draft: '<type>/draft/<name>.yaml',
    canonical: '<type>/canonical/<name>.yaml'
  },
  new: {
    draft: '<type>/<name>/draft.yaml',
    canonical: '<type>/<name>/canonical.yaml'
  }
} as const

export const FORGES_DIRECTORY_STRUCTURE = {
  draft: '<type>/<name>/draft.yaml'
} as const

export function getForgesPath(type: AssetType): string {
  switch (type) {
    case 'probes':
      return FORGES_PROBES
    case 'stages':
      return FORGES_STAGES
    case 'blueprints':
      return FORGES_BLUEPRINTS
  }
}

export function getForgeDraftPath(type: AssetType, name: string): string {
  const base = getForgesPath(type)
  return join(base, name, 'draft.yaml')
}

export function getArsenalsPath(type: AssetType): string {
  switch (type) {
    case 'probes':
      return ARSENALS_PROBES
    case 'stages':
      return ARSENALS_STAGES
    case 'blueprints':
      return ARSENALS_BLUEPRINTS
  }
}

export function getArsenalsStatePath(type: AssetType, state: AssetState): string {
  const base = getArsenalsPath(type)
  return join(base, state)
}

export function getNewStructurePath(type: AssetType, name: string, state: AssetState): string {
  const base = getArsenalsPath(type)
  return join(base, name, state === 'draft' ? 'draft.yaml' : 'canonical.yaml')
}

export function getOldStructurePath(type: AssetType, name: string, state: AssetState): string {
  const base = getArsenalsPath(type)
  return join(base, state, `${name}.yaml`)
}

export function getPathStructure(assetPath: string): 'forge' | 'arsenal-new' | 'arsenal-old' | 'unknown' {
  const pathParts = assetPath.split('/')

  if (pathParts.includes('forges')) {
    return 'forge'
  }

  const draftIndex = pathParts.indexOf('draft')
  const canonicalIndex = pathParts.indexOf('canonical')

  if (draftIndex !== -1 || canonicalIndex !== -1) {
    const stateIndex = draftIndex !== -1 ? draftIndex : canonicalIndex
    const nameIndex = stateIndex - 1
    if (nameIndex >= 0 && pathParts[nameIndex] !== 'arsenals') {
      return 'arsenal-old'
    }
  }

  if (assetPath.includes('/draft.yaml') || assetPath.includes('/canonical.yaml')) {
    return 'arsenal-new'
  }

  return 'unknown'
}
