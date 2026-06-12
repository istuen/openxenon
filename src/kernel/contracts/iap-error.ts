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

/** IAP 三主权轴（无 X —— X 是 OXNCrash 的领域，不在此） */
export type IAPAxis = 'INTENT' | 'ALIGN' | 'PROOF'

/**
 * 错误码字典 —— TypeScript 字符串字面量联合。
 * 编译器拒绝拼写错误 + IDE 自动补全合法值。
 *
 * v1.0.2 字典（9 项中的 6 项，剩余 3 项属 OXNCrash）：
 *   PROOF (2):   INFRA_FAIL, CRASH
 *   ALIGN (1):   CHECKLIST_MISSING              ← v0.1: 类型已就位，throw site 留 v0.2
 *   INTENT (3):  UNDEFINED_TERM, NAME_FILE_MISMATCH  ← NAME_FILE_MISMATCH 是 macOS-safe
 *
 * 历史变更（v1.0.1 → v1.0.2）：
 *   - 移除 'TIMEOUT' | 'MISMATCH'（ALIGN 轴业务结果，走 Verdict: FAIL 通道而非异常）
 *   - 移除 'SLOT_CONFLICT'（僵尸码，validate 阶段走档 3 用户输入错通道）
 *   - 新增 'CHECKLIST_MISSING'（part.intent_checklist 必填对齐机制）
 *   - 新增 'NAME_FILE_MISMATCH'（macOS APFS case-insensitive 跨平台防御）
 *
 * 字典收敛原则（双轨制 IAPError + OXNCrash）：
 *   - IAPError 6 个：只保留"必须被看到"的真异常（结构性违规）
 *   - Verdict: FAIL 走 frozen.json.verdict 通道（业务结果，AI 自己改）
 *   - OXNCrash 3 个：引擎崩溃，人类消费，AI 永远不看
 */
export type IAPErrorCode = 'INFRA_FAIL' | 'CRASH' | 'CHECKLIST_MISSING' | 'UNDEFINED_TERM' | 'NAME_FILE_MISMATCH'

export interface IAPErrorContext {
  readonly [key: string]: unknown
}

/**
 * IAPError: IAP 业务流异常
 *   - 抛出者：src/{intent,align,proof}/ 任意模块
 *   - 消费者：CLI（exit 1 + JSON stdout）→ AI Skill
 *   - 错误名格式：`IAP_<AXIS>_<CODE>`（如 `IAP_PROOF_INFRA_FAIL`）
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
    // 错误名格式: IAP_<AXIS>_<CODE> —— 出现在 stack trace + JSON 输出中
    this.name = `IAP_${axis}_${code}` as const
    // 保持原型链正确（stack trace 中 instanceof 检测）
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
