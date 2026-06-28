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

// v0.5 Phase 3: asset format choice. CLI reads/writes the chosen format as the
// "primary" source. The other format is auto-synced (when `autoSync` is true) on
// every write. Default = `'oxn'` for backward compatibility — v0.4 users see no
// behavior change.
export type AssetFormat = 'oxn' | 'md'

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
  /** v0.5 Phase 3: which format CLI create/validate/run read+write as primary */
  assetFormat?: AssetFormat
  /** v0.5 Phase 3: auto-sync to the other format after every write (default true) */
  autoSync?: boolean
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

// =============================================================================
// v0.5 Phase 3: asset path resolution by configured format
//
// `resolveAssetPrimaryPath` returns the path for the configured primary format
// (`.oxn` or `.md`). `resolveAssetAltPath` returns the path for the other
// format. Used by all CLI create/validate/run code paths.
// =============================================================================

/** 4 entity types that have both .oxn + .md representations */
export type AssetEntityKind = 'domain' | 'blueprint' | 'work' | 'proof'

/**
 * v0.5 Phase 3: resolve the primary path for an asset based on configured format.
 * - `domain X` → `.openxenon/domains/X.oxn` (format='oxn') or `.openxenon/domains-md/X.md` (format='md')
 * - `blueprint X` → `.openxenon/blueprints/X.oxn` or `.openxenon/blueprints-md/X.md`
 * - `work X` → `.openxenon/works/X/work.oxn` or `.openxenon/works/X/work.md`
 * - `proof X` → `.openxenon/proofs/X/proof.oxn` or `.openxenon/proofs/X/proof.md`
 */
export function resolveAssetPrimaryPath(
  projectRoot: string,
  entity: AssetEntityKind,
  name: string,
  format: AssetFormat,
): string {
  if (entity === 'work') {
    // .openxenon/works/<name>/{work.oxn|work.md}
    return join(projectRoot, BOUNDARY_DIR, 'works', name, format === 'oxn' ? 'work.oxn' : 'work.md')
  }
  if (entity === 'proof') {
    // .openxenon/proofs/<name>/{proof.oxn|proof.md}
    return join(projectRoot, BOUNDARY_DIR, 'proofs', name, format === 'oxn' ? 'proof.oxn' : 'proof.md')
  }
  // domain / blueprint: flat directory, file = <name>.<ext>
  // (inline the literals — paths.ts is L1-Infra, must stay self-contained)
  const dir =
    format === 'oxn'
      ? entity === 'domain'
        ? 'domains'
        : 'blueprints'
      : entity === 'domain'
        ? 'domains-md'
        : 'blueprints-md'
  return join(projectRoot, BOUNDARY_DIR, dir, `${name}.${format}`)
}

/** v0.5 Phase 3: resolve the alt-format path (the one to sync to/from). */
export function resolveAssetAltPath(
  projectRoot: string,
  entity: AssetEntityKind,
  name: string,
  format: AssetFormat,
): string {
  const alt: AssetFormat = format === 'oxn' ? 'md' : 'oxn'
  return resolveAssetPrimaryPath(projectRoot, entity, name, alt)
}

/** v0.5 Phase 3: helper — get the asset format with default fallback */
export function resolveAssetFormat(config: ProjectConfig | null): AssetFormat {
  return config?.assetFormat ?? 'oxn'
}

/** v0.5 Phase 3: helper — get the autoSync flag with default fallback */
export function resolveAutoSync(config: ProjectConfig | null): boolean {
  return config?.autoSync ?? true
}
