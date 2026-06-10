// =============================================================================
// insight-schema.ts (v0.1.2)
//
// Insight = Proof → Intent 的结构化反馈（不混入策略；AI 自己解读结论）。
//
// 物理文件: 不持久化；每次 `oxn insight` 即时计算后输出。
// 输入数据源:
//   - .openxenon/proofs/<name>/frozen.json    — 本次判决（单次）
//   - .openxenon/.cache/probe-stats.json      — 跨 proof 历史（累计）
//
// 设计原则：
//   - 以 proof 为骨架（Phase 1 只做 proof 级；work/task 维度留 Phase 2）
//   - 不发明新概念：evidenceChain 复用 frozen.probes 的 fact/conclusion
//   - emergentPatterns 是原始数据，AI 自行推导结论（不做 suggestion）
// =============================================================================

import { z } from 'zod'

// ───────── 第一层：证据 ─────────

/** 单条证据：probe 观测到的事实 + 推导的结论 */
export const EvidenceSchema = z.object({
  /** proof.oxn 中声明的 probe 名（如 'p1'） */
  probe: z.string(),
  /** 语义类型（如 'fs-exists' / 'shell-exec'） */
  probeType: z.string(),
  /** 探测目标：fs-exists 是 path，shell-exec 是 command */
  target: z.string().optional(),
  /** 观测到的事实（来自 frozen.output.verdict.message 或 verdict.actual） */
  fact: z.string(),
  /** 由 fact 推导的结论（PASSED → '满足验收'；FAILED → '验收未通过 + reason'） */
  conclusion: z.string(),
})
export type Evidence = z.infer<typeof EvidenceSchema>

// ───────── 第二层：涌现模式 ─────────

/** 涌现模式：跨 proof 重复出现的信号（AI 据此判断是否创建 Domain/Blueprint） */
export const EmergentPatternSchema = z.object({
  /** 模式类型 */
  type: z.enum([
    /** 同一 target 连续失败 ≥2 次（撞墙信号） */
    'consecutive-fail',
    /** 同一 probe type 在 ≥3 个 proof 中出现过（重复模式信号） */
    'cross-proof-repeat',
    /** 同一 probe type+target 在 ≥2 个 proof 中都失败（设计缺陷信号） */
    'cross-proof-fail-clusters',
  ]),
  probeType: z.string(),
  target: z.string().optional(),
  occurrences: z.number().int().min(1),
  /** 类型相关的扩展字段（如 consecutive-fail 的具体失败次数） */
  details: z.record(z.string(), z.unknown()),
})
export type EmergentPattern = z.infer<typeof EmergentPatternSchema>

// ───────── 第三层：历史视角 ─────────

/** 单个 probe type 在 probe-stats.json 中的视图 */
export const ProbeTypeStatsViewSchema = z.object({
  total: z.number().int().min(0),
  pass: z.number().int().min(0),
  fail: z.number().int().min(0),
  /** 连续失败 target → 次数（仅 fail > 0 的 target） */
  consecutiveFailsByTarget: z.record(z.string(), z.number().int().min(0)),
})
export type ProbeTypeStatsView = z.infer<typeof ProbeTypeStatsViewSchema>

/** 全局 probe-stats.json 的视图（Insight 内的精简版） */
export const ProbeStatsViewSchema = z.object({
  totalRuns: z.number().int().min(0),
  totalProbes: z.number().int().min(0),
  overallPassRate: z.number().min(0).max(1),
  byType: z.record(z.string(), ProbeTypeStatsViewSchema),
})
export type ProbeStatsView = z.infer<typeof ProbeStatsViewSchema>

// ───────── 根对象：Proof 级 Insight ─────────

/** Insight 根对象（Phase 1：只覆盖 proof 级） */
export const InsightSchema = z.object({
  schemaVersion: z.literal(1),
  projectRoot: z.string(),
  proofId: z.string(),
  generatedAt: z.string(),

  /** 第一层：本 proof 的 verdict 与证据 */
  proof: z.object({
    name: z.string(),
    verdict: z.enum(['PASSED', 'FAILED']),
    runAt: z.string(),
    evidenceChain: z.array(EvidenceSchema),
  }),

  /** 第二层：历史视角（来自 probe-stats.json） */
  probeStats: ProbeStatsViewSchema,

  /** 第三层：涌现模式 */
  emergentPatterns: z.array(EmergentPatternSchema),

  /** 元信息 */
  meta: z.object({
    insightVersion: z.string(),
    dataSources: z.array(z.enum(['frozen.json', 'probe-stats.json'])),
  }),
})
export type Insight = z.infer<typeof InsightSchema>

/** 安全校验 helper */
export function safeValidateInsight(
  data: unknown,
): { success: true; data: Insight } | { success: false; error: z.ZodError } {
  const r = InsightSchema.safeParse(data)
  return r.success ? { success: true, data: r.data } : { success: false, error: r.error }
}
