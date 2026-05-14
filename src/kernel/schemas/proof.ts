import { z } from 'zod'
import { ProbeInvocationSchema } from './probe'
import { isValidProbeRef, isBareProbeRef } from '../../infra/loader'

export const ProofInvocationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  target: z.string(),
  spec: z.string().optional(),
  action: z.string().optional(),
  probeRefs: z.array(ProbeInvocationSchema).optional()
})

export type ProofInvocation = z.infer<typeof ProofInvocationSchema>

export function validateProofInvocation(data: unknown): ProofInvocation {
  return ProofInvocationSchema.parse(data)
}

const ProbeRefWithNamespaceSchema = z.object({
  ref: z.string().refine(
    (val) => {
      if (isBareProbeRef(val)) {
        throw new Error(`Probe ref "${val}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
      }
      return isValidProbeRef(val)
    },
    {
      message: `Probe ref 必须带有命名空间前缀 (oxn/、@scope/、./)，当前值不含有效前缀`
    }
  ),
  description: z.string(),
  params: z.record(z.string(), z.unknown()).optional()
})

export const ProbeRefSchema = ProbeRefWithNamespaceSchema

export const ProofDefinitionSchema = z.object({
  target: z.object({
    description: z.string()
  }),
  spec: z.object({
    description: z.string(),
    constraints: z.array(z.string()).optional()
  }),
  probes: z.array(ProbeRefSchema)
})

export type ProofDefinition = z.infer<typeof ProofDefinitionSchema>

export function validateProofDefinition(data: unknown): ProofDefinition {
  return ProofDefinitionSchema.parse(data)
}

export type Proof = z.infer<typeof ProofInvocationSchema>

export function validateProof(data: unknown): Proof {
  return ProofInvocationSchema.parse(data)
}
