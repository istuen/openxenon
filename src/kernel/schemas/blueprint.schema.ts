import { z } from 'zod'
import { isValidProbeRef, isBareProbeRef, ProbeTypeSchema } from '../../infra/loader'

export const ProbeInvocationSchema = z.object({
  type: ProbeTypeSchema,
  ref: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  pattern: z.string().optional(),
  patterns: z.array(z.string()).optional(),
  command: z.string().optional(),
  cwd: z.string().optional(),
}).refine(
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
  { message: 'Probe ref 必须带有命名空间前缀' }
)

export type Probe = z.infer<typeof ProbeInvocationSchema>

export const StageInvocationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  deps: z.array(z.string()).default([]),
  ref: z.string().optional(),
  condition: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  target: z.object({
    description: z.string(),
    glob: z.string().optional(),
  }).optional(),
  spec: z.object({
    description: z.string(),
    constraints: z.array(z.string()).optional(),
  }).optional(),
  action: z.object({
    instruction: z.string().optional(),
    command: z.string().optional(),
  }).optional(),
  probes: z.array(ProbeInvocationSchema).optional(),
  probes_append: z.array(ProbeInvocationSchema).optional(),
  probes_override: z.array(ProbeInvocationSchema).optional(),
}).refine(
  (data) => {
    if (data.probes_append !== undefined && data.probes_override !== undefined) {
      throw new Error('Stage 不能同时包含 probes_append 和 probes_override')
    }
    if (data.condition !== undefined) {
      const hasRuntimeVar = /\?\s*['"]/.test(data.condition) || /\?\s*"/.test(data.condition)
      if (hasRuntimeVar) {
        throw new Error('condition 不允许包含三元表达式等运行时逻辑')
      }
    }
    return true
  },
  { message: 'probes_append 和 probes_override 互斥' }
)

export type Stage = z.infer<typeof StageInvocationSchema>

export const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['DRAFT', 'CANONICAL', 'ABANDONED']).default('CANONICAL'),
  stages: z.array(StageInvocationSchema).optional(),
  topology: z.array(z.string()).optional(),
  edges: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  source: z.string().optional(),
})

export type Blueprint = z.infer<typeof BlueprintSchema>

export function parseBlueprint(data: unknown): Blueprint {
  return BlueprintSchema.parse(data)
}

export function safeParseBlueprint(data: unknown): { success: true; data: Blueprint } | { success: false; error: z.ZodError } {
  const result = BlueprintSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function hasValidProbeRefs(stage: Stage): boolean {
  const allProbes = [
    ...(stage.probes || []),
    ...(stage.probes_append || []),
    ...(stage.probes_override || [])
  ]
  return allProbes.every(p => !p.ref || isValidProbeRef(p.ref))
}

export function extractTemplateVariables(action: { instruction?: string; command?: string } | undefined): string[] {
  if (!action) return []
  const templatePattern = /\{\{([^}]+)\}\}/g
  const vars: string[] = []
  const text = (action.instruction || action.command || '')
  let match
  while ((match = templatePattern.exec(text)) !== null) {
    if (match[1]) {
      vars.push(match[1].trim())
    }
  }
  return vars
}

export type TemplateVariableScope = 'params' | 'task' | 'stage' | 'env'

export function validateTemplateVariables(
  vars: string[],
  allowedScopes: TemplateVariableScope[]
): { valid: boolean; invalidVars: string[] } {
  const invalidVars: string[] = []
  for (const v of vars) {
    const scope = v.split('.')[0] as TemplateVariableScope
    if (!allowedScopes.includes(scope)) {
      invalidVars.push(v)
    }
  }
  return { valid: invalidVars.length === 0, invalidVars }
}

export const ALLOWED_VARIABLE_SCOPES: TemplateVariableScope[] = ['params', 'task', 'stage']

export function validateStageTemplates(stage: Stage): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const vars = extractTemplateVariables(stage.action)

  const validation = validateTemplateVariables(vars, ALLOWED_VARIABLE_SCOPES)
  if (!validation.valid) {
    errors.push(`action 模板包含不允许的变量: ${validation.invalidVars.join(', ')}`)
  }

  const hasEnvVar = vars.some(v => v.startsWith('env.'))
  if (hasEnvVar) {
    errors.push('action 模板禁止使用 env.* 变量')
  }

  if (stage.condition) {
    const conditionVars = extractTemplateVariables({ instruction: stage.condition })
    const condValidation = validateTemplateVariables(conditionVars, ALLOWED_VARIABLE_SCOPES)
    if (!condValidation.valid) {
      errors.push(`condition 包含不允许的变量: ${condValidation.invalidVars.join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}