// =============================================================================
// probe-stats-schema.ts (v0.1.2)
//
// 全局 Probe 执行历史 schema（Proof-First 闭环的"记忆"）。
//
// 物理文件: .openxenon/.cache/probe-stats.json
// 性质: 派生数据，可重建；非 frozen.json，不需要 SHA-256 签名。
// 写权: src/infra/probes/probe-stats-store.ts（L1-Infra 纯 IO）
//
// 设计：参照 .cache/domains.json 的 slim 模式，但不展开 term 描述；
//      AI 拿到的是"哪些 probe 在什么 target 上反复失败/成功"的聚合视图，
//      用于涌现出对 Domain/Blueprint 的需求。
// =============================================================================

import { z } from 'zod'

/** 单个 target/command 上的统计（fs-exists 按 path，shell-exec 按 command） */
export const ProbeTargetStatsSchema = z.object({
  total: z.number().int().min(0),
  pass: z.number().int().min(0),
  fail: z.number().int().min(0),
  /** 连续失败次数：最近一次失败则 +1，连续成功则清零 */
  consecutiveFails: z.number().int().min(0),
  lastRun: z.string().min(1),
})
export type ProbeTargetStats = z.infer<typeof ProbeTargetStatsSchema>

/** 单个 probe type 的聚合统计 */
export const ProbeTypeStatsSchema = z.object({
  totalCount: z.number().int().min(0),
  passCount: z.number().int().min(0),
  failCount: z.number().int().min(0),
  lastRun: z.string().min(1),
  /** 按 target/command 细分（fs-exists 按 path，shell-exec 按 command） */
  targets: z.record(z.string(), ProbeTargetStatsSchema).default({}),
})
export type ProbeTypeStats = z.infer<typeof ProbeTypeStatsSchema>

/** 单次 proof run 的轻量记录（仅 verdict + probe 摘要，不复制 frozen.json 全文） */
export const ProbeRunRecordSchema = z.object({
  proofId: z.string().min(1),
  timestamp: z.string().min(1),
  outcome: z.enum(['COMPLETED', 'DEVIATED', 'INCONCLUSIVE']),
  probeSummary: z.array(
    z.object({
      type: z.string().min(1),
      target: z.string().optional(),
      passed: z.boolean(),
    }),
  ),
})
export type ProbeRunRecord = z.infer<typeof ProbeRunRecordSchema>

/** 全局 probe-stats.json 根对象 */
export const ProbeStatsSchema = z.object({
  schemaVersion: z.literal(1),
  projectRoot: z.string().min(1),
  probes: z.record(z.string(), ProbeTypeStatsSchema),
  proofRuns: z.array(ProbeRunRecordSchema),
  updatedAt: z.string().min(1),
})
export type ProbeStats = z.infer<typeof ProbeStatsSchema>

/** 构造一个空的 stats 对象（首次写盘 / 不存在时使用） */
export function emptyProbeStats(projectRoot: string): ProbeStats {
  return {
    schemaVersion: 1,
    projectRoot,
    probes: {},
    proofRuns: [],
    updatedAt: new Date().toISOString(),
  }
}

/** 安全校验 helper（IO 层读取后调用） */
export function safeValidateProbeStats(
  data: unknown,
): { success: true; data: ProbeStats } | { success: false; error: z.ZodError } {
  const r = ProbeStatsSchema.safeParse(data)
  return r.success ? { success: true, data: r.data } : { success: false, error: r.error }
}
