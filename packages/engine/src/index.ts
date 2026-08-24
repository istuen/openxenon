/**
 * OXN Engine — 统一 API 出口 (v0.6 清理后)
 *
 * v0.6 清理: 移除 Align/Intent/Insight namespaces
 *   - Align/Intent 已删除（dead code，无外部 consumer）
 *   - Insight 简化为单文件 insight-manager.ts（CLI 直接 import 单文件，不走 barrel）
 * v0.6.0 (D3+D4 2026-08-07) 新增：Goal namespace（含 dev-pool-migrator）
 * v0.6.0 (D5+ 2026-08-07) 扩：Goal manager（5 op）+ Version namespace（4 op）
 *
 * RFC-0032 Phase 2 (2026-08-23): Proof namespace 随 packages/engine/src/Proof/ 删除退场。
 *   - Proof / Insight / Daemon 全部退出 (D25)
 *   - Probe 工具能力保留在 infra/probes/* 与 kernel/verdicts/{catalog,verdict}.ts
 */
export * as Asset from './Asset'
export * as Pool from './Pool'
export * as Draft from './Draft'
export * as Goal from './Goal'
export * as Version from './Version'

export const ENGINE_VERSION = '0.6.4-alpha.0'
// ENGINE_STATUS 标 RFC-0032 Phase 2 进展 (Phase 3/4/5 顺延)
export const ENGINE_STATUS = 'phase2-rfc-0032-purge'
