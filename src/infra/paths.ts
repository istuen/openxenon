import { homedir } from 'os'
import { join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'

export const GLOBAL_BOUNDARY = join(homedir(), '.openxenon')

export type Scope = 'project' | 'global'

export function getProjectBoundary(cwd: string = process.cwd()): string {
  return join(cwd, BOUNDARY_DIR)
}

export function resolveBoundary(scope: Scope, cwd?: string): string {
  return scope === 'global' ? GLOBAL_BOUNDARY : getProjectBoundary(cwd)
}

export function resolveArsenalRoot(scope: Scope, cwd?: string): string {
  return join(resolveBoundary(scope, cwd), 'arsenals')
}

export function resolveForgeRoot(scope: Scope, cwd?: string): string {
  return join(resolveBoundary(scope, cwd), 'forges')
}

export function resolveHallRoot(scope: Scope, cwd?: string): string {
  return scope === 'global'
    ? join(GLOBAL_BOUNDARY, 'hall')
    : join(getProjectBoundary(cwd), 'hall')
}

export const GLOBAL_ARSENALS_ROOT = join(GLOBAL_BOUNDARY, 'arsenals')
export const GLOBAL_FORGES_ROOT = join(GLOBAL_BOUNDARY, 'forges')
export const GLOBAL_ARSENALS_PROBES = join(GLOBAL_ARSENALS_ROOT, 'probes')
export const GLOBAL_ARSENALS_STAGES = join(GLOBAL_ARSENALS_ROOT, 'stages')
export const GLOBAL_ARSENALS_BLUEPRINTS = join(GLOBAL_ARSENALS_ROOT, 'blueprints')
export const GLOBAL_ARSENALS_PARTS = join(GLOBAL_ARSENALS_ROOT, 'parts')
export const GLOBAL_FORGES_PROBES = join(GLOBAL_FORGES_ROOT, 'probes')
export const GLOBAL_FORGES_STAGES = join(GLOBAL_FORGES_ROOT, 'stages')
export const GLOBAL_FORGES_BLUEPRINTS = join(GLOBAL_FORGES_ROOT, 'blueprints')
export const GLOBAL_FORGES_PARTS = join(GLOBAL_FORGES_ROOT, 'parts')