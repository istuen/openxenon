import { homedir } from 'os'
import { join } from 'path'

export const BOUNDARY_DIR = '.openxenon'

export const GLOBAL_BOUNDARY = join(homedir(), '.openxenon')

export const GLOBAL_ARSENALS_ROOT = join(GLOBAL_BOUNDARY, 'arsenals')
export const GLOBAL_FORGES_ROOT = join(GLOBAL_BOUNDARY, 'forges')

export type Scope = 'project' | 'global'

export type AssetState = 'draft' | 'canonical'
export type AssetType = 'probes' | 'blueprints' | 'parts'

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
  return scope === 'global' ? join(GLOBAL_BOUNDARY, 'hall') : join(getProjectBoundary(cwd), 'hall')
}
