import { z } from 'zod'

export const StageSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  proof: z.string(),
  deps: z.array(z.string()).optional()
})

export type Stage = z.infer<typeof StageSchema>

export function validateStage(data: unknown): Stage {
  return StageSchema.parse(data)
}