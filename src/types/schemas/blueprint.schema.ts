import { z } from 'zod'

export const BlueprintSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string(),
  status: z.enum(['DRAFT', 'CANONICAL', 'SAMPLE', 'ABANDONED']),
  createdAt: z.string().datetime(),
})

export type Blueprint = z.infer<typeof BlueprintSchema>
