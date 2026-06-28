import { z } from 'zod'
import type { HashPort } from '../../contracts/hash-port'

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

export function computeContentHash(content: string, hashPort: HashPort): string {
  return hashPort.computeHash(content)
}

export interface CreateXenonMetaOptions {
  ref: string
  resolvedFrom: 'kernel' | 'global' | 'project'
  originalPath?: string
  content: string
  hashPort: HashPort
}

export function createXenonMeta(options: CreateXenonMetaOptions): XenonMeta {
  return {
    ref: options.ref,
    resolved_from: options.resolvedFrom,
    original_path: options.originalPath,
    frozen_at: new Date().toISOString(),
    content_hash: computeContentHash(options.content, options.hashPort),
  }
}

export const CompiledProbeSchema = z.object({
  _xenon_meta: XenonMetaSchema,
  type: z.string().optional(),
  ref: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  pattern: z.string().optional(),
  command: z.string().optional(),
})

export const CompiledPartSchema = z.object({
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
  probes: z.array(CompiledProbeSchema),
})

export const CompiledBlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  _version: z.number().int().positive().optional(),
  /** @internal 保留 frozen_at 命名以兼容已持久化的数据格式 */
  frozen_at: z.string(),
  parts: z.array(CompiledPartSchema),
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

export type CompiledBlueprint = z.infer<typeof CompiledBlueprintSchema>
export type CompiledPart = z.infer<typeof CompiledPartSchema>
export type CompiledProbe = z.infer<typeof CompiledProbeSchema>

export function validateCompiledBlueprint(data: unknown): CompiledBlueprint {
  return CompiledBlueprintSchema.parse(data)
}

export type FrozenBlueprint = CompiledBlueprint
export type FrozenPart = CompiledPart
export type FrozenProbe = CompiledProbe

export const FrozenBlueprintSchema = CompiledBlueprintSchema
export const FrozenPartSchema = CompiledPartSchema
export const FrozenProbeSchema = CompiledProbeSchema

export function validateFrozenBlueprint(data: unknown): FrozenBlueprint {
  return CompiledBlueprintSchema.parse(data)
}
