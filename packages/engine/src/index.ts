/**
 * OXN Engine — 统一 API 出口
 *
 * v0.6 阶段说明：当前 src/ 物理结构尚未完成 Monorepo 迁移。
 * 本文件作为 Engine package 的对外 API 占位，
 * 等迁移完成（src/{kernel,oxl,infra,Asset,Intent,Align,Proof,Insight,Pool,daemon}.ts 全部就位）后切换为：
 *
 *   export * as Asset from './Asset'
 *   export * as Intent from './Intent'
 *   ...
 *   export { startDaemon } from './daemon'
 *
 * 当前为 placeholder，避免 Monorepo 阶段破坏 v0.4/v0.5 调用方。
 */

export const ENGINE_VERSION = '0.6.0'
export const ENGINE_STATUS = 'monorepo-skeleton'
