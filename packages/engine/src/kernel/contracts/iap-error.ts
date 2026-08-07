// =============================================================================
// IAPError (v1.0.2 — 双轨制错误体系 轨道 1)
//
// 哲学契约：IAP 业务流转中的"预期内阻断"
//   - 消费者：AI Agent（按 action 字段决策下一步）
//   - 进程行为：继续运行，exit 1，stdout JSON 输出
//   - 跨轴纯化：仅 INTENT / ALIGN / PROOF 三个 IAP 主权轴，无 X（无 Sovereign）
//
// 字段语义：
//   - axis:    哪个 IAP 轴抛的（语义层级用，CLI 输出时给 AI 维度感）
//   - code:    具体原因（与 axis 组合成 'IAP_<AXIS>_<CODE>' 全名）
//   - action:  AI 下一步动作（只有 2 种，无 HARD_HALT —— HARD_HALT 是 OXNCrash 概念）
//   - context: 机器可读上下文（test / debug / telemetry 消费）
// =============================================================================

/**
 * AI 行动策略（2 选 1）。
 * 没有 HARD_HALT —— 那属于 OXNCrash（引擎崩溃），不属于业务流转。
 */
export enum IAPAction {
  /** AI 根据上下文自行修正代码 / 换路径 / 改参数后重试 */
  AUTONOMOUS_RETRY = 'AUTONOMOUS_RETRY',
  /** AI 停止当前任务，把控制权交回人类（环境/需求问题 AI 修不了） */
  YIELD_TO_HUMAN = 'YIELD_TO_HUMAN',
}

/** IAP 四主权轴（无 X —— X 是 OXNCrash 的领域，不在此） */
export type IAPAxis = 'INTENT' | 'ALIGN' | 'PROOF' | 'INFRA'

/**
 * 错误码字典 —— TypeScript 字符串字面量联合。
 * 编译器拒绝拼写错误 + IDE 自动补全合法值。
 *
 * INFRA_FAIL 子码（4 个，ADR-0080 §D4d）：
 *   INFRA_FAIL_STATE_LOAD    — ALIGN: Work/Task state.json 加载失败
 *   INFRA_FAIL_FROZEN_WRITE  — PROOF: frozen.json 写入失败
 *   INFRA_FAIL_PROBE_CATALOG — PROOF: Probe catalog 未知/输入缺失/类型不匹配
 *   INFRA_FAIL_INSIGHT_TARGET — INFRA: Insight 目标文件不存在
 *
 * 裸码 INFRA_FAIL 为 deprecated fallback（ADR-0080 §D4d），新代码必须使用子码。
 *
 * FINALIZE_BLOCKED（ADR-0080 §D4e）：
 *   PROOF 轴强制机制——finalize 因验证结果（DEVIATED/MANUAL_PENDING/INCONCLUSIVE）未通过而阻断。
 *   context.outcome 携带具体验证结果类型。
 */
export type IAPErrorCode =
  | 'INFRA_FAIL_STATE_LOAD'
  | 'INFRA_FAIL_FROZEN_WRITE'
  | 'INFRA_FAIL_PROBE_CATALOG'
  | 'INFRA_FAIL_INSIGHT_TARGET'
  | 'INFRA_FAIL'
  | 'CRASH'
  | 'CHECKLIST_MISSING'
  | 'UNDEFINED_TERM'
  | 'NAME_FILE_MISMATCH'
  | 'PROVIDER_DUPLICATE'
  | 'PROVIDER_UNSUPPORTED'
  | 'SANDBOX_REJECTED'
  | 'PROBE_INVALID'
  | 'PROBE_CORRUPTED'
  | 'PROBE_MISSING'
  | 'PROBE_FIX_UNAVAILABLE'
  | 'INGEST_SCHEMA_INVALID'
  | 'PATH_CONFLICT'
  | 'KIND_UNSUPPORTED'
  | 'REFERENCE_PREFIX_INVALID'
  | 'ASSET_HAS_REFS'
  | 'FORCE_REQUIRED'
  | 'INCOMPLETE_ASSET_PAPER'
  | 'PROBE_OUT_OF_BOUNDARY'
  | 'TASK_DAG_VIOLATES_SLOT'
  | 'FINALIZE_BLOCKED'
  | 'PROBE_REGISTRY_DRIFT'
  // 🆕 v0.7+ Blueprint Context Template (design-blueprint-context-template Draft 2026-08-06)
  | 'SCOPE_VIOLATION'
  | 'CONTEXT_MISSING'
  // 🆕 v0.7.4 stack-operation-referent (RFC-0024 §实施 work-validator 校验 + design-stack-operation-followup Draft 2026-08-07)
  | 'OPERATION_NOT_FOUND'
  | 'OPERATION_AMBIGUOUS'

export interface IAPErrorContext {
  readonly [key: string]: unknown
}

/**
 * IAPError: IAP 业务流异常
 *   - 抛出者：src/{intent,align,proof}/ 任意模块
 *   - 消费者：CLI（exit 1 + JSON stdout）→ AI Skill
 *   - 错误名格式：
 *     - 常规码：`IAP_<AXIS>_<CODE>`（如 `IAP_PROOF_PROBE_CORRUPTED`）
 *     - INFRA_FAIL 子码：`INFRA_FAIL_<SPECIFIC>`（如 `INFRA_FAIL_STATE_LOAD`，不带 IAP_ 前缀）
 */
export class IAPError extends Error {
  public readonly name: string
  public readonly axis: IAPAxis
  public readonly code: IAPErrorCode
  public readonly action: IAPAction
  public readonly context?: IAPErrorContext

  constructor(axis: IAPAxis, code: IAPErrorCode, action: IAPAction, message: string, context?: IAPErrorContext) {
    super(message)
    this.axis = axis
    this.code = code
    this.action = action
    this.context = context
    // INFRA_FAIL 子码：name = code 本身（如 INFRA_FAIL_STATE_LOAD），不走 IAP_<AXIS>_<CODE> 拼接
    // 常规码：name = IAP_<AXIS>_<CODE>（如 IAP_PROOF_PROBE_CORRUPTED）
    this.name = code.startsWith('INFRA_FAIL_') ? code : (`IAP_${axis}_${code}` as const)
    Object.setPrototypeOf(this, IAPError.prototype)
  }
}

/**
 * 类型守卫：判断一个值是否为 IAPError。
 * 用于 CLI 顶层 catch 块（区分 IAPError / OXNCrash / 其他 Error）。
 */
export function isIAPError(err: unknown): err is IAPError {
  return err instanceof IAPError
}
