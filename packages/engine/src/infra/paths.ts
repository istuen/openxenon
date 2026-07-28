import { homedir } from 'os'
import { join } from 'path'
import { getBoundaryDir } from './oxnrc'

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

// v0.5 Phase 3 + v0.6.1 PR-3: asset format choice. CLI reads/writes the chosen format as the
// "primary" source.
//
// v0.7.0: .oxn format removed. 'md' is the only canonical format.
// v0.6.1+: Default = 'md' — D-α c 锁定。
// v0.5.x:  Default = 'oxn' — 向后兼容 v0.4 users（已废弃）。
/** @deprecated 'oxn' format is removed in v0.7. Only 'md' is supported. */
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
  /** v0.7: 运行时边界目录名（默认 '.openxenon'） */
  boundaryDir?: string
  /** v0.6 PR-1: 每类 asset 的子目录（默认 {domain: 'domain', workflow: 'workflow', stack: 'stack'}） */
  assetDirs?: {
    domain?: string
    workflow?: string // 🆕 v0.6.1-alpha.2: 原 blueprint 改名
    stack?: string
    blueprint?: string // 🆕 v0.6.1-alpha.2: 新语义（组合模板）
    roadmap?: string // 🆕 v0.6.1-alpha.1
  }
}

/** v0.6 PR-1: Asset 路径解析（支持 config + fallback） */
export const DEFAULT_ASSET_ROOT = 'assets'
export const DEFAULT_ASSET_DIRS = {
  domain: 'domains',
  workflow: 'workflows', // 🆕 v0.6.1-alpha.2: 原 blueprint 改名
  stack: 'stacks', // 🆕 v0.6.2-alpha.1: 同步复数约定（与 domains/workflows/blueprints/roadmaps + @md/stacks/ 引用一致；fallback 已为 stacks，单数 primary 是 typo）
  blueprint: 'blueprints', // 🆕 v0.6.1-alpha.2: 新语义（组合模板）
  roadmap: 'roadmaps', // 🆕 v0.6.1-alpha.1
} as const

/**
 * v0.6.1-alpha.2 SSOT: 全部 AssetKind（5 类型）。
 * 收敛自原 6 类型（domain/blueprint/stack/roadmap/library/external）。
 * library/external 在 v0.6.1-alpha.2 中被收敛：library 降级为 .md 文件，external 降级为边界内 inline 声明。
 * 原 Blueprint (slots/deps/observe) 改名为 Workflow；新 Blueprint = 组合模板。
 */
export const ALL_ASSET_KINDS = [
  'domain',
  'workflow', // 🆕 v0.6.1-alpha.2: 原 blueprint 改名
  'stack',
  'blueprint', // 🆕 v0.6.1-alpha.2: 新语义（组合模板）
  'roadmap',
] as const

export type AssetKind = (typeof ALL_ASSET_KINDS)[number]

/**
 * v0.6 PR-1 + v0.7: 解析单个 asset kind 的实际目录路径。
 *
 * 优先级：
 *   1. config.assetDirs[kind]（v0.6 新配置，绝对路径直接返回）
 *   2. config.assetDirs[kind] 相对路径（v0.7：以 ./ 或 ../ 开头不 join boundary）
 *   3. config.assetRoot + DEFAULT_ASSET_DIRS[kind]（v0.6 默认）
 *      — v0.7：assetRoot 以 ./ 或 ../ 开头时不 join boundary（跳出 .openxenon/）
 *   4. 旧布局回退：<boundaryDir>/{domain|blueprint|stack}/（v0.5 兼容）
 *
 * 注：回退仅在主路径不存在时启用，避免双写造成 IAP_ASSET_PATH_CONFLICT。
 * boundaryDir 默认读 BOUNDARY_DIR 常量，config.boundaryDir 可覆盖（v0.7）。
 */
export function resolveAssetDir(projectRoot: string, kind: AssetKind, config: ProjectConfig | null = null): string {
  const boundaryDir = getBoundaryDir(config)
  const boundary = join(projectRoot, boundaryDir)
  const custom = config?.assetDirs?.[kind]
  const hasAssetRoot = config?.assetRoot != null
  const root = config?.assetRoot ?? DEFAULT_ASSET_ROOT

  // 路径 1：用户自定义 assetDirs[kind]（绝对路径直接返回）
  if (custom?.startsWith('/')) {
    return custom
  }

  // 路径 2（v0.7 新增）：custom 相对路径以 ./ 或 ../ 开头 → 直接 join projectRoot，不走 boundary
  if (custom && (custom.startsWith('./') || custom.startsWith('../'))) {
    return join(projectRoot, custom)
  }

  // 路径 3：v0.5 兼容 — config 只设 assetDirs（无 assetRoot）→ custom 直接作子目录
  if (custom && !hasAssetRoot) {
    return join(boundary, custom)
  }

  // 路径 4：v0.6 — config 同时设 assetRoot + assetDirs → custom 嵌套在 assetRoot 下
  if (custom) {
    return join(boundary, root, custom)
  }

  // 路径 5（v0.7 新增）：assetRoot 相对路径以 ./ 或 ../ 开头 → 直接 join projectRoot，不走 boundary
  if (root.startsWith('./') || root.startsWith('../')) {
    return join(projectRoot, root, DEFAULT_ASSET_DIRS[kind])
  }

  // 路径 6：默认 assetRoot + DEFAULT_ASSET_DIRS[kind]
  return join(boundary, root, DEFAULT_ASSET_DIRS[kind])
}

/**
 * v0.6 PR-1 + v0.7: 返回指定 kind 的所有候选路径（按优先级降序），用于探测
 * 和 fallback 兼容。CLI 在 read/write 前会按顺序检查：
 *   1. 主路径（config 决定，含 boundaryDir 配置化）
 *   2. 旧路径（<boundaryDir>/<kind>/）
 */
export function resolveAssetCandidates(
  projectRoot: string,
  kind: AssetKind,
  config: ProjectConfig | null = null,
): { primary: string; fallback: string } {
  const boundaryDir = getBoundaryDir(config)
  const boundary = join(projectRoot, boundaryDir)
  const primary = resolveAssetDir(projectRoot, kind, config)
  // 旧布局 fallback：<boundaryDir>/<plural>/（domains/blueprints/stack/roadmaps）
  // 🆕 v0.6.1-alpha.2: 加入 workflow（从原 blueprint 拆分）
  const fallbackDir =
    kind === 'domain'
      ? 'domains'
      : kind === 'workflow'
        ? 'workflows'
        : kind === 'blueprint'
          ? 'blueprints'
          : kind === 'roadmap'
            ? 'roadmaps'
            : 'stacks'
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
// (`.md`). `resolveAssetAltPath` returns the path for the other format.
// =============================================================================

/** 4 entity types that have both .oxn + .md representations */
export type AssetEntityKind = 'domain' | 'blueprint' | 'work' | 'proof'

/**
 * v0.5 Phase 3 + v0.6 PR-1: resolve the primary path for an asset based on configured format.
 *
 * - `domain X` → `.openxenon/assets/domain/X.md`
 * - `blueprint X` → `.openxenon/assets/blueprint/X.md`
 * - `work X` → `.openxenon/works/X/work.md`
 * - `proof X` → `.openxenon/proofs/X/proof.md`
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
    return join(projectRoot, BOUNDARY_DIR, 'works', name, 'work.md')
  }
  if (entity === 'proof') {
    return join(projectRoot, BOUNDARY_DIR, 'proofs', name, 'proof.md')
  }
  // domain / blueprint / stack: v0.6 asset 路径布局
  // 默认 `assets/<kind>/`，config 可自定义
  if (entity === 'domain' || entity === 'blueprint' || entity === 'stack') {
    const baseDir = resolveAssetDir(projectRoot, entity, config)
    // 旧布局别名：domain-md / blueprint-md
    if (config === null && format === 'md') {
      const boundary = join(projectRoot, BOUNDARY_DIR)
      const legacyDir = entity === 'domain' ? 'domains-md' : 'blueprints-md'
      return join(boundary, legacyDir, `${name}.md`)
    }
    return join(baseDir, `${name}.md`)
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

/** v0.5 Phase 3 + v0.6.1 PR-3: helper — get the asset format with default fallback.
 *  v0.7.0: Always returns 'md'.
 */
export function resolveAssetFormat(config: ProjectConfig | null): AssetFormat {
  return config?.assetFormat ?? 'md'
}

/** v0.5 Phase 3: helper — get the autoSync flag with default fallback */
export function resolveAutoSync(config: ProjectConfig | null): boolean {
  return config?.autoSync ?? true
}

// =============================================================================
// v0.7.0: Asset canonical = .md（唯一格式）
//
// 读路径按 4 级候选降序，CLI 选第一个存在的；写路径固定 .md。
// =============================================================================

/**
 * v0.6.1 PR-3: 列出 asset 文件的候选路径（按优先级降序）
 *
 * 顺序：
 *   1. `<primary>/<name>.md`     — v0.6 layout .md（canonical）
 *   2. `<fallback>/<name>.md`   — v0.5 layout .md（如有）
 *
 * @param projectRoot 项目根目录
 * @param entity domain | workflow | blueprint | stack | roadmap (v0.6.1-alpha.2: 5 类型，library/external 已删除)
 * @param name asset 名（不含扩展名）
 * @param config 可选 project config
 * @returns 候选路径，按优先级降序
 */
export function resolveAssetFileCandidatesV61(
  projectRoot: string,
  entity: AssetKind, // 🆕 v0.6.1-alpha.2: 收敛为 5 类型，不再 Exclude
  name: string,
  config: ProjectConfig | null = null,
): readonly string[] {
  const { primary, fallback } = resolveAssetCandidates(projectRoot, entity, config)
  return [
    // 1. .md primary（v0.6 canonical）
    join(primary, `${name}.md`),
    // 2. .md fallback（v0.5 layout .md 同步产物）
    join(fallback, `${name}.md`),
  ] as const
}

/**
 * v0.7.0: 返回 asset 默认写入路径（canonical = .md，唯一格式）。
 *
 * 与读路径不同：写路径只产 1 个目标（.md），不走 fallback。
 */
export function resolveAssetWritePathV61(
  projectRoot: string,
  entity: AssetKind, // 🆕 v0.6.1-alpha.2: 收敛为 5 类型
  name: string,
  config: ProjectConfig | null = null,
  format: 'md' = 'md',
): string {
  const baseDir = resolveAssetDir(projectRoot, entity, config)
  return join(baseDir, `${name}.${format}`)
}
