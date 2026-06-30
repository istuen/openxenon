// =============================================================================
// FrozenProof Schema (v0.1.2 Proof-First → v0.2 Sprint 3b T5 三态扩展)
//
// 物理文件: .openxenon/proofs/<name>/frozen.json
// 不可篡改性: ① chmod 0o444 写后只读；② _xenon_meta.content_hash (SHA-256) 签名
// 写权独占: 仅有 src/cli/proof-frozen-writer.ts 可以写，AI / 工程师禁手改
//
// v0.2 T5 变化:
//   - FrozenProofProbeResult 加 verdict: 3 态 ('PASSED'|'FAILED'|'INCONCLUSIVE') 必填
//   - FrozenProofProbeResult 加 interferenceFlags?: InterferenceFlag[] 可选
//   - FrozenProof.verdict 改 3 态
//   - 老 frozen.json (无 verdict/inference 字段) 读取时容错:
//     verdict 默认 'PASSED' + interferenceFlags 默认 []
// =============================================================================

import { z } from 'zod'

/** 12 项 InterferenceFlag zod enum (L0-Kernel schema 内联定义, 不依赖 io-primitive 导出) */
const InterferenceFlagZodEnum = z.enum([
  'waf_detected',
  'cdn_cache',
  'cache_path',
  'just_modified',
  'symlink',
  'detached_head',
  'shallow_clone',
  'sandbox_violation',
  'network_timeout',
  'response_truncated',
  'permission_denied',
  'unknown',
])

/** 单个 probe 的执行结果（Infra 拿事实 → Kernel 给判定） */
export const FrozenProofProbeResultSchema = z.object({
  probeName: z.string().min(1),
  ref: z.string().min(1),
  // v0.2 T5: verdict 三态（必填）— PASSED / FAILED / INCONCLUSIVE
  verdict: z.enum(['PASSED', 'FAILED', 'INCONCLUSIVE']),
  // 保留兼容字段：PASSED → true, FAILED/INCONCLUSIVE → false
  passed: z.boolean(),
  output: z.unknown().optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().int().min(0),
  // v0.2 T5: YELLOW flag 透传记录
  interferenceFlags: z.array(InterferenceFlagZodEnum).optional(),
})
export type FrozenProofProbeResult = z.infer<typeof FrozenProofProbeResultSchema>

/** 签名元数据（与 task-frozen.json 同样的 _xenon_meta 形态，保持一致） */
export const FrozenProofXenonMetaSchema = z.object({
  frozen_at: z.string().min(1),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/, 'content_hash must be a 64-char hex SHA-256'),
})
export type FrozenProofXenonMeta = z.infer<typeof FrozenProofXenonMetaSchema>

/** Proof 判决书（frozen.json 的根对象） */
export const FrozenProofSchema = z.object({
  name: z.string().min(1),
  runAt: z.string().min(1),
  // v0.2 T5: verdict 三态（必填）— PASSED / FAILED / INCONCLUSIVE
  verdict: z.enum(['PASSED', 'FAILED', 'INCONCLUSIVE']),
  totalCount: z.number().int().min(0),
  passedCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  probes: z.array(FrozenProofProbeResultSchema),
  _xenon_meta: FrozenProofXenonMetaSchema,
})
export type FrozenProof = z.infer<typeof FrozenProofSchema>

/** frozen.json 内容（不含 _xenon_meta）— 用于签名时序列化 */
export type FrozenProofBody = Omit<FrozenProof, '_xenon_meta'>

/** 验证 helper */
export function validateFrozenProof(data: unknown): FrozenProof {
  return FrozenProofSchema.parse(data)
}

export function safeValidateFrozenProof(
  data: unknown,
): { success: true; data: FrozenProof } | { success: false; error: z.ZodError } {
  const r = FrozenProofSchema.safeParse(data)
  return r.success ? { success: true, data: r.data } : { success: false, error: r.error }
}
