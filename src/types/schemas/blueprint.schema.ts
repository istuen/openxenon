import { z } from 'zod'
import { StageSchema } from './stage.schema'

export const BlueprintSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string(),
  status: z.enum(['DRAFT', 'CANONICAL', 'SAMPLE']),
  stages: z.array(StageSchema),
})

export type Blueprint = z.infer<typeof BlueprintSchema>
