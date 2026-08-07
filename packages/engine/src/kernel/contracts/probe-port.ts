export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
  exitCode?: number | null
  /** v0.2 T4: Infra 层填充的信号污染标记（YELLOW 透传 / RED 短路 INCONCLUSIVE） */
  interference?: { flags: import('./io-primitive').InterferenceFlag[] }
}

export interface ProbeResult extends ProbeObservation {
  result: 'COMPLETED' | 'DEVIATED'
  params?: Record<string, unknown>
  actual?: unknown
  failureMessage?: string
  duration?: number
}

export type ProbeStrategy = (observation: ProbeObservation, params: Record<string, unknown>) => ProbeOutcome

export interface ProbeOutcome {
  /**
   * ProbeOutcome 三态（ADR-0066/0067）
   * - COMPLETED: 探测完成
   * - DEVIATED: 偏离预期
   * - INCONCLUSIVE: 信号污染（任一 RED flag 短路返回）
   */
  outcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE'
  /** 保留兼容字段：COMPLETED → true, DEVIATED/INCONCLUSIVE → false */
  passed: boolean
  message: string
  actual?: unknown
  params?: Record<string, unknown>
  duration?: number
  failureMessage?: string
  /** v0.2 T4: YELLOW flag 透传记录（无 flag 时缺省） */
  interferenceFlags?: import('./io-primitive').InterferenceFlag[]
}

export interface ProbeContextBase {
  projectRoot: string
  /** 🆕 v0.7.3 P6 (ADR-0061 §D5): Stack tools runtime injection
   *   - work-context-builder 从 Blueprint.use.stack 加载
   *   - ProbeRunner 透传到 ProbeContext
   *   - L1 probe handlers 可读取 stackTools 按 tool.name 匹配派生 env 元数据
   *     (version / command / config / role)
   *   - 缺省 undefined（无 Stack 注入场景）
   */
  stackTools?: StackToolInfo[]
  /** 🆕 v0.6.2 (RFC-0015 D6.4): Engine version 注入
   *   - ProbeRunner 从 packages/engine/package.json 读取并注入
   *   - L1 probe handler（如 oxn-runtime-version）可读 context.engineVersion
   *   - 避免在 handler 内 import.meta.url 路径上溯（强耦合 engine 物理布局）
   *   - 缺省 undefined（无 Engine version 注入场景，handler 应降级）
   */
  engineVersion?: string
}

/**
 * 🆕 v0.7.3 P6 (RFC v0.7.3 §2.3 + ADR-0061 §D5):
 * Stack tool 的最小可消费快照。从 .md Stack 文件的 `### tool-name` 段提取的 key-value props。
 *
 * 设计要点：
 *   - 定义在 L0-Contract（Kernel），L0-Processor / L1 / L2 / L3 都可 import
 *   - L0 不依赖 L2 Stack Asset —— 此处只是数据契约，不引入 Asset 层实体
 *   - Probe handler 可按 `tool.name` 匹配（如 'bun' / 'typescript'）做 merge
 */
export interface StackToolInfo {
  name: string
  version?: string
  command?: string
  config?: string
  role?: string
  desc?: string
  /**
   * 🆕 v0.7.4 stack-operation-referent (design-stack-operation-referent Draft 2026-08-07):
   * Tool 的命名调用声明列表。Blueprint slot.operate 引用 operation.name；
   * work-context-builder 在 lock 期解析后注入 WorkContextResult.slotOperations。
   * Operation 是 AI Agent 的执行参照（OXN 不替 AI 跑），与 Probe 验证参照正交。
   */
  operations?: StackOperationInfo[]
}

/**
 * Stack Tool 的命名调用声明（name + command + desc）。
 * 来自 Stack .md 文件 `## Tools ### <tool>` 下的 `operations` 子段解析。
 */
export interface StackOperationInfo {
  name: string
  command: string
  desc?: string
}

export interface ProbeDefinition {
  type: string
  params: Record<string, unknown>
  expected?: unknown
}

export type ProbeHandler = (params: Record<string, unknown>, context: ProbeContextBase) => Promise<ProbeObservation>

// RFC-0015 D3.1: PROBE_STRATEGY_MAPPINGS + ProbeStrategyMapping 已删除
// 原 15 项硬编码表已废弃（grep 0 引用），catalog 现在是 SSOT（assertRegistryConsistency
// 跨 catalog/handler/strategy 3-way check），迁移工具见 src/cli/migrate-probe-refs.ts。
