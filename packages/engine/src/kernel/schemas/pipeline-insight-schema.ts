// =============================================================================
// PipelineInsight Schema (v0.5 PR-C)
//
// Intent → Work → Proof 全链结构化洞察。
// 数据源：domains/*.md + blueprints/*.md + works/*/ + proofs/*/frozen.json
//
// 3 维分析：
//   1. invariantEffectiveness: Domain invariant 在多 work/proof 中的命中率
//   2. intentCoverageGaps:   Blueprint 声明的 observe probe 与实际执行之间的缺口
//   3. workProofTraces:      Work → Proof 全链追踪
//
// 设计原则：
//   - 与 CrossProofInsight (PR-B) 解耦，独立的 schema 与 compute 模块
//   - 仍坚持"raw data 不做 suggestion"——AI 据此判断调整 Domain/Blueprint
//   - 不引入新概念：复用 Domain invaraint / Blueprint observe / Proof verdict
// =============================================================================

import { z } from 'zod'

// ───────── 维度 1：Invariant 有效性 ─────────

export const InvariantEffectivenessSchema = z.object({
  domainName: z.string(),
  invariantText: z.string(),
  /** 关联此 invariant 的 work 数 */
  totalWorks: z.number().int().min(0),
  /** 至少一次 proof 中相关 probe FAIL/INCONCLUSIVE 的 work 数 */
  failedWorks: z.number().int().min(0),
  /** 关联的总 proof 数 */
  totalProofs: z.number().int().min(0),
  /** proof 中相关 probe FAIL/INCONCLUSIVE 的次数 */
  failedProofs: z.number().int().min(0),
  /** 命中率 = failedProofs / totalProofs（totalProofs=0 时 hitRate=0）*/
  hitRate: z.number().min(0).max(1),
  /** 有效性判定 */
  status: z.enum(['critical', 'warning', 'ok', 'unused']),
})
export type InvariantEffectiveness = z.infer<typeof InvariantEffectivenessSchema>

// ───────── 维度 2：Intent 覆盖率缺口 ─────────

export const IntentCoverageGapSchema = z.object({
  /** domain 或 blueprint */
  source: z.string(),
  sourceType: z.enum(['domain', 'blueprint']),
  /** intent 中声明的 observe probe type 列表（blueprint）或其 term 数（domain）*/
  declared: z.array(z.string()),
  /** 实际在 proof 中执行过的 probe type 列表 */
  actual: z.array(z.string()),
  /** 声明了但从未被执行的 */
  missing: z.array(z.string()),
  /** 覆盖率 = actual.length / declared.length */
  coverageRate: z.number().min(0).max(1),
})
export type IntentCoverageGap = z.infer<typeof IntentCoverageGapSchema>

// ───────── 维度 3：Work → Proof 全链追踪 ─────────

export const WorkProofTraceSchema = z.object({
  workName: z.string(),
  /** 此 work 引用的 domain 名列表 */
  domains: z.array(z.string()),
  /** 此 work 引用的 blueprint 名列表 */
  blueprints: z.array(z.string()),
  /** 关联的 proof 列表 */
  proofs: z.array(
    z.object({
      proofId: z.string(),
      outcome: z.enum(['COMPLETED', 'DEVIATED', 'INCONCLUSIVE']),
      runAt: z.string(),
      /** probe 摘要 */
      probeSummary: z.array(
        z.object({
          probeType: z.string(),
          outcome: z.enum(['COMPLETED', 'DEVIATED', 'INCONCLUSIVE']),
          target: z.string().optional(),
        }),
      ),
    }),
  ),
  /** trace 事件计数 */
  traceEventCount: z.number().int().min(0),
})
export type WorkProofTrace = z.infer<typeof WorkProofTraceSchema>

// ───────── 顶层 ─────────

export const PipelineInsightSchema = z.object({
  schemaVersion: z.literal(1),
  projectRoot: z.string(),
  generatedAt: z.string(),

  /** domainCount + blueprintCount + workCount + proofCount */
  domainCount: z.number().int().min(0),
  blueprintCount: z.number().int().min(0),
  workCount: z.number().int().min(0),
  proofCount: z.number().int().min(0),

  /** 维度 1: invariant 有效性（含 hitRate / status）*/
  invariantEffectiveness: z.array(InvariantEffectivenessSchema),

  /** 维度 2: 覆盖率缺口（blueprint observe vs proof actual）*/
  intentCoverageGaps: z.array(IntentCoverageGapSchema),

  /** 维度 3: Work→Proof 全链追踪 */
  workProofTraces: z.array(WorkProofTraceSchema),

  /** 元信息 */
  meta: z.object({
    insightVersion: z.string(),
    dataSources: z.array(z.enum(['domains', 'blueprints', 'works', 'proofs', 'trace.jsonl'])),
  }),
})
export type PipelineInsight = z.infer<typeof PipelineInsightSchema>

export function safeValidatePipelineInsight(
  data: unknown,
): { success: true; data: PipelineInsight } | { success: false; error: z.ZodError } {
  const r = PipelineInsightSchema.safeParse(data)
  return r.success ? { success: true, data: r.data } : { success: false, error: r.error }
}
