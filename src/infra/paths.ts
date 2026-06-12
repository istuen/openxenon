import { homedir } from 'os'
import { join } from 'path'

export const BOUNDARY_DIR = '.openxenon'

export const GLOBAL_BOUNDARY = join(homedir(), '.openxenon')

export const GLOBAL_ARSENAL_ROOT = join(GLOBAL_BOUNDARY, 'arsenal') // TODO(v1.1-path): 单点真相源 — 其余 3 处引用已标注

export type Scope = 'project' | 'global'

export type AssetState = 'draft' | 'canonical'
export type AssetType = 'probes' | 'blueprints' | 'parts'

export function getProjectBoundary(cwd: string = process.cwd()): string {
  return join(cwd, BOUNDARY_DIR)
}

/** Alias for getProjectBoundary — matches the older CLI signature (projectRoot first). */
export function getProjectBoundaryPath(projectRoot: string): string {
  return getProjectBoundary(projectRoot)
}

// -----------------------------------------------------------------------------
// ProjectConfig — moved from src/cli/project-config.ts (L3) to L1-Infra so
// that L2-Work / L3-Daemon can import the type without crossing the L1→L3
// boundary. The original src/cli/project-config.ts still re-exports for
// backwards compatibility.
//
// Note: SkillAdapterId is inlined as a string-literal union rather than
// imported from src/skills/adapters (L3) to keep this file self-contained
// within L1-Infra. The values mirror src/skills/adapters.ts:DEFAULT_ADAPTERS.
// -----------------------------------------------------------------------------
export type SkillAdapterIdLiteral = 'opencode' | 'claude' | 'agents'

export interface ProjectConfig {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
  locale?: import('./i18n/locale').SupportedLocale
  name?: string
  createdAt?: number
  debug?: boolean
  tools?: {
    enabled?: SkillAdapterIdLiteral[]
    disabled?: SkillAdapterIdLiteral[]
  }
}

export function resolveBoundary(scope: Scope, cwd?: string): string {
  return scope === 'global' ? GLOBAL_BOUNDARY : getProjectBoundary(cwd)
}

export function resolveArsenalRoot(scope: Scope, cwd?: string): string {
  return join(resolveBoundary(scope, cwd), 'arsenal')
}

export function resolveHallRoot(scope: Scope, cwd?: string): string {
  return scope === 'global' ? join(GLOBAL_BOUNDARY, 'hall') : join(getProjectBoundary(cwd), 'hall')
}
