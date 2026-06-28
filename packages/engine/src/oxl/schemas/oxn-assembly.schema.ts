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
  { message: 'Type must be string | number | boolean | any | list<T> | map<T> | enum(...)' },
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
  align: z.string().optional(),
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
  intent: z.string().optional(),
  observe: z.array(z.string()).default([]),
  isMulti: z.boolean().default(false),
})
export type OxnAssemblySlot = z.infer<typeof OxnAssemblySlotSchema>

/** Slot Binding — Task 层对 Slot 的覆写 */
export const OxnAssemblySlotBindingSchema = z.object({
  slot: z.string().min(1),
  ref: z.string().optional(),
  props: z.record(z.string(), z.unknown()).default({}),
  align: z.string().optional(),
  probeBindings: z.array(OxnAssemblyPartProbeSchema).default([]),
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
  concreteParts: z.array(OxnAssemblyPartSchema).default([]),
  abstractParts: z.any().default([]),
})
export type OxnAssemblyIR = z.infer<typeof OxnAssemblyIRSchema>

// ========================
// v0.1-final DDD: Domain IR
// ========================

/** Term — 领域术语（替代 noun/verb） */
export const OxnTermDeclSchema = z.object({
  name: z.string().min(1),
  desc: z.string().default(''),
})
export type OxnTermDecl = z.infer<typeof OxnTermDeclSchema>

/** Invariant — 业务不变量（替代 domain_rules） */
export const OxnInvariantDeclSchema = z.object({
  value: z.string().min(1),
})
export type OxnInvariantDecl = z.infer<typeof OxnInvariantDeclSchema>

/** Domain Language — 统一语言（v0.1-final: term/ban/invariant） */
export const OxnDomainLanguageSchema = z.object({
  terms: z.array(OxnTermDeclSchema).default([]),
  ban: z.array(z.string()).default([]),
  invariant: z.array(OxnInvariantDeclSchema).default([]),
})
export type OxnDomainLanguage = z.infer<typeof OxnDomainLanguageSchema>

export const OxnDomainIRSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  language: OxnDomainLanguageSchema.optional(),
})
export type OxnDomainIR = z.infer<typeof OxnDomainIRSchema>

// ========================
// v0.1-final DDD: Work IR (work.oxn) — 统一资源池
// ========================

/** Work 层资源引用 — domain/blueprint/part/probe 统一结构 */
export const OxnWorkResourceRefSchema = z.object({
  name: z.string().min(1),
  alias: z.string().optional(),
  ref: z.string().optional(),
})
export type OxnWorkResourceRef = z.infer<typeof OxnWorkResourceRefSchema>

export const OxnWorkContextSchema = z.object({
  goal: z.string().optional(),
  constraints: z.array(z.string()).default([]),
})
export type OxnWorkContext = z.infer<typeof OxnWorkContextSchema>

/** v0.4.1: loopPolicy 移出 WorkContext, 独立 work-level */
export const OxnWorkLoopPolicySchema = z
  .object({
    maxIterations: z.number().int().min(1).default(3),
  })
  .optional()

/** Task 内 Part 声明 */
export const OxnTaskPartDeclSchema = z.object({
  name: z.string().min(1),
  skillContext: z.string().optional(),
  probes: z.array(z.any()).default([]),
})
export type OxnTaskPartDecl = z.infer<typeof OxnTaskPartDeclSchema>

/** Task IR (v0.1-final: 声明式对齐) */
export const OxnTaskIRSchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  blueprint: z.string().optional(),
  parts: z.array(OxnTaskPartDeclSchema).default([]),
  deps: z.array(z.string()).default([]).optional(),
})
export type OxnTaskIR = z.infer<typeof OxnTaskIRSchema>

/** Work IR (v0.1-final: 统一资源池 + Task 编排) */
export const OxnWorkIRSchema = z.object({
  name: z.string().min(1),
  context: OxnWorkContextSchema.optional(),
  loopPolicy: OxnWorkLoopPolicySchema,
  domains: z.array(OxnWorkResourceRefSchema).default([]),
  blueprints: z.array(OxnWorkResourceRefSchema).default([]),
  parts: z.array(OxnWorkResourceRefSchema).default([]),
  probes: z.array(OxnWorkResourceRefSchema).default([]),
  tasks: z.array(OxnTaskIRSchema).default([]),
})
export type OxnWorkIR = z.infer<typeof OxnWorkIRSchema>

// ========================
// Assembly Bundle (资产包)
// ========================

export const OxnAssemblyBundleEntitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('probe'), data: OxnAssemblyProbeSchema }),
  z.object({ type: z.literal('part'), data: OxnAssemblyPartSchema }),
  z.object({ type: z.literal('blueprint'), data: OxnAssemblyIRSchema }),
  z.object({ type: z.literal('domain'), data: OxnDomainIRSchema }),
  z.object({ type: z.literal('work'), data: OxnWorkIRSchema }),
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
    concreteParts: [],
    abstractParts: [],
  }
}

export function createOxnDomainIR(params: { name: string; description?: string }): OxnDomainIR {
  return {
    name: params.name,
    ...(params.description !== undefined ? { description: params.description } : {}),
    language: { terms: [], ban: [], invariant: [] },
  }
}

export function createOxnTaskIR(params: { name: string }): OxnTaskIR {
  return {
    name: params.name,
    parts: [],
    deps: [],
  }
}

export function createOxnWorkIR(params: { name: string }): OxnWorkIR {
  return {
    name: params.name,
    domains: [],
    blueprints: [],
    parts: [],
    probes: [],
    tasks: [],
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

export function validateOxnDomainIR(data: unknown): OxnDomainIR {
  return OxnDomainIRSchema.parse(data)
}

export function safeValidateOxnDomainIR(
  data: unknown,
): { success: true; data: OxnDomainIR } | { success: false; error: z.ZodError } {
  const result = OxnDomainIRSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateOxnTaskIR(data: unknown): OxnTaskIR {
  return OxnTaskIRSchema.parse(data)
}

export function safeValidateOxnTaskIR(
  data: unknown,
): { success: true; data: OxnTaskIR } | { success: false; error: z.ZodError } {
  const result = OxnTaskIRSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateOxnWorkIR(data: unknown): OxnWorkIR {
  return OxnWorkIRSchema.parse(data)
}

export function safeValidateOxnWorkIR(
  data: unknown,
): { success: true; data: OxnWorkIR } | { success: false; error: z.ZodError } {
  const result = OxnWorkIRSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
