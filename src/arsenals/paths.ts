import { join } from 'path'
import {
  GLOBAL_ARSENAL_ROOT,
  resolveBoundary,
  type Scope as InfraScope,
  type Scope,
  type AssetState,
  type AssetType,
} from '../infra/paths'

export { GLOBAL_ARSENAL_ROOT }

export type { Scope, AssetState, AssetType }

export const GLOBAL_ARSENAL_PROBES = join(GLOBAL_ARSENAL_ROOT, 'probes')
export const GLOBAL_ARSENAL_PARTS = join(GLOBAL_ARSENAL_ROOT, 'parts')
export const GLOBAL_ARSENAL_BLUEPRINTS = join(GLOBAL_ARSENAL_ROOT, 'blueprints')

export function resolveArsenalRoot(scope: InfraScope, cwd?: string): string {
  return join(resolveBoundary(scope, cwd), 'arsenal')
}

export const ARSENAL_DIRECTORY_STRUCTURE = {
  draft: '<type>/drafts/<name>.oxn',
  canonical: '<type>/<name>.oxn',
} as const

export function getArsenalPath(type: AssetType, scope: Scope = 'project', cwd?: string): string {
  if (scope === 'global') {
    switch (type) {
      case 'probes':
        return GLOBAL_ARSENAL_PROBES
      case 'blueprints':
        return GLOBAL_ARSENAL_BLUEPRINTS
      case 'parts':
        return GLOBAL_ARSENAL_PARTS
    }
  }
  return resolveArsenalRoot(scope, cwd)
}

export function getArsenalDraftPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalPath(type, scope, cwd)
  if (type === 'blueprints') {
    return join(base, 'drafts', name, 'draft.oxn')
  }
  return join(base, 'drafts', `${name}.oxn`)
}

export function getArsenalCanonicalPath(type: AssetType, name: string, scope: Scope = 'project', cwd?: string): string {
  const base = getArsenalPath(type, scope, cwd)
  if (type === 'blueprints') {
    return join(base, name, 'canonical.oxn')
  }
  return join(base, `${name}.oxn`)
}

export function getPathStructure(assetPath: string): 'draft' | 'canonical' | 'unknown' {
  const pathParts = assetPath.split('/')

  if (pathParts.includes('drafts')) {
    return 'draft'
  }

  if (pathParts.includes('arsenal')) {
    return 'canonical'
  }

  return 'unknown'
}
