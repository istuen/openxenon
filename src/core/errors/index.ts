// =============================================================================
// Errors Barrel (v1.0 — 双轨制错误体系)
//
// 跨 IAP 错误码 SSOT —— 任何模块都可以从这里 import：
//   - IAPError / IAPAction / IAPAxis / IAPErrorCode   (业务流，AI 消费)
//   - OXNCrash / OXNCrashCode                         (引擎崩溃，人类消费)
//
// 设计原则（最终版）：
//   - 不做"集中注册表"（简单 string 联合 + enum 足够）
//   - 不做"基类层级"（IAPError 与 OXNCrash 互不依赖）
//   - 不做"目录重组"（保留 src/{kernel,infra,...}/ 物理结构）
//   - IAPError 与 OXNCrash 消费者不同（AI vs 人类），进程行为不同（exit 1 vs 2）
// =============================================================================

export { IAPError, IAPAction, isIAPError } from './iap-error'
export type { IAPAxis, IAPErrorCode, IAPErrorContext } from './iap-error'

export { OXNCrash, isOXNCrash } from './oxn-crash'
export type { OXNCrashCode } from './oxn-crash'
