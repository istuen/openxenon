import { join } from 'path'
import { GLOBAL_ARSENALS_ROOT, GLOBAL_ARSENALS_PROBES, GLOBAL_ARSENALS_STAGES, GLOBAL_ARSENALS_BLUEPRINTS, GLOBAL_FORGES_ROOT, GLOBAL_FORGES_PROBES, GLOBAL_FORGES_STAGES, GLOBAL_FORGES_BLUEPRINTS, resolveArsenalRoot, resolveForgeRoot, type Scope } from '../infra/paths'

export { type Scope } from '../infra/paths'

export const ARSENALS_ROOT = GLOBAL_ARSENALS_ROOT
export const ARSENALS_PROBES = GLOBAL_ARSENALS_PROBES
export const ARSENALS_STAGES = GLOBAL_ARSENALS_STAGES
export const ARSENALS_BLUEPRINTS = GLOBAL_ARSENALS_BLUEPRINTS

export const FORGES_ROOT = GLOBAL_FORGES_ROOT
export const FORGES_PROBES = GLOBAL_FORGES_PROBES
export const FORGES_STAGES = GLOBAL_FORGES_STAGES
export const FORGES_BLUEPRINTS = GLOBAL_FORGES_BLUEPRINTS

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

export function getForgesPath(type: AssetType, scope: Scope = 'project', cwd?: string): string {
  if (scope === 'global') {
    switch (type) {
      case 'probes': return GLOBAL_FORGES_PROBES
      case 'stages': return GLOBAL_FORGES_STAGES
      case 'blueprints': return GLOBAL_FORGES_BLUEPRINTS
    }
  }
  return resolveForgeRoot(scope, cwd)
}

export function getForgeDraftPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getForgesPath(type, scope, cwd)
  return join(base, name, 'draft.yaml')
}

export function getArsenalsPath(type: AssetType, scope: Scope = 'project', cwd?: string): string {
  if (scope === 'global') {
    switch (type) {
      case 'probes': return GLOBAL_ARSENALS_PROBES
      case 'stages': return GLOBAL_ARSENALS_STAGES
      case 'blueprints': return GLOBAL_ARSENALS_BLUEPRINTS
    }
  }
  return resolveArsenalRoot(scope, cwd)
}

export function getArsenalsStatePath(type: AssetType, state: AssetState, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalsPath(type, scope, cwd)
  return join(base, state)
}

export function getNewStructurePath(type: AssetType, name: string, state: AssetState, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalsPath(type, scope, cwd)
  return join(base, name, state === 'draft' ? 'draft.yaml' : 'canonical.yaml')
}

export function getOldStructurePath(type: AssetType, name: string, state: AssetState, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalsPath(type, scope, cwd)
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