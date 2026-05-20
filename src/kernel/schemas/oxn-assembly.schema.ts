import { z } from 'zod'

// ========================
// Primitive Type System
// ========================

/** OXN 类型引用：string | number | boolean | list<T> | map<T> | enum(...) | any */
export const OxnTypeReferenceSchema = z.string().refine(
  (val) => {
    const primitive = /^(string|number|boolean|any)$/
    const generic = /^(list|map)<.+>$/
    const enumType = /^enum\(.+\)$/
    return primitive.test(val) || generic.test(val) || enumType.test(val)
  },
  { message: '类型必须是 string | number | boolean | any | list<T> | map<T> | enum(...)' }
)
export type OxnTypeReference = z.infer<typeof OxnTypeReferenceSchema>

// ========================
// Assembly Prop (参数声明)
// ========================

export const OxnAssemblyPropSchema = z.object({
  name: z.string().min(1),
  type: OxnTypeReferenceSchema,
  required: z.boolean().default(false),
  default: z.unknown().optional(),
})
export type OxnAssemblyProp = z.infer<typeof OxnAssemblyPropSchema>

// ========================
// Assembly Probe (探针定义)
// ========================

export const OxnAssemblyProbeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  props: z.array(OxnAssemblyPropSchema).default([]),
  output: z.record(z.string(), z.string()).optional(),
})
export type OxnAssemblyProbe = z.infer<typeof OxnAssemblyProbeSchema>

// ========================
// Assembly Interface (行为契约)
// ========================

export const OxnAssemblyMethodSchema = z.object({
  name: z.string().min(1),
  input: z.record(z.string(), z.string()).optional(),
  output: z.record(z.string(), z.string()).optional(),
})
export type OxnAssemblyMethod = z.infer<typeof OxnAssemblyMethodSchema>

export const OxnAssemblyInterfaceSchema = z.object({
  name: z.string().min(1),
  methods: z.array(OxnAssemblyMethodSchema).default([]),
})
export type OxnAssemblyInterface = z.infer<typeof OxnAssemblyInterfaceSchema>

// ========================
// Assembly Part (零件 — 具象/抽象)
// ========================

/** Part 内嵌的 Probe 引用 */
export const OxnAssemblyPartProbeSchema = z.object({
  name: z.string().min(1),
  ref: z.string().optional(),         // @scope/probe/name — 保留占位符
  params: z.record(z.string(), z.unknown()).optional(), // 可能包含模板表达式
})
export type OxnAssemblyPartProbe = z.infer<typeof OxnAssemblyPartProbeSchema>

/**
 * ⚠️ OxnAssemblyPart 是 OXN DSL 的核心结构体
 *
 * isAbstract === true  → 抽象零件（占位符），存在于 Blueprint 中，由 Task binding 具象化
 * isAbstract === false → 具象零件（实现），包含 execution 和完整 probe 定义
 *
 * 防御性规则：
 * 1. abstract part 严禁包含 execution 块（AST 层拦截 + schema 校验）
 * 2. abstract part 的 params 是参数映射表达式，不是最终值
 * 3. concrete part 必须包含 execution 块
 */
export const OxnAssemblyPartSchema = z.object({
  name: z.string().min(1),
  implements: z.string().optional(),  // interface name
  description: z.string().optional(),
  /** 防御性标记：true=抽象占位符 false=具象实现 */
  isAbstract: z.boolean(),
  props: z.array(OxnAssemblyPropSchema).default([]),
  probes: z.array(OxnAssemblyPartProbeSchema).default([]),
  execution: z.array(z.string()).default([]),
}).refine(
  (part) => {
    if (part.isAbstract && part.execution.length > 0) {
      throw new Error(`抽象零件 "${part.name}" 不得包含 execution 块`)
    }
    return true
  },
  { message: '抽象零件禁止包含 execution 块' }
)
export type OxnAssemblyPart = z.infer<typeof OxnAssemblyPartSchema>

// ========================
// Assembly Stage (阶段)
// ========================

export const OxnAssemblyStageSchema = z.object({
  name: z.string().min(1),
  run: z.string(),             // part.tester.run 表示法
  deps: z.array(z.string()).default([]),
})
export type OxnAssemblyStage = z.infer<typeof OxnAssemblyStageSchema>

// ========================
// Assembly Expectation (运行时断言)
// ========================

export const OxnAssemblyExpectationSchema = z.object({
  name: z.string().min(1),
  probeRef: z.string(),        // @scope/probe/name — 保留占位符
  params: z.record(z.string(), z.unknown()).default({}),
  errMsg: z.string(),
})
export type OxnAssemblyExpectation = z.infer<typeof OxnAssemblyExpectationSchema>

// ========================
// Assembly Rule (编译期规则)
// ========================

export const OxnAssemblyRuleSchema = z.object({
  name: z.string().min(1),
  condition: z.string(),       // 条件表达式，保留字符串形式
  errMsg: z.string(),
})
export type OxnAssemblyRule = z.infer<typeof OxnAssemblyRuleSchema>

// ========================
// Assembly IR (蓝图中间表示)
// ========================

/**
 * OxnAssemblyIR — OXN 资产态中间表示
 *
 * 定位：
 * - 上接 Langium AST 生成器 (Task 1.5)
 * - 下接 Kernel 适配器 (Task 1.6)
 * - 保留模板占位符（prop refs, @scope refs, 模板表达式）
 * - 不能直接执行（须经 Frozen 转换）
 *
 * 与 FrozenBlueprint 的区别：
 * - Frozen: 零引用、零占位符、纯数据 DAG
 * - Assembly: 保留 prop/params 占位符，保留 isAbstract 标记
 */
export const OxnAssemblyIRSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  _version: z.number().int().positive().default(1),
  assembly_at: z.string(),       // ISO timestamp
  props: z.array(OxnAssemblyPropSchema).default([]),
  abstractParts: z.array(OxnAssemblyPartSchema).default([]),
  concreteParts: z.array(OxnAssemblyPartSchema).default([]),
  stages: z.array(OxnAssemblyStageSchema).default([]),
  expectations: z.array(OxnAssemblyExpectationSchema).default([]),
  rules: z.array(OxnAssemblyRuleSchema).default([]),
}).refine(
  (ir) => {
    for (const part of ir.abstractParts) {
      if (!part.isAbstract) {
        throw new Error(`抽象零件 "${part.name}" 必须设置 isAbstract = true`)
      }
    }
    return true
  },
  { message: '抽象零件的 isAbstract 必须为 true' }
).refine(
  (ir) => {
    for (const part of ir.concreteParts) {
      if (part.isAbstract) {
        throw new Error(`具象零件 "${part.name}" 不得设置 isAbstract = true`)
      }
    }
    return true
  },
  { message: '具象零件的 isAbstract 必须为 false' }
)
export type OxnAssemblyIR = z.infer<typeof OxnAssemblyIRSchema>

// ========================
// Assembly Task IR (任务绑定)
// ========================

/**
 * OxnAssemblyTaskIR — Task 绑定中间表示
 *
 * 包含：
 * - partBindings：将 Blueprint 中的 abstractPart 映射到具体 Part
 * - propBindings：注入 Blueprint props 的值
 */
export const OxnAssemblyTaskBindingSchema = z.object({
  partBindings: z.record(z.string(), z.string()).default({}),
  propBindings: z.record(z.string(), z.unknown()).default({}),
})
export type OxnAssemblyTaskBinding = z.infer<typeof OxnAssemblyTaskBindingSchema>

export const OxnAssemblyTaskIRSchema = z.object({
  name: z.string().min(1),
  use: z.string(),                // @scope/blueprint/name — 保留占位符
  binding: OxnAssemblyTaskBindingSchema,
})
export type OxnAssemblyTaskIR = z.infer<typeof OxnAssemblyTaskIRSchema>

// ========================
// Assembly Bundle (资产包)
// ========================

export const OxnAssemblyBundleEntitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('probe'), data: OxnAssemblyProbeSchema }),
  z.object({ type: z.literal('interface'), data: OxnAssemblyInterfaceSchema }),
  z.object({ type: z.literal('part'), data: OxnAssemblyPartSchema }),
  z.object({ type: z.literal('blueprint'), data: OxnAssemblyIRSchema }),
  z.object({ type: z.literal('task'), data: OxnAssemblyTaskIRSchema }),
])
export type OxnAssemblyBundleEntity = z.infer<typeof OxnAssemblyBundleEntitySchema>

export const OxnAssemblyBundleSchema = z.object({
  entities: z.array(OxnAssemblyBundleEntitySchema),
})
export type OxnAssemblyBundle = z.infer<typeof OxnAssemblyBundleSchema>

// ========================
// Helper Factories
// ========================

export function createOxnAssemblyIR(params: {
  id: string
  name: string
  version?: number
}): OxnAssemblyIR {
  return {
    id: params.id,
    name: params.name,
    _version: params.version ?? 1,
    assembly_at: new Date().toISOString(),
    props: [],
    abstractParts: [],
    concreteParts: [],
    stages: [],
    expectations: [],
    rules: [],
  }
}

export function createAbstractPart(params: {
  name: string
  implements?: string
  params?: Record<string, unknown>
}): OxnAssemblyPart {
  return {
    name: params.name,
    implements: params.implements,
    description: undefined,
    isAbstract: true,
    props: [],
    probes: [],
    execution: [],
  }
}

export function createConcretePart(params: {
  name: string
  implements?: string
  description?: string
  props?: OxnAssemblyProp[]
  probes?: OxnAssemblyPartProbe[]
  execution?: string[]
}): OxnAssemblyPart {
  return {
    name: params.name,
    implements: params.implements,
    description: params.description,
    isAbstract: false,
    props: params.props ?? [],
    probes: params.probes ?? [],
    execution: params.execution ?? [],
  }
}

// ========================
// Validation helpers
// ========================

export function validateOxnAssemblyIR(data: unknown): OxnAssemblyIR {
  return OxnAssemblyIRSchema.parse(data)
}

export function safeValidateOxnAssemblyIR(data: unknown): { success: true; data: OxnAssemblyIR } | { success: false; error: z.ZodError } {
  const result = OxnAssemblyIRSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateOxnAssemblyTaskIR(data: unknown): OxnAssemblyTaskIR {
  return OxnAssemblyTaskIRSchema.parse(data)
}
