import { z } from 'zod'

export const ProofSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  target: z.string(),
  spec: z.string().optional(),
  action: z.string().optional(),
  proofs: z.array(z.string()).optional(),
  probeRefs: z.array(z.string()).optional()
})

export type Proof = z.infer<typeof ProofSchema>

export function validateProof(data: unknown): Proof {
  return ProofSchema.parse(data)
}