// =============================================================================
// ImprovementSuggestion Schema (v0.5 PR-D)
//
// Intent 改进建议（audit pool entry 的结构化数据）。
//
// 数据流：
//   insight --pipeline (PR-C) → suggestion-generator → audit pool entry
//   audit pool entry (pending) → review (人类/AI)
//   review → approve (原子覆盖 Intent 资产 + 审计链) 或 reject (归档)
//
// 设计原则：
//   - 不可篡改：每次 approve/reject 写入 frozen.json (chmod 0o444)
//   - 可回滚：journal pool 记录覆盖事件（before_hash + after_hash）
//   - 防冲突：approve 时检测目标文件 hash 是否与创建时一致
// =============================================================================

import { z } from 'zod'

/** 改进建议的 status 生命周期 */
export const SuggestionStatusSchema = z.enum(['pending', 'approved', 'rejected'])
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>

/** 改进类型（修改类型）*/
export const SuggestionKindSchema = z.enum([
  'add-invariant', // 新增 invariant 到 domain
  'add-term', // 新增 term 到 domain
  'add-ban', // 新增 ban 到 domain
  'add-observe', // 在 blueprint slot 新增 observe probe
])
export type SuggestionKind = z.infer<typeof SuggestionKindSchema>

/** 改进建议的 metadata（写入 frozen.json）*/
export const ImprovementSuggestionMetaSchema = z.object({
  /** 目标类型 */
  target: z.enum(['domain', 'blueprint']),
  /** 目标名称（domain 名 / blueprint 名）*/
  targetName: z.string(),
  /** 目标文件相对路径（用于 approve 时定位）*/
  targetPath: z.string(),
  /** 改进类型 */
  kind: SuggestionKindSchema,
  /** 改进的源代码片段（追加到目标文件的内容）*/
  patch: z.string(),
  /** 改进来源（pipeline insight 的 hash 或标题）*/
  source: z.string().optional(),
})
export type ImprovementSuggestionMeta = z.infer<typeof ImprovementSuggestionMetaSchema>

/** 改进建议的 frozen.json 完整结构（兼容现有 pool-writer 输出）*/
export const ImprovementSuggestionSchema = z.object({
  pool: z.literal('audit'),
  slug: z.string(),
  title: z.string(),
  contentLength: z.number().int().min(0),
  metadata: ImprovementSuggestionMetaSchema,
  frozenAt: z.string(),
})
export type ImprovementSuggestion = z.infer<typeof ImprovementSuggestionSchema>

/** 审批记录（追加到 frozen.json 的 metadata）*/
export const ApprovalRecordSchema = z.object({
  approvedAt: z.string(),
  approvedBy: z.string().default('operator'),
  beforeHash: z.string(),
  afterHash: z.string(),
  conflictsDetected: z.array(z.string()).default([]),
})
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>

/** 拒绝记录 */
export const RejectionRecordSchema = z.object({
  rejectedAt: z.string(),
  rejectedBy: z.string().default('operator'),
  reason: z.string(),
})
export type RejectionRecord = z.infer<typeof RejectionRecordSchema>

/** 安全校验 helper */
export function safeValidateImprovementSuggestion(
  data: unknown,
): { success: true; data: ImprovementSuggestion } | { success: false; error: z.ZodError } {
  const r = ImprovementSuggestionSchema.safeParse(data)
  return r.success ? { success: true, data: r.data } : { success: false, error: r.error }
}
