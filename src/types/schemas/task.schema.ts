import { z } from 'zod'
import { BlueprintSchema } from './blueprint.schema'

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'ESCAPED', 'TERMINATED']),
  activeBlueprintId: z.string().optional(),
  createdAt: z.string().datetime(),
  blueprints: z.array(BlueprintSchema),
})

export type Task = z.infer<typeof TaskSchema>
