import { z } from 'zod'
import { isBareProbeRef, isValidProbeRef } from '../../processors/probes/namespace'
import { ProbeTypeSchema } from './probe'

export const PartRefSchema = z.string().refine(
  (val) => {
    if (isBareProbeRef(val)) {
      throw new Error(`Part ref "${val}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
    }
    return isValidProbeRef(val)
  },
  { message: 'Part ref 必须带有命名空间前缀 (oxn/、@scope/、./)' },
)

export const SemanticsSchema = z.object({
  intent: z.string(),
  useWhen: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const ParamsSchemaPropertySchema = z.object({
  type: z.union([z.enum(['string', 'number', 'boolean', 'array', 'object']), z.string()]),
  description: z.string().optional(),
  default: z.unknown().optional(),
})

export const ProbeDefinitionSchema = z.object({
  ref: z.string().optional(),
  type: ProbeTypeSchema.optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  pattern: z.string().optional(),
  command: z.string().optional(),
})

export const PartDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  _version: z.number().int().positive().optional().default(1),
  _forked_from: z.string().optional(),
  _extracted_from: z.string().optional(),
  description: z.string(),
  semantics: SemanticsSchema.optional(),
  props: z
    .object({
      type: z.literal('object'),
      properties: z.record(z.string(), ParamsSchemaPropertySchema),
      required: z.array(z.string()).optional(),
      default: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
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
  probes: z.array(ProbeDefinitionSchema).optional(),
  deps: z.array(z.string()).optional(),
})

export type PartDefinition = z.infer<typeof PartDefinitionSchema>
export type PartAsset = PartDefinition
export type PartRef = z.infer<typeof PartRefSchema>

export function validatePartAsset(data: unknown): PartDefinition {
  return PartDefinitionSchema.parse(data)
}
