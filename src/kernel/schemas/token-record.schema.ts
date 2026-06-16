// =============================================================================
// token-record.schema.ts (v0.2.2)
//
// Token 摄入 Schema：AI 模型每次对话轮次 Token 消耗快照。
// 一条记录 = 一个 AI 消息轮次（prompt + completion + cache）。
//
// 存储格式：JSONL（追加写入 .openxenon/insights/tokens/<workRef>.jsonl）
// 多 AI 助手会话可并发安全追加。
// =============================================================================

import { z } from 'zod'

export const TokenRecordSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.enum(['opencode', 'claude', 'manual']),
  sessionID: z.string().min(1),
  workRef: z.string().min(1),
  taskRef: z.string().optional(),
  modelID: z.string().min(1),
  providerID: z.string().min(1),
  timestamp: z.number().int().positive(),
  tokens: z.object({
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
    reasoning: z.number().int().nonnegative().optional(),
    cache: z
      .object({
        read: z.number().int().nonnegative().optional(),
        write: z.number().int().nonnegative().optional(),
      })
      .optional(),
  }),
  cost: z.number().nonnegative(),
})
export type TokenRecord = z.infer<typeof TokenRecordSchema>

export function safeValidateTokenRecord(
  input: unknown,
): { success: true; data: TokenRecord } | { success: false; error: z.ZodError } {
  const r = TokenRecordSchema.safeParse(input)
  return r.success ? { success: true, data: r.data } : { success: false, error: r.error }
}
