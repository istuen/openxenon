// =============================================================================
// OXNCrash (v1.0 — 双轨制错误体系 轨道 2)
//
// 哲学契约：OXN 引擎自身崩溃 / 底线被击穿
//   - 消费者：人类工程师（CLI stderr 走 stack trace）
//   - 进程行为：立即崩溃，exit 2
//   - 绝不给 AI：AI 看到 OXN 崩溃信息会去"修 Bug"，掩盖真实问题 → 反而有害
//
// 双轨对比：
//   - IAPError: 业务流阻断（可恢复）        → exit 1 + stdout JSON
//   - OXNCrash: 引擎自身崩溃（不可恢复）    → exit 2 + stderr stack
//   - 其他:    用户输入错 / 兜底 = Crash     → exit 1/2 分流
// =============================================================================

/**
 * OXN 引擎崩溃码（3 个 —— 字典已精修到极致）。
 *   - SIGNATURE_MISMATCH: frozen.json 签名被外部篡改（防线击穿）
 *   - STATE_CORRUPT:      .openxenon 状态机损坏
 *   - INTERNAL_ERROR:      代码未覆盖的死角（Bug）
 *
 * 注意：TAMPER_DETECTED 与 SIGNATURE_MISMATCH 合并（都是 frozen.json 防线被击穿）
 */
export type OXNCrashCode = 'SIGNATURE_MISMATCH' | 'STATE_CORRUPT' | 'INTERNAL_ERROR'

/**
 * OXNCrash: OXN 引擎崩溃
 *   - 抛出者：src/{core,proof,daemon}/ 引擎内部（不应由业务模块抛）
 *   - 消费者：CLI 顶层 catch → stderr + exit 2（绝不走 stdout JSON）
 *   - 错误名格式：`OXN_CRASH_<CODE>`（如 `OXN_CRASH_SIGNATURE_MISMATCH`）
 *
 * cause 字段：ES2022 standard Error.cause，用于包装原始底层异常
 */
export class OXNCrash extends Error {
  public readonly name: string
  public readonly code: OXNCrashCode
  public readonly cause?: Error

  constructor(code: OXNCrashCode, message: string, cause?: Error) {
    super(message)
    this.code = code
    this.cause = cause
    // 错误名格式: OXN_CRASH_<CODE>
    this.name = `OXN_CRASH_${code}` as const
    // 保持原型链正确
    Object.setPrototypeOf(this, OXNCrash.prototype)
  }
}

/**
 * 类型守卫：判断一个值是否为 OXNCrash。
 * 用于 CLI 顶层 catch 块（区分 OXNCrash / IAPError / 其他 Error）。
 */
export function isOXNCrash(err: unknown): err is OXNCrash {
  return err instanceof OXNCrash
}
