import { z } from 'zod'
import { parseProbeNamespace, isValidProbeRef, isBareProbeRef, ProbeTypeSchema } from '../../infra/loader'

export const StageRefSchema = z.string().refine(
  (val) => {
    if (isBareProbeRef(val)) {
      throw new Error(`Stage ref "${val}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
    }
    return isValidProbeRef(val)
  },
  { message: 'Stage ref 必须带有命名空间前缀 (oxn/、@scope/、./)' }
)

export const SemanticsSchema = z.object({
  intent: z.string(),
  useWhen: z.string().optional(),
  tags: z.array(z.string()).optional()
})

export const ParamsSchemaPropertySchema = z.object({
  type: z.union([z.enum(['string', 'number', 'boolean', 'array', 'object']), z.string()]),
  description: z.string().optional(),
  default: z.unknown().optional()
})

export const ProbeDefinitionSchema = z.object({
  ref: z.string().optional(),
  type: ProbeTypeSchema.optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  pattern: z.string().optional(),
  command: z.string().optional()
})

export const StageDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  semantics: SemanticsSchema.optional(),
  params_schema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), ParamsSchemaPropertySchema),
    required: z.array(z.string()).optional(),
    default: z.record(z.string(), z.unknown()).optional()
  }).optional(),
  target: z.object({
    description: z.string(),
    glob: z.string().optional()
  }).optional(),
  spec: z.object({
    description: z.string(),
    constraints: z.array(z.string()).optional()
  }).optional(),
  action: z.object({
    instruction: z.string().optional(),
    command: z.string().optional()
  }).optional(),
  probes: z.array(ProbeDefinitionSchema).optional(),
  deps: z.array(z.string()).optional()
})

export type StageDefinition = z.infer<typeof StageDefinitionSchema>
export type StageAsset = StageDefinition
export type StageRef = z.infer<typeof StageRefSchema>

export function validateStageAsset(data: unknown): StageDefinition {
  return StageDefinitionSchema.parse(data)
}

export function getNamespaceFromRef(ref: string): 'oxn' | 'scope' | 'project' | null {
  const parsed = parseProbeNamespace(ref)
  return parsed ? parsed.namespace : null
}

export function getScopeNameFromRef(ref: string): string | null {
  const parsed = parseProbeNamespace(ref)
  return parsed?.scopeName ?? null
}

export function getStageNameFromRef(ref: string): string | null {
  const parsed = parseProbeNamespace(ref)
  return parsed?.probeName ?? null
}