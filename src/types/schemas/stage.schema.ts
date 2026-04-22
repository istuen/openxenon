import { z } from 'zod'

export const StageSchema = z.object({
  id: z.string(),
  blueprintId: z.string(),
  name: z.string(),
  deps: z.array(z.string()).default([]),
  target: z.string(),
  spec: z.string(),
  action: z.string().optional(),
  proof: z.union([z.string(), z.array(z.string())]),
})

export type Stage = z.infer<typeof StageSchema>
