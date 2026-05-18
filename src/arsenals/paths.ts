import { join } from 'path'
import { GLOBAL_ARSENALS_ROOT, GLOBAL_ARSENALS_PROBES, GLOBAL_ARSENALS_STAGES, GLOBAL_ARSENALS_BLUEPRINTS, GLOBAL_ARSENALS_PARTS, GLOBAL_FORGES_ROOT, GLOBAL_FORGES_PROBES, GLOBAL_FORGES_STAGES, GLOBAL_FORGES_BLUEPRINTS, GLOBAL_FORGES_PARTS, resolveArsenalRoot, resolveForgeRoot, type Scope } from '../infra/paths'

export { type Scope } from '../infra/paths'

export const ARSENALS_ROOT = GLOBAL_ARSENALS_ROOT
export const ARSENALS_PROBES = GLOBAL_ARSENALS_PROBES
export const ARSENALS_STAGES = GLOBAL_ARSENALS_STAGES
export const ARSENALS_BLUEPRINTS = GLOBAL_ARSENALS_BLUEPRINTS
export const ARSENALS_PARTS = GLOBAL_ARSENALS_PARTS

export const FORGES_ROOT = GLOBAL_FORGES_ROOT
export const FORGES_PROBES = GLOBAL_FORGES_PROBES
export const FORGES_STAGES = GLOBAL_FORGES_STAGES
export const FORGES_BLUEPRINTS = GLOBAL_FORGES_BLUEPRINTS
export const FORGES_PARTS = GLOBAL_FORGES_PARTS

export type AssetState = 'draft' | 'canonical'
export type AssetType = 'probes' | 'stages' | 'blueprints' | 'parts'

export const FORGES_DIRECTORY_STRUCTURE = {
  draft: '<type>/<name>/draft.yaml'
} as const

export function getForgesPath(type: AssetType, scope: Scope = 'project', cwd?: string): string {
  if (scope === 'global') {
    switch (type) {
      case 'probes': return GLOBAL_FORGES_PROBES
      case 'stages': return GLOBAL_FORGES_STAGES
      case 'blueprints': return GLOBAL_FORGES_BLUEPRINTS
      case 'parts': return GLOBAL_FORGES_PARTS
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
      case 'parts': return GLOBAL_ARSENALS_PARTS
    }
  }
  return resolveArsenalRoot(scope, cwd)
}

export function getArsenalsStatePath(type: AssetType, state: AssetState, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalsPath(type, scope, cwd)
  return join(base, state)
}

export function getForgesAssetPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getForgesPath(type, scope, cwd)
  return join(base, name, 'draft.yaml')
}

export function getArsenalsAssetPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalsPath(type, scope, cwd)
  if (type === 'parts') {
    return join(base, `${name}.yaml`)
  }
  const fileName = type === 'blueprints' ? 'blueprint.yaml' : 'canonical.yaml'
  return join(base, name, fileName)
}

export function getPathStructure(assetPath: string): 'forge' | 'arsenal' | 'unknown' {
  const pathParts = assetPath.split('/')

  if (pathParts.includes('forges')) {
    return 'forge'
  }

  if (pathParts.includes('arsenals')) {
    return 'arsenal'
  }

  return 'unknown'
}