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
  /** v0.6 PR-1: Asset 根目录（默认 'assets'） */
  assetRoot?: string
  /** v0.6 PR-1: 每类 asset 的子目录（默认 {domain: 'domain', blueprint: 'blueprint', stack: 'stack'}） */
  assetDirs?: {
    domain?: string
    blueprint?: string
    stack?: string
    roadmap?: string // 🆕 v0.6.1-alpha.1
    library?: string // 🆕 v0.6.1-alpha.1 Batch 2
    external?: string // 🆕 v0.6.1-alpha.1 Batch 2
  }
}

/** v0.6 PR-1: Asset 路径解析（支持 config + fallback） */
export const DEFAULT_ASSET_ROOT = 'assets'
export const DEFAULT_ASSET_DIRS = {
  domain: 'domains',
  blueprint: 'blueprints',
  stack: 'stack',
  roadmap: 'roadmaps', // 🆕 v0.6.1-alpha.1
  library: 'libraries', // 🆕 v0.6.1-alpha.1 Batch 2
  external: 'externals', // 🆕 v0.6.1-alpha.1 Batch 2
} as const

export type AssetKind = 'domain' | 'blueprint' | 'stack' | 'roadmap' | 'library' | 'external' // 🆕 v0.6.1-alpha.1 Batch 2: library + external

/**
 * v0.6 PR-1: 解析单个 asset kind 的实际目录路径。
 *
 * 优先级：
 *   1. config.assetDirs[kind]（v0.6 新配置）
 *   2. config.assetRoot + DEFAULT_ASSET_DIRS[kind]（v0.6 默认）
 *   3. 旧布局回退：BOUNDARY_DIR/{domain|blueprint|stack}/（v0.5 兼容）
 *
 * 注：回退仅在主路径不存在时启用，避免双写造成 IAP_ASSET_PATH_CONFLICT。
 */
export function resolveAssetDir(projectRoot: string, kind: AssetKind, config: ProjectConfig | null = null): string {
  const boundary = join(projectRoot, BOUNDARY_DIR)
  const custom = config?.assetDirs?.[kind]
  const hasAssetRoot = config?.assetRoot != null
  const root = config?.assetRoot ?? DEFAULT_ASSET_ROOT

  // 路径 1：用户自定义 assetDirs[kind]（绝对路径直接返回）
  if (custom?.startsWith('/')) {
    return custom
  }

  // 路径 2：v0.5 兼容 — config 只设 assetDirs（无 assetRoot）→ custom 直接作子目录
  if (custom && !hasAssetRoot) {
    return join(boundary, custom)
  }

  // 路径 3：v0.6 — config 同时设 assetRoot + assetDirs → custom 嵌套在 assetRoot 下
  if (custom) {
    return join(boundary, root, custom)
  }

  // 路径 4：默认 assetRoot + DEFAULT_ASSET_DIRS[kind]
  return join(boundary, root, DEFAULT_ASSET_DIRS[kind])
}

/**
 * v0.6 PR-1: 返回指定 kind 的所有候选路径（按优先级降序），用于探测
 * 和 fallback 兼容。CLI 在 read/write 前会按顺序检查：
 *   1. 主路径（config 决定）
 *   2. 旧路径（.openxenon/<kind>/）
 */
export function resolveAssetCandidates(
  projectRoot: string,
  kind: AssetKind,
  config: ProjectConfig | null = null,
): { primary: string; fallback: string } {
  const boundary = join(projectRoot, BOUNDARY_DIR)
  const primary = resolveAssetDir(projectRoot, kind, config)
  // 旧布局 fallback：.openxenon/<plural>/（domains/blueprints/stack/roadmaps）
  const fallbackDir =
    kind === 'domain'
      ? 'domains'
      : kind === 'blueprint'
        ? 'blueprints'
        : kind === 'roadmap'
          ? 'roadmaps' // 🆕 v0.6.1-alpha.1
          : 'stack'
  const fallback = join(boundary, fallbackDir)
  return { primary, fallback }
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
 * v0.5 Phase 3 + v0.6 PR-1: resolve the primary path for an asset based on configured format.
 *
 * - `domain X` → `.openxenon/assets/domain/X.oxn` (v0.6 默认) or `.openxenon/domains/X.oxn` (v0.5 fallback)
 * - `blueprint X` → `.openxenon/assets/blueprint/X.oxn` 或 fallback
 * - `work X` → `.openxenon/works/X/work.oxn` (不参与 assetDir 配置 — work 是流程而非资产)
 * - `proof X` → `.openxenon/proofs/X/proof.oxn` (不参与 assetDir 配置 — proof 是流程而非资产)
 *
 * config 控制：
 *   - assetRoot (默认 'assets')
 *   - assetDirs.{domain,blueprint} (默认 'domain' / 'blueprint')
 */
export function resolveAssetPrimaryPath(
  projectRoot: string,
  entity: AssetEntityKind,
  name: string,
  format: AssetFormat,
  config: ProjectConfig | null = null,
): string {
  if (entity === 'work') {
    // .openxenon/works/<name>/{work.oxn|work.md}
    return join(projectRoot, BOUNDARY_DIR, 'works', name, format === 'oxn' ? 'work.oxn' : 'work.md')
  }
  if (entity === 'proof') {
    // .openxenon/proofs/<name>/{proof.oxn|proof.md}
    return join(projectRoot, BOUNDARY_DIR, 'proofs', name, format === 'oxn' ? 'proof.oxn' : 'proof.md')
  }
  // domain / blueprint / stack: v0.6 asset 路径布局
  // 默认 `assets/<kind>/`，config 可自定义
  if (entity === 'domain' || entity === 'blueprint' || entity === 'stack') {
    const baseDir = resolveAssetDir(projectRoot, entity, config)
    const ext = format === 'oxn' ? 'oxn' : 'md'
    // 旧布局别名：domain-md / blueprint-md
    if (config === null && format === 'md') {
      const boundary = join(projectRoot, BOUNDARY_DIR)
      const legacyDir = entity === 'domain' ? 'domains-md' : 'blueprints-md'
      return join(boundary, legacyDir, `${name}.${ext}`)
    }
    return join(baseDir, `${name}.${ext}`)
  }
  // 不应该到这里
  throw new Error(`Unsupported entity: ${entity}`)
}

/** v0.5 Phase 3: resolve the alt-format path (the one to sync to/from). */
export function resolveAssetAltPath(
  projectRoot: string,
  entity: AssetEntityKind,
  name: string,
  format: AssetFormat,
  config: ProjectConfig | null = null,
): string {
  const alt: AssetFormat = format === 'oxn' ? 'md' : 'oxn'
  return resolveAssetPrimaryPath(projectRoot, entity, name, alt, config)
}

/** v0.5 Phase 3: helper — get the asset format with default fallback */
export function resolveAssetFormat(config: ProjectConfig | null): AssetFormat {
  return config?.assetFormat ?? 'oxn'
}

/** v0.5 Phase 3: helper — get the autoSync flag with default fallback */
export function resolveAutoSync(config: ProjectConfig | null): boolean {
  return config?.autoSync ?? true
}
