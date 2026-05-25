import { join } from 'path'
import {
  GLOBAL_ARSENALS_ROOT,
  GLOBAL_FORGES_ROOT,
  resolveBoundary,
  type Scope as InfraScope,
  type Scope,
  type AssetState,
  type AssetType,
} from '../infra/paths'

export { GLOBAL_ARSENALS_ROOT, GLOBAL_FORGES_ROOT }

export type { Scope, AssetState, AssetType }

export const GLOBAL_ARSENALS_PROBES = join(GLOBAL_ARSENALS_ROOT, 'probes')
export const GLOBAL_ARSENALS_STAGES = join(GLOBAL_ARSENALS_ROOT, 'stages')
export const GLOBAL_ARSENALS_BLUEPRINTS = join(GLOBAL_ARSENALS_ROOT, 'blueprints')
export const GLOBAL_ARSENALS_PARTS = join(GLOBAL_ARSENALS_ROOT, 'parts')
export const GLOBAL_FORGES_PROBES = join(GLOBAL_FORGES_ROOT, 'probes')
export const GLOBAL_FORGES_STAGES = join(GLOBAL_FORGES_ROOT, 'stages')
export const GLOBAL_FORGES_BLUEPRINTS = join(GLOBAL_FORGES_ROOT, 'blueprints')
export const GLOBAL_FORGES_PARTS = join(GLOBAL_FORGES_ROOT, 'parts')

export function resolveArsenalRoot(scope: InfraScope, cwd?: string): string {
  return join(resolveBoundary(scope, cwd), 'arsenals')
}

export function resolveForgeRoot(scope: InfraScope, cwd?: string): string {
  return join(resolveBoundary(scope, cwd), 'forges')
}

export const FORGES_DIRECTORY_STRUCTURE = {
  draft: '<type>/<name>/draft.oxn',
} as const

export function getForgesPath(type: AssetType, scope: Scope = 'project', cwd?: string): string {
  if (scope === 'global') {
    switch (type) {
      case 'probes':
        return GLOBAL_FORGES_PROBES
      case 'blueprints':
        return GLOBAL_FORGES_BLUEPRINTS
      case 'parts':
        return GLOBAL_FORGES_PARTS
    }
  }
  return resolveForgeRoot(scope, cwd)
}

export function getForgeDraftPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getForgesPath(type, scope, cwd)
  if (type === 'parts' || type === 'probes') {
    return join(base, `${name}.oxn`)
  }
  return join(base, name, 'draft.oxn')
}

export function getArsenalsPath(type: AssetType, scope: Scope = 'project', cwd?: string): string {
  if (scope === 'global') {
    switch (type) {
      case 'probes':
        return GLOBAL_ARSENALS_PROBES
      case 'blueprints':
        return GLOBAL_ARSENALS_BLUEPRINTS
      case 'parts':
        return GLOBAL_ARSENALS_PARTS
    }
  }
  return resolveArsenalRoot(scope, cwd)
}

export function getArsenalsStatePath(
  type: AssetType,
  state: AssetState,
  scope: Scope = 'project',
  cwd?: string,
): string {
  const base = getArsenalsPath(type, scope, cwd)
  return join(base, state)
}

export function getForgesAssetPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getForgesPath(type, scope, cwd)
  if (type === 'parts' || type === 'probes') {
    return join(base, `${name}.oxn`)
  }
  return join(base, name, 'draft.oxn')
}

export function getArsenalsAssetPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalsPath(type, scope, cwd)
  if (type === 'parts' || type === 'probes') {
    return join(base, `${name}.oxn`)
  }
  if (type === 'blueprints') {
    return join(base, name, 'blueprint.oxn')
  }
  return join(base, name, 'canonical.oxn')
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
