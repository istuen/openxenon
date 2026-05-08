import { join } from 'path'
import { GLOBAL_BOUNDARY_PATH } from '../infra/global'

export const ARSENALS_ROOT = join(GLOBAL_BOUNDARY_PATH, 'arsenals')
export const ARSENALS_PROBES = join(ARSENALS_ROOT, 'probes')
export const ARSENALS_PROOFS = join(ARSENALS_ROOT, 'proofs')
export const ARSENALS_STAGES = join(ARSENALS_ROOT, 'stages')
export const ARSENALS_BLUEPRINTS = join(ARSENALS_ROOT, 'blueprints')

export const ARSENALS_PROBES_DRAFT = join(ARSENALS_PROBES, 'draft')
export const ARSENALS_PROBES_CANONICAL = join(ARSENALS_PROBES, 'canonical')
export const ARSENALS_PROOFS_DRAFT = join(ARSENALS_PROOFS, 'draft')
export const ARSENALS_PROOFS_CANONICAL = join(ARSENALS_PROOFS, 'canonical')
export const ARSENALS_STAGES_DRAFT = join(ARSENALS_STAGES, 'draft')
export const ARSENALS_STAGES_CANONICAL = join(ARSENALS_STAGES, 'canonical')
export const ARSENALS_BLUEPRINTS_DRAFT = join(ARSENALS_BLUEPRINTS, 'draft')
export const ARSENALS_BLUEPRINTS_CANONICAL = join(ARSENALS_BLUEPRINTS, 'canonical')

export type AssetState = 'draft' | 'canonical'
export type AssetType = 'probes' | 'proofs' | 'stages' | 'blueprints'

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

export function getArsenalsPath(type: AssetType): string {
  switch (type) {
    case 'probes':
      return ARSENALS_PROBES
    case 'proofs':
      return ARSENALS_PROOFS
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

export function getPathStructure(assetPath: string): 'new' | 'old' | 'unknown' {
  const pathParts = assetPath.split('/')
  const draftIndex = pathParts.indexOf('draft')
  const canonicalIndex = pathParts.indexOf('canonical')

  if (draftIndex !== -1 || canonicalIndex !== -1) {
    const stateIndex = draftIndex !== -1 ? draftIndex : canonicalIndex
    const nameIndex = stateIndex - 1
    if (nameIndex >= 0 && pathParts[nameIndex] !== 'arsenals') {
      return 'old'
    }
  }

  if (assetPath.includes('/draft.yaml') || assetPath.includes('/canonical.yaml')) {
    return 'new'
  }

  return 'unknown'
}
