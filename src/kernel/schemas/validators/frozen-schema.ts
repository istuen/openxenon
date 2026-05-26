import { createHash } from 'crypto'
import { z } from 'zod'

export interface XenonMeta {
  ref: string
  resolved_from: 'kernel' | 'global' | 'project'
  original_path?: string
  frozen_at: string
  content_hash: string
  appended?: boolean
}

export const XenonMetaSchema: z.ZodType<XenonMeta> = z.object({
  ref: z.string(),
  resolved_from: z.enum(['kernel', 'global', 'project']),
  original_path: z.string().optional(),
  frozen_at: z.string(),
  content_hash: z.string(),
  appended: z.boolean().optional(),
})

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function createXenonMeta(params: {
  ref: string
  resolvedFrom: 'kernel' | 'global' | 'project'
  originalPath?: string
  content: string
}): XenonMeta {
  return {
    ref: params.ref,
    resolved_from: params.resolvedFrom,
    original_path: params.originalPath,
    frozen_at: new Date().toISOString(),
    content_hash: computeContentHash(params.content),
  }
}

export const FrozenProbeSchema = z.object({
  _xenon_meta: XenonMetaSchema,
  type: z.string().optional(),
  ref: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  pattern: z.string().optional(),
  command: z.string().optional(),
})

export const FrozenPartSchema = z.object({
  _xenon_meta: XenonMetaSchema,
  id: z.string(),
  name: z.string(),
  _version: z.number().int().positive().optional(),
  deps: z.array(z.string()).default([]),
  ref: z.string().optional(),
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
  probes: z.array(FrozenProbeSchema),
})

export const FrozenBlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  _version: z.number().int().positive().optional(),
  frozen_at: z.string(),
  parts: z.array(FrozenPartSchema),
  slots: z
    .array(
      z.object({
        name: z.string(),
        deps: z.array(z.string()).default([]),
        isMulti: z.boolean().default(false),
      }),
    )
    .optional(),
})

export type FrozenBlueprint = z.infer<typeof FrozenBlueprintSchema>
export type FrozenPart = z.infer<typeof FrozenPartSchema>
export type FrozenProbe = z.infer<typeof FrozenProbeSchema>

export function validateFrozenBlueprint(data: unknown): FrozenBlueprint {
  return FrozenBlueprintSchema.parse(data)
}
