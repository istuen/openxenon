// =============================================================================
// Errors Barrel (v1.1 — IAPError 物理归位)
//
// 跨 IAP 错误码 SSOT —— 任何模块都可以从这里 import：
//   - IAPError / IAPAction / IAPAxis / IAPErrorCode   (业务流，AI 消费)
//     ↑ 真身在 src/kernel/contracts/iap-error.ts (L0-Contract)
//       本文件 re-export 以保持 L3 现有 import 路径不破
//   - OXNCrash / OXNCrashCode                         (引擎崩溃，人类消费)
//   - isCliInputError                                (用户输入错，第三种隐式类型)
//
// v1.1 (v0.1.4 L0 审计 PR-B)：
//   IAPError 家族从 src/core/errors/iap-error.ts 物理迁移到
//   src/kernel/contracts/iap-error.ts。理由：IAPError 是 IAP 范式
//   （Intent-Align-Proof）核心数据契约，物理应属 L0-Contract；
//   原本放 L3-CLI 导致 L0-Processor 反而依赖 L3（物理反向）。
//
// 设计原则（最终版）：
//   - 不做"集中注册表"（简单 string 联合 + enum 足够）
//   - 不做"基类层级"（IAPError 与 OXNCrash 互不依赖）
//   - IAPError 与 OXNCrash 消费者不同（AI vs 人类），进程行为不同（exit 1 vs 2）
// =============================================================================

export { IAPError, IAPAction, isIAPError } from '@openxenon/engine/kernel/index'
export type { IAPAxis, IAPErrorCode, IAPErrorContext } from '@openxenon/engine/kernel/index'

export { OXNCrash, isOXNCrash } from './oxn-crash'
export type { OXNCrashCode } from './oxn-crash'

export { isCliInputError } from './cli-input-error'
