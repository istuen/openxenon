import { join } from 'path'
import { GLOBAL_BOUNDARY_PATH } from './global'

export const STANDARDS_ROOT = join(GLOBAL_BOUNDARY_PATH, 'standards')
export const STANDARDS_PROBES = join(STANDARDS_ROOT, 'probes')
export const STANDARDS_PROOFS = join(STANDARDS_ROOT, 'proofs')
export const STANDARDS_STAGES = join(STANDARDS_ROOT, 'stages')

export const STANDARDS_PROBES_DRAFT = join(STANDARDS_PROBES, 'DRAFT')
export const STANDARDS_PROBES_CANONICAL = join(STANDARDS_PROBES, 'CANONICAL')
export const STANDARDS_PROOFS_DRAFT = join(STANDARDS_PROOFS, 'DRAFT')
export const STANDARDS_PROOFS_CANONICAL = join(STANDARDS_PROOFS, 'CANONICAL')
export const STANDARDS_STAGES_DRAFT = join(STANDARDS_STAGES, 'DRAFT')
export const STANDARDS_STAGES_CANONICAL = join(STANDARDS_STAGES, 'CANONICAL')

export type AssetState = 'DRAFT' | 'CANONICAL'
export type AssetType = 'probes' | 'proofs' | 'stages'

export function getStandardsPath(type: AssetType): string {
  switch (type) {
    case 'probes':
      return STANDARDS_PROBES
    case 'proofs':
      return STANDARDS_PROOFS
    case 'stages':
      return STANDARDS_STAGES
  }
}

export function getStandardsStatePath(type: AssetType, state: AssetState): string {
  const base = getStandardsPath(type)
  return join(base, state)
}