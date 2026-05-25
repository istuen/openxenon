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
  { message: '类型必须是 string | number | boolean | any | list<T> | map<T> | enum(...)' },
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
// Assembly Part (零件)
// ========================

/** Part 内嵌的 Probe 引用 */
export const OxnAssemblyPartProbeSchema = z.object({
  name: z.string().min(1),
  ref: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})
export type OxnAssemblyPartProbe = z.infer<typeof OxnAssemblyPartProbeSchema>

export const OxnAssemblyPartSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  props: z.array(OxnAssemblyPropSchema).default([]),
  probes: z.array(OxnAssemblyPartProbeSchema).default([]),
  execution: z.array(z.string()).default([]),
  deps: z.array(z.string()).default([]),
  ref: z.string().optional(),
})
export type OxnAssemblyPart = z.infer<typeof OxnAssemblyPartSchema>

// ========================
// Assembly Slot (插槽)
// ========================

/** Slot — Blueprint 层的插槽占位 */
export const OxnAssemblySlotSchema = z.object({
  name: z.string().min(1),
  deps: z.array(z.string()).default([]),
  isMulti: z.boolean().default(false),
})
export type OxnAssemblySlot = z.infer<typeof OxnAssemblySlotSchema>

/** Slot Binding — Task 层对 Slot 的覆写 */
export const OxnAssemblySlotBindingSchema = z.object({
  slot: z.string().min(1),
  ref: z.string().optional(),
  props: z.record(z.string(), z.unknown()).default({}),
})
export type OxnAssemblySlotBinding = z.infer<typeof OxnAssemblySlotBindingSchema>

// ========================
// Assembly Stage (阶段)
// ========================

export const OxnAssemblyStageSchema = z.object({
  name: z.string().min(1),
  run: z.string(),
  deps: z.array(z.string()).default([]),
})
export type OxnAssemblyStage = z.infer<typeof OxnAssemblyStageSchema>

// ========================
// Assembly Expectation (运行时断言)
// ========================

export const OxnAssemblyExpectationSchema = z.object({
  name: z.string().min(1),
  probeRef: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
  errMsg: z.string(),
})
export type OxnAssemblyExpectation = z.infer<typeof OxnAssemblyExpectationSchema>

// ========================
// Assembly Rule (编译期规则)
// ========================

export const OxnAssemblyRuleSchema = z.object({
  name: z.string().min(1),
  condition: z.string(),
  errMsg: z.string(),
})
export type OxnAssemblyRule = z.infer<typeof OxnAssemblyRuleSchema>

// ========================
// Assembly IR (蓝图中间表示)
// ========================

export const OxnAssemblyIRSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().default('task'),
  _version: z.number().int().positive().default(1),
  assembly_at: z.string(),
  props: z.array(OxnAssemblyPropSchema).default([]),
  slots: z.array(OxnAssemblySlotSchema).default([]),
  blueprintParts: z.array(OxnAssemblyPartSchema).default([]),
  stages: z.any().default([]),
  expectations: z.array(OxnAssemblyExpectationSchema).default([]),
  rules: z.array(OxnAssemblyRuleSchema).default([]),
  concreteParts: z.array(OxnAssemblyPartSchema).default([]),
  abstractParts: z.any().default([]),
})
export type OxnAssemblyIR = z.infer<typeof OxnAssemblyIRSchema>

// ========================
// Assembly Task IR (任务绑定)
// ========================

export const OxnAssemblyTaskIRSchema = z.object({
  name: z.string().min(1),
  use: z.string(),
  slotBindings: z.array(OxnAssemblySlotBindingSchema).default([]),
})
export type OxnAssemblyTaskIR = z.infer<typeof OxnAssemblyTaskIRSchema>

// ========================
// Assembly Bundle (资产包)
// ========================

export const OxnAssemblyBundleEntitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('probe'), data: OxnAssemblyProbeSchema }),
  z.object({ type: z.literal('part'), data: OxnAssemblyPartSchema }),
  z.object({ type: z.literal('blueprint'), data: OxnAssemblyIRSchema }),
  z.object({ type: z.literal('task'), data: OxnAssemblyTaskIRSchema }),
  z.object({ type: z.literal('work'), data: OxnAssemblyTaskIRSchema }),
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
  type?: string
}): OxnAssemblyIR {
  return {
    id: params.id,
    name: params.name,
    type: params.type || 'task',
    _version: params.version ?? 1,
    assembly_at: new Date().toISOString(),
    props: [],
    slots: [],
    blueprintParts: [],
    stages: [],
    expectations: [],
    rules: [],
    concreteParts: [],
    abstractParts: [],
  }
}

// ========================
// Validation helpers
// ========================

export function validateOxnAssemblyIR(data: unknown): OxnAssemblyIR {
  return OxnAssemblyIRSchema.parse(data)
}

export function safeValidateOxnAssemblyIR(
  data: unknown,
): { success: true; data: OxnAssemblyIR } | { success: false; error: z.ZodError } {
  const result = OxnAssemblyIRSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateOxnAssemblyTaskIR(data: unknown): OxnAssemblyTaskIR {
  return OxnAssemblyTaskIRSchema.parse(data)
}
