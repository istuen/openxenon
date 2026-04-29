import { join } from 'path'
import { GLOBAL_BOUNDARY_PATH } from './global'

export const ARSENALS_ROOT = join(GLOBAL_BOUNDARY_PATH, 'arsenals')
export const ARSENALS_PROBES = join(ARSENALS_ROOT, 'probes')
export const ARSENALS_PROOFS = join(ARSENALS_ROOT, 'proofs')
export const ARSENALS_STAGES = join(ARSENALS_ROOT, 'stages')

export const ARSENALS_PROBES_DRAFT = join(ARSENALS_PROBES, 'draft')
export const ARSENALS_PROBES_CANONICAL = join(ARSENALS_PROBES, 'canonical')
export const ARSENALS_PROOFS_DRAFT = join(ARSENALS_PROOFS, 'draft')
export const ARSENALS_PROOFS_CANONICAL = join(ARSENALS_PROOFS, 'canonical')
export const ARSENALS_STAGES_DRAFT = join(ARSENALS_STAGES, 'draft')
export const ARSENALS_STAGES_CANONICAL = join(ARSENALS_STAGES, 'canonical')

export type AssetState = 'draft' | 'canonical'
export type AssetType = 'probes' | 'proofs' | 'stages'

export function getArsenalsPath(type: AssetType): string {
  switch (type) {
    case 'probes':
      return ARSENALS_PROBES
    case 'proofs':
      return ARSENALS_PROOFS
    case 'stages':
      return ARSENALS_STAGES
  }
}

export function getArsenalsStatePath(type: AssetType, state: AssetState): string {
  const base = getArsenalsPath(type)
  return join(base, state)
}
