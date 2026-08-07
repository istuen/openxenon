/**
 * OXN Engine — 统一 API 出口 (v0.6 清理后)
 *
 * v0.6 清理: 移除 Align/Intent/Insight namespaces
 *   - Align/Intent 已删除（dead code，无外部 consumer）
 *   - Insight 简化为单文件 insight-manager.ts（CLI 直接 import 单文件，不走 barrel）
 *   - Proof 精简为 4 个子模块 barrel
 * v0.6.0 (D3+D4 2026-08-07) 新增：Goal namespace（含 dev-pool-migrator）
 * v0.6.0 (D5+ 2026-08-07) 扩：Goal manager（5 op）+ Version namespace（4 op）
 */
export * as Asset from './Asset'
export * as Proof from './Proof'
export * as Pool from './Pool'
export * as Draft from './Draft'
export * as Goal from './Goal'
export * as Version from './Version'

export const ENGINE_VERSION = '0.6.0'
export const ENGINE_STATUS = 'pr-5d-cleanup-dead-code'
