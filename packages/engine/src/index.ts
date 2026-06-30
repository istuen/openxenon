/**
 * OXN Engine — 统一 API 出口 (v0.6 清理后)
 *
 * v0.6 清理: 移除 Align/Intent/Insight namespaces
 *   - Align/Intent 已删除（dead code，无外部 consumer）
 *   - Insight 简化为单文件 insight-manager.ts（CLI 直接 import 单文件，不走 barrel）
 *   - Proof 精简为 4 个子模块 barrel
 */
export * as Asset from './Asset'
export * as Proof from './Proof'
export * as Pool from './Pool'

export const ENGINE_VERSION = '0.6.0'
export const ENGINE_STATUS = 'pr-5d-cleanup-dead-code'
