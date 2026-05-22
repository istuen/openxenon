import { z } from 'zod'
// eslint-disable-next-line no-restricted-imports -- TODO(Phase-3): move ProbeTypeSchema and validator fns to kernel/schemas/probe.ts
import { isValidProbeRef, isBareProbeRef, ProbeTypeSchema } from '../../infra/loader'

export const ProbeInvocationSchema = z
  .object({
    type: ProbeTypeSchema,
    ref: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    pattern: z.string().optional(),
    patterns: z.array(z.string()).optional(),
    command: z.string().optional(),
    cwd: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.ref !== undefined) {
        if (isBareProbeRef(data.ref)) {
          throw new Error(`Probe ref "${data.ref}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
        }
        if (!isValidProbeRef(data.ref)) {
          throw new Error(`Probe ref "${data.ref}" 格式无效`)
        }
      }
      return true
    },
    { message: 'Probe ref 必须带有命名空间前缀' },
  )

export type Probe = z.infer<typeof ProbeInvocationSchema>

export const SlotDefinitionSchema = z.object({
  name: z.string(),
  default: z.string().optional(),
  description: z.string().optional(),
})

export type SlotDefinition = z.infer<typeof SlotDefinitionSchema>

export const SlotInvocationSchema: z.ZodType<{
  name: string
  inline?: boolean
  target?: Record<string, unknown>
  action?: Record<string, unknown>
  spec?: Record<string, unknown>
  probes?: Array<Record<string, unknown>>
}> = z
  .union([
    z.string(),
    z.object({
      name: z.string(),
      inline: z.boolean().optional(),
      target: z.object({ description: z.string(), glob: z.string().optional() }).optional(),
      action: z.object({ instruction: z.string().optional(), command: z.string().optional() }).optional(),
      spec: z.object({ description: z.string(), constraints: z.array(z.string()).optional() }).optional(),
      probes: z.array(ProbeInvocationSchema).optional(),
    }),
  ])
  .transform((val) => {
    if (typeof val === 'string') {
      return { name: val, inline: false }
    }
    const { inline, ...rest } = val
    return { ...rest, name: val.name, inline: inline ?? false }
  })

export type SlotInvocation = z.infer<typeof SlotInvocationSchema>

export const PartInvocationSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    _version: z.number().int().positive().optional().default(1),
    min_version: z.number().int().positive().optional(),
    _depHash: z.string().optional(),
    deps: z.array(z.string()).default([]),
    ref: z.string().optional(),
    slot: z.string().optional(),
    condition: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    target: z
      .object({
        description: z.string(),
        glob: z.string().optional(),
      })
      .optional(),
    spec: z
      .object({
        description: z.string(),
        constraints: z.array(z.string()).optional(),
      })
      .optional(),
    action: z
      .object({
        instruction: z.string().optional(),
        command: z.string().optional(),
      })
      .optional(),
    probes: z.array(ProbeInvocationSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.condition !== undefined) {
        const hasRuntimeVar = /\?\s*['"]/.test(data.condition) || /\?\s*"/.test(data.condition)
        if (hasRuntimeVar) {
          throw new Error('condition 不允许包含三元表达式等运行时逻辑')
        }
      }
      if (data.ref !== undefined && data.slot !== undefined) {
        throw new Error('Part 不能同时包含 ref 和 slot')
      }
      return true
    },
    { message: 'ref 和 slot 互斥' },
  )

export type Part = z.infer<typeof PartInvocationSchema>

export const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  _version: z.number().int().positive().optional().default(1),
  status: z.enum(['DRAFT', 'CANONICAL', 'ABANDONED']).default('CANONICAL'),
  props: z
    .record(
      z.string(),
      z.object({
        type: z.string().default('string'),
        required: z.boolean().default(false),
        default: z.unknown().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  slots: z.record(z.string(), z.union([z.string(), SlotInvocationSchema])).optional(),
  parts: z.array(PartInvocationSchema).optional(),
  topology: z.array(z.string()).optional(),
  edges: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  source: z.string().optional(),
})

export type Blueprint = z.infer<typeof BlueprintSchema>

export function parseBlueprint(data: unknown): Blueprint {
  return BlueprintSchema.parse(data)
}

export function safeParseBlueprint(
  data: unknown,
): { success: true; data: Blueprint } | { success: false; error: z.ZodError } {
  const result = BlueprintSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function hasValidProbeRefs(part: Part): boolean {
  const allProbes = [...(part.probes || [])]
  return allProbes.every((p) => !p.ref || isValidProbeRef(p.ref))
}

export function extractTemplateVariables(action: { instruction?: string; command?: string } | undefined): string[] {
  if (!action) return []
  const templatePattern = /\{\{([^}]+)\}\}/g
  const vars: string[] = []
  const text = action.instruction || action.command || ''
  let match
  while ((match = templatePattern.exec(text)) !== null) {
    if (match[1]) {
      vars.push(match[1].trim())
    }
  }
  return vars
}

export type TemplateVariableScope = 'params' | 'task' | 'part' | 'env'

export const ALLOWED_VARIABLE_SCOPES: TemplateVariableScope[] = ['params', 'task', 'part']

function validateTemplateVariables(
  vars: string[],
  allowedScopes: TemplateVariableScope[],
): { valid: boolean; invalidVars: string[] } {
  const invalidVars = vars.filter((v) => {
    const scope = v.split('.')[0]
    return scope && !allowedScopes.includes(scope as TemplateVariableScope)
  })
  return { valid: invalidVars.length === 0, invalidVars }
}

export function validatePartTemplates(part: Part): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const vars = extractTemplateVariables(part.action)

  const validation = validateTemplateVariables(vars, ALLOWED_VARIABLE_SCOPES)
  if (!validation.valid) {
    errors.push(`action 模板包含不允许的变量: ${validation.invalidVars.join(', ')}`)
  }

  const hasEnvVar = vars.some((v) => v.startsWith('env.'))
  if (hasEnvVar) {
    errors.push('action 模板禁止使用 env.* 变量')
  }

  if (part.condition) {
    const conditionVars = extractTemplateVariables({ instruction: part.condition })
    const condValidation = validateTemplateVariables(conditionVars, ALLOWED_VARIABLE_SCOPES)
    if (!condValidation.valid) {
      errors.push(`condition 包含不允许的变量: ${condValidation.invalidVars.join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
