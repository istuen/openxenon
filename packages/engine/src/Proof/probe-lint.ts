// =============================================================================
// Probe Registry Consistency Lint (RFC-0015 D3.2)
//
// 单一文件 + 单一函数：扫描 3 个 probe 注册表的一致性。
//   1. Catalog   (PROBE_CATALOG, L0 verdicts/catalog.ts)
//   2. Handler   (probeRegistry, L1 infra/probes/index.ts)
//   3. Strategy  (PROBE_VERDICT_STRATEGIES, L0 verdicts/verdict.ts)
//
// 3-way check 方向（per RFC-0015 D3.2）：
//   Check 1 (Catalog → Handler):   每 catalog entry.internalRef → handler alias/resolver 可达
//   Check 2 (Catalog → Strategy):  每 catalog entry → strategy indexed by stripPrefix(ref) 可达
//   Check 3 (Handler/Strategy → Catalog): 每 registered handler/strategy type → 至少一条 catalog entry 引用
//
// L0 边界处理：
//   - catalog + verdict (L0) + probeHandlers (L1) 不能在同一文件 import → 放 L2 Work 层
//   - packages/engine/src/Proof/ 同 Proof 引擎层；probe-lint.ts 自身可同时引用 L0/L1
//   - 静态扫描 — 调用时机: oxn proof probe list / daemon startServer (RFC-0015 D3.3)
//
// RFC-0015 D4.2: 4 OXN-internal probes 已移至 @prj/ scope.
//   stripPrefix 兼容识别 @oxn/ 与 @prj/ 两种 prefix.
// =============================================================================

import { PROBE_CATALOG } from '@openxenon/engine/kernel/verdicts/catalog'
import { PROBE_VERDICT_STRATEGIES } from '@openxenon/engine/kernel/verdicts/verdict'
import { hasProbeHandler, probeRegistry } from '@openxenon/engine/infra/probes'

/** IAPError code 约定 (RFC-0015 D3.3): drift 统一报 */
export const PROBE_REGISTRY_DRIFT = 'PROBE_REGISTRY_DRIFT'

export interface RegistryConsistencyOk {
  ok: true
}

export interface RegistryConsistencyDrift {
  ok: false
  errors: string[]
}

export type RegistryConsistencyResult = RegistryConsistencyOk | RegistryConsistencyDrift

/** strip `@oxn/probes/` / `@oxn/probe/` / `@prj/probes/` / `@prj/probe/` prefix → bare kind（如 'fs-exists'）
 * RFC-0015 D4.2: 引入 @prj/ scope 后, stripPrefix 需同时识别 4 个 prefix。 */
function stripPrefix(ref: string): string {
  return ref.replace(/^@(oxn|prj)\/probes?\//, '')
}

/** catalog internalRef → handler key（统一映射到 canonical keys {fs_exists, shell_exec, ...}） */
function handlerKeyFromRef(ref: string): string | null {
  const stripped = stripPrefix(ref)
  if (!stripped) return null
  // 内部 alias table (ProbeRegistry.aliases in infra/probes/index.ts):
  //   'fs-exists' → 'fs_exists' / 'shell-exec' → 'shell_exec' etc.
  const aliases: Record<string, string> = {
    'fs-exists': 'fs_exists',
    'fs-not-exists': 'fs_not_exists',
    'fs-content-match': 'fs_match',
    'fs-parseable': 'fs_parseable',
    'test-pass': 'test_pass',
    'deps-resolved': 'deps_resolved',
    'ts-compiles': 'ts_compiles',
    'lint-check': 'lint_check',
    'http-responds': 'http_responds',
    'file-exports': 'file_exports',
    'exec-exit-zero': 'shell_exec',
    'shell-exec': 'shell_exec',
    'git-clean': 'git_clean',
    'git-branch-exists': 'git_branch_exists',
    'git-status-clean': 'git_status_clean',
    'git-merge-feasible': 'git_merge_feasible',
    'docs-build': 'docs_build',
    'heading-skeleton-check': 'heading_skeleton_check',
    'docs-heading-check': 'docs_heading_check',
    'doc-boundary': 'doc_boundary',
    // RFC-0015 D6.1-D6.4: 一等公民 probe
    'boundary-guard': 'boundary_guard',
    'stale-draft-check': 'stale_draft_check',
    'asset-migrate-check': 'asset_migrate_check',
    'oxn-runtime-version': 'oxn_runtime_version',
    // RFC-0016 D1-D4: 4 通用 builtin probe
    'file-hash': 'file_hash',
    'test-coverage': 'test_coverage',
    'json-path': 'json_path',
    'port-listening': 'port_listening',
  }
  return aliases[stripped] ?? stripped
}

/**
 * 3-way consistency check across PROBE_CATALOG / probeRegistry / PROBE_VERDICT_STRATEGIES.
 *
 * Returns `{ ok: true }` if all 3 registries agree; `{ ok: false, errors }` with **all** errors collected
 * (not first-fail) so IAPError message lists every drift point.
 *
 * Drift semantics per check direction:
 *   - missing handler: catalog entry 的 internalRef 解析后无 handler 注册 (orphan catalog)
 *   - missing strategy: catalog entry 无对应 strategy key (orphan catalog)
 *   - orphan handler: probeRegistry 注册 type 但无 catalog entry 引用 (dead handler)
 *   - orphan strategy: PROBE_VERDICT_STRATEGIES 注册 key 但无 catalog entry 引用 (dead strategy)
 */
export function assertRegistryConsistency(): RegistryConsistencyResult {
  const errors: string[] = []

  const catalogHandlerKeys = new Set<string>()
  const catalogSemanticNames = new Set<string>()

  for (const entry of PROBE_CATALOG) {
    catalogSemanticNames.add(entry.semanticName)
    const hKey = handlerKeyFromRef(entry.internalRef)
    if (!hKey) {
      errors.push(`catalog entry "${entry.semanticName}" internalRef "${entry.internalRef}" failed to resolve`)
      continue
    }
    catalogHandlerKeys.add(hKey)
    const stripped = stripPrefix(entry.internalRef)
    if (!hasProbeHandler(hKey) && !hasProbeHandler(stripped)) {
      errors.push(
        `catalog entry "${entry.semanticName}" refs unknown handler "${hKey}" (internalRef="${entry.internalRef}")`,
      )
    }
  }

  for (const entry of PROBE_CATALOG) {
    const hKey = handlerKeyFromRef(entry.internalRef)
    if (hKey && !(hKey in PROBE_VERDICT_STRATEGIES)) {
      errors.push(`catalog entry "${entry.semanticName}" refs unknown strategy "${hKey}"`)
    }
  }

  // probe-lint reverse check: handler 反向 catalog 引用
  //   probeHandlers 注册的 type 可能是 alias (dashes form + plural form + @prj/ scope form)
  //   我们只对 canonical key (e.g. 'git_clean') vs catalogHandlerKeys 比对; alias 形式不需要报 orphan.
  //   alias 形式包括:
  //     (a) dashes form 'fs-exists' → 等价 canonical 'fs_exists'
  //     (b) plural form 'fs-exists:probes' → 等价 canonical 'fs_exists'
  //     (c) @oxn/probes/<x> form (来自 catalog internalRef 翻译)
  //     (d) @prj/probes/<x> form (RFC-0015 D4.2 后新增; OXN-internal probes 走 @prj/)
  //     (e) 老 alias 'exec-exit-zero' → shell_exec (v1.1 兼容期)
  const aliasForms = new Set<string>([
    'exec-exit-zero', // v1.1 老 alias → shell_exec (migrate-probe-refs 已迁)
  ])
  for (const regType of probeRegistry.getRegisteredTypes()) {
    if (catalogHandlerKeys.has(regType)) continue
    if (catalogSemanticNames.has(regType)) continue
    if (aliasForms.has(regType)) continue
    if (regType.endsWith(':probes')) continue
    // RFC-0015 D4.2: @prj/probes/<x> form alias — internalRef 形态, 与 @oxn/probes/<x> 同
    if (regType.startsWith('@oxn/probes/') || regType.startsWith('@prj/probes/')) continue
    errors.push(`handler "${regType}" registered but no catalog entry references it (orphan handler)`)
  }

  for (const strategyKey of Object.keys(PROBE_VERDICT_STRATEGIES)) {
    if (catalogHandlerKeys.has(strategyKey)) continue
    const semanticAliasMap: Record<string, string> = {
      fs_exists: 'fs-exists',
      fs_not_exists: 'fs-not-exists',
      fs_match: 'fs-content-match',
      fs_parseable: 'fs-parseable',
      test_pass: 'test-pass',
      deps_resolved: 'deps-resolved',
      ts_compiles: 'ts-compiles',
      lint_check: 'lint-check',
      http_responds: 'http-responds',
      file_exports: 'file-exports',
      shell_exec: 'shell-exec',
      git_clean: 'git-clean',
      git_branch_exists: 'git-branch-exists',
      git_status_clean: 'git-status-clean',
      git_merge_feasible: 'git-merge-feasible',
      docs_build: 'docs-build',
      heading_skeleton_check: 'heading-skeleton-check',
      docs_heading_check: 'docs-heading-check',
      doc_boundary: 'doc-boundary',
      boundary_guard: 'boundary-guard',
      stale_draft_check: 'stale-draft-check',
      asset_migrate_check: 'asset-migrate-check',
      oxn_runtime_version: 'oxn-runtime-version',
      exec_exit_zero: 'shell-exec',
      exec_output_match: 'shell-exec',
    }
    const aliased = semanticAliasMap[strategyKey]
    if (aliased && (catalogSemanticNames.has(aliased) || catalogHandlerKeys.has(strategyKey))) continue
    if (strategyKey === 'exec_exit_zero' || strategyKey === 'exec_output_match') continue
    errors.push(`strategy "${strategyKey}" registered but no catalog entry references it (orphan strategy)`)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }
  return { ok: true }
}
