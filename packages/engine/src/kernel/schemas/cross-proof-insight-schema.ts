// =============================================================================
// CrossProofInsight Schema (v0.5 PR-B → v0.6 PR-5d 重命名)
//
// 跨多 proof 的结构化洞察（不同于 Insight 单 proof 模式）。
// 数据源：主动扫描 .openxenon/proofs/*/frozen.json 全集
//
// 4 维分析（v0.6 PR-5d 重构：维度 4 由 "probeEffectiveness" → "probeBehaviorPattern"）：
//   1. trendMatrix:        (probeType, target) 在时间轴上的 verdict 序列 + 趋势判定
//   2. correlationMatrix:  probe type 共现关系（heatmap 友好）
//   3. trends:             连续恶化/改善/波动检测
//   4. probeBehaviorPattern: 按 fail rate 排序的探针行为特征
//
// 命名重塑说明（v0.6 v1.3 拍板）：
//   - 旧名 probeEffectiveness 暗示"代码质量评分"（effectiveness = 有效性）
//   - 新名 probeBehaviorPattern 强调"AI Agent 协作行为特征"——记录客观事实，不评判代码质量
//   - 数据结构与计算逻辑不变；failRate 字段仍记录"探针触发失败的比例"作为行为信号
//   - 工程师基于此判断"是否需要调整 Asset"，而非"代码是否合格"
//
// 设计原则：
//   - 与 Insight (单 proof) 解耦，独立的 schema 与 compute 模块
//   - 仍坚持"raw data 不做 suggestion"——AI 据此判断创建/更新 Domain/Blueprint
//   - 时间窗口：默认扫描全部 proofs/*/frozen.json，可用 --since 过滤
// =============================================================================

import { z } from 'zod'

// ───────── 第一维：趋势矩阵 ─────────

/** 单个 (probeType, target) 在某次 proof run 中的 verdict */
export const TrendMatrixEntrySchema = z.object({
  probeType: z.string(),
  target: z.string().optional(),
  /** 时间升序排列的 verdict 序列 */
  sequence: z.array(
    z.object({
      proofId: z.string(),
      runAt: z.string(),
      verdict: z.enum(['PASSED', 'FAILED', 'INCONCLUSIVE']),
    }),
  ),
  /** 总数 / PASSED / FAILED / INCONCLUSIVE */
  total: z.number().int().min(0),
  passedCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  inconclusiveCount: z.number().int().min(0),
})
export type TrendMatrixEntry = z.infer<typeof TrendMatrixEntrySchema>

// ───────── 第二维：关联矩阵 ─────────

/** 一对 probe type 的共现关系 */
export const CorrelationPairSchema = z.object({
  probeTypeA: z.string(),
  probeTypeB: z.string(),
  /** 两者同时出现在多少 proof 中 */
  coOccurrences: z.number().int().min(0),
  /** 同时失败的次数 */
  coFailures: z.number().int().min(0),
  /** 条件概率：两者同时失败 / 两者同时出现 */
  coFailureRate: z.number().min(0).max(1),
})
export type CorrelationPair = z.infer<typeof CorrelationPairSchema>

// ───────── 第三维：恶化/改善趋势 ─────────

export const TrendTypeSchema = z.enum([
  /** 最近 N 次 verdict 全部 PASSED（之前有过 FAIL）*/
  'improving',
  /** 最近 N 次 verdict 全部 FAILED（之前有过 PASS）*/
  'worsening',
  /** PASSED/FAILED 交替出现，无明确趋势 */
  'volatile',
  /** 全程 PASSED — 稳定绿 */
  'stable-pass',
  /** 全程 FAILED — 稳定红 */
  'stable-fail',
  /** 数据不足（< 3 次 run）*/
  'insufficient-data',
])
export type TrendType = z.infer<typeof TrendTypeSchema>

export const TrendSignalSchema = z.object({
  probeType: z.string(),
  target: z.string().optional(),
  trend: TrendTypeSchema,
  /** 最近一次 verdict */
  latestVerdict: z.enum(['PASSED', 'FAILED', 'INCONCLUSIVE']),
  /** 最近一次 proof run 的 runAt */
  latestRunAt: z.string(),
  /** 用于判定的"最近 N 次"窗口大小 */
  windowSize: z.number().int().min(1),
  /** 当前 streak（连续 PASSED / FAILED / INCONCLUSIVE 的次数）*/
  currentStreak: z.number().int().min(0),
})
export type TrendSignal = z.infer<typeof TrendSignalSchema>

// ───────── 第四维：探针行为特征（v0.6 PR-5d 命名：probeEffectiveness → probeBehaviorPattern）───────

/**
 * ProbeBehaviorPattern（v0.6 PR-5d 重命名）
 *
 * 描述"AI Agent 触碰某类 Probe 的行为特征"——**记录客观事实，不评判代码质量**。
 * - 数据来源：跨多个 proof 的 frozen.json 聚合
 * - failRate 字段含义：从探针运行结果客观记录中统计的"该类探针触发失败的比例"
 * - 不是"代码质量评分"，是"AI Agent 在这类探针上的行为模式信号"
 * - 工程师基于此判断"是否需要调整 Asset / 调宽调严边界"
 */
export const ProbeBehaviorPatternSchema = z.object({
  probeType: z.string(),
  /** 触发的总次数（含 PASSED / FAILED / INCONCLUSIVE）*/
  totalRuns: z.number().int().min(0),
  /** 至少触发 1 次 FAIL 的 proof 数 */
  failedProofs: z.number().int().min(0),
  /** fail rate = failedProofs / totalRuns —— 客观事实统计，非质量判定 */
  failRate: z.number().min(0).max(1),
  /** 失败时的 verdict 分布（仅记录数据）*/
  failureVerdicts: z.object({
    FAILED: z.number().int().min(0),
    INCONCLUSIVE: z.number().int().min(0),
  }),
})
export type ProbeBehaviorPattern = z.infer<typeof ProbeBehaviorPatternSchema>

// ───────── 顶层 ─────────

export const CrossProofInsightSchema = z.object({
  schemaVersion: z.literal(1),
  projectRoot: z.string(),
  /** 扫描的 proof 数（含失败的，跳过 in-progress）*/
  proofCount: z.number().int().min(0),
  /** 时间窗口：ISO 起始时间（undefined 表示不限）*/
  since: z.string().optional(),
  generatedAt: z.string(),

  /** 维度 1: target 趋势矩阵（仅含出现 ≥1 次的 (probeType, target)）*/
  trendMatrix: z.array(TrendMatrixEntrySchema),

  /** 维度 2: probe type 共现关联矩阵（仅 coOccurrences ≥ 2 的 pair）*/
  correlationMatrix: z.array(CorrelationPairSchema),

  /** 维度 3: 恶化/改善/波动信号 */
  trends: z.array(TrendSignalSchema),

  /** 维度 4: 探针行为特征（按 failRate 降序；v0.6 PR-5d 重命名 probeEffectiveness → probeBehaviorPattern）*/
  probeBehaviorPattern: z.array(ProbeBehaviorPatternSchema),

  /** 元信息 */
  meta: z.object({
    insightVersion: z.string(),
    dataSources: z.array(z.enum(['frozen.json'])),
    /** 过滤参数：扫描范围 */
    filter: z
      .object({
        since: z.string().optional(),
        proofIds: z.array(z.string()).optional(),
        probeTypes: z.array(z.string()).optional(),
      })
      .optional(),
  }),
})
export type CrossProofInsight = z.infer<typeof CrossProofInsightSchema>

/** 安全校验 helper */
export function safeValidateCrossProofInsight(
  data: unknown,
): { success: true; data: CrossProofInsight } | { success: false; error: z.ZodError } {
  const r = CrossProofInsightSchema.safeParse(data)
  return r.success ? { success: true, data: r.data } : { success: false, error: r.error }
}
