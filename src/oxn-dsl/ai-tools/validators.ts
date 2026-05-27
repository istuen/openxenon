/**
 * AI Tools Zod Validators
 * 由 ai-tools-generator 自动生成
 */

import { z } from 'zod'

export const AddProbeToPartSchema = z.object({
  blueprint_name: z.string(),
  part_name: z.string(),
  probe_config: z.object({
    name: z.string(),
    type: z.enum(['HttpProbe', 'ShellProbe', 'FsProbe']),
    ref: z.string().optional(),
    params: z.record(z.string(), z.string()).optional(),
  }),
})

export const validators = {
  add_probe_to_part: AddProbeToPartSchema,
}
