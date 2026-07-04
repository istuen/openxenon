// =============================================================================
// cross-proof-compute.ts (v0.5 PR-B → v0.6 PR-5d 重命名)
//
// L0-Processor 纯函数：FrozenProof[] → CrossProofInsight
//
// 输入：扫描 proofs/*/frozen.json 得到的 FrozenProof 列表（按 runAt 升序）
// 输出：4 维 CrossProofInsight（trendMatrix + correlationMatrix + trends + probeBehaviorPattern）
//
// v0.6 PR-5d 重命名说明：
//   - 维度 4 由 probeEffectiveness → probeBehaviorPattern
//   - 计算逻辑不变（仍按 failRate 降序）；但语义从"探针有效性排名"转为"AI Agent 触碰探针的行为特征"
//   - 输出供 Insight 消费，**记录客观事实，不评判代码质量**
//
// 设计原则：
//   - 不修改入参；返回全新对象
//   - 不调 IO（pure function）
//   - 时间窗口 / probe type 过滤由 L3-CLI 提供 filter 参数控制
//
// 调用方向：仅 L3-CLI 可调（编排）。L1-Infra 不可调（避免 §4.1 违规）。
// =============================================================================

import type { FrozenProof } from '../schemas/proof-schema'
import type {
  CorrelationPair,
  CrossProofInsight,
  ProbeBehaviorPattern,
  TrendMatrixEntry,
  TrendSignal,
  TrendType,
} from '../schemas/cross-proof-insight-schema'
import { getSemanticNameByInternalRef } from './catalog'

/** 过滤参数 */
export interface CrossProofFilter {
  /** 仅包含 runAt >= since 的 proof */
  since?: string
  /** 仅包含这些 proofId */
  proofIds?: string[]
  /** 仅包含这些 probeType */
  probeTypes?: string[]
}

/** 内部：resolvedTypeName + target 元组 */
interface KeyedProbe {
  probeType: string
  target: string | undefined
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
  runAt: string
  proofId: string
}

/**
 * 把 FrozenProof 列表（含同一 proof 的所有 probe）展开成 (probeType, target, verdict, runAt, proofId) 元组。
 * 应用 filter：since / proofIds / probeTypes。
 */
function expandToKeyedProbes(frozenList: FrozenProof[], filter: CrossProofFilter): KeyedProbe[] {
  const out: KeyedProbe[] = []
  for (const frozen of frozenList) {
    if (filter.since && frozen.runAt < filter.since) continue
    if (filter.proofIds && filter.proofIds.length > 0 && !filter.proofIds.includes(frozen.name)) continue
    for (const probe of frozen.probes) {
      const probeType = resolveTypeName(probe.ref)
      if (filter.probeTypes && filter.probeTypes.length > 0 && !filter.probeTypes.includes(probeType)) {
        continue
      }
      out.push({
        probeType,
        target: extractTargetFromOutput(probe),
        verdict: probe.verdict,
        runAt: frozen.runAt,
        proofId: frozen.name,
      })
    }
  }
  return out
}

/** 与 insight-compute.ts 一致的类型解析（catalog 已稳定）*/
function resolveTypeName(ref: string): string {
  const byRef = getSemanticNameByInternalRef(ref)
  if (byRef) return byRef
  return ref.replace(/^@oxn\/probes?\//, '') || ref
}

/**
 * 从 probe.output 提取 target（与 verdict.ts:extractTarget 类似，但 inline 一份避免跨文件依赖）
 *  - output.params / output.target / output.path / output.url / output.command / output.file
 */
function extractTargetFromOutput(probe: FrozenProof['probes'][number]): string | undefined {
  const output = probe.output
  if (output === null || output === undefined) return undefined
  if (typeof output !== 'object') return undefined
  const obj = output as Record<string, unknown>
  const candidates = [obj.params, obj.target, obj.path, obj.url, obj.command, obj.file]
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c
    if (c && typeof c === 'object') {
      for (const v of Object.values(c as Record<string, unknown>)) {
        if (typeof v === 'string' && v.length > 0) return v
      }
    }
  }
  return undefined
}

/**
 * 维度 1：target 趋势矩阵
 *   - 按 (probeType, target) 分组
 *   - 按 runAt 升序排列每个组的 verdict 序列
 *   - 统计 total/passed/failed/inconclusive
 */
function buildTrendMatrix(keyedProbes: KeyedProbe[]): TrendMatrixEntry[] {
  const groups = new Map<string, KeyedProbe[]>()
  for (const kp of keyedProbes) {
    const target = kp.target ?? '(no-target)'
    const key = `${kp.probeType}\x00${target}`
    const list = groups.get(key) ?? []
    list.push(kp)
    groups.set(key, list)
  }
  const result: TrendMatrixEntry[] = []
  for (const [key, list] of groups) {
    // 按 runAt 升序
    list.sort((a, b) => a.runAt.localeCompare(b.runAt))
    const [probeType, target] = key.split('\x00') as [string, string]
    const targetOut = target === '(no-target)' ? undefined : target
    let passed = 0
    let failed = 0
    let inconclusive = 0
    const sequence = list.map((kp) => {
      if (kp.verdict === 'PASSED') passed++
      else if (kp.verdict === 'FAILED') failed++
      else inconclusive++
      return {
        proofId: kp.proofId,
        runAt: kp.runAt,
        verdict: kp.verdict,
      }
    })
    result.push({
      probeType,
      ...(targetOut !== undefined ? { target: targetOut } : {}),
      sequence,
      total: list.length,
      passedCount: passed,
      failedCount: failed,
      inconclusiveCount: inconclusive,
    })
  }
  // 按 total 降序，最活跃的在前
  result.sort((a, b) => b.total - a.total)
  return result
}

/**
 * 维度 2：probe type 共现关联矩阵
 *   - 同一 proof 中两个 probe type 共同出现的次数（coOccurrences）
 *   - 两者同时失败的次数（coFailures）
 *   - 仅 coOccurrences >= 2 的 pair 输出（避免偶然共现噪声）
 */
function buildCorrelationMatrix(frozenList: FrozenProof[]): CorrelationPair[] {
  // 用 proofId 索引每 proof 中出现过的 probe type
  const proofToProbes = new Map<string, Map<string, { passed: boolean }>>()
  for (const frozen of frozenList) {
    const inProof = new Map<string, { passed: boolean }>()
    for (const probe of frozen.probes) {
      const typeName = resolveTypeName(probe.ref)
      // 同一 proof 同一 type 可能多次（不同 target），但共现只按 type 算一次
      if (!inProof.has(typeName)) {
        inProof.set(typeName, { passed: probe.passed })
      } else {
        // 若 type 已存在，但当前 probe 失败则置 passed=false（保守）
        const existing = inProof.get(typeName)
        if (existing && !probe.passed) existing.passed = false
      }
    }
    proofToProbes.set(frozen.name, inProof)
  }

  // 统计 pair 共现
  const pairStats = new Map<string, { coOccurrences: number; coFailures: number }>()
  for (const inProof of proofToProbes.values()) {
    const types = Array.from(inProof.keys()).sort()
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const a = types[i]!
        const b = types[j]!
        const key = `${a}\x00${b}`
        const stats = pairStats.get(key) ?? { coOccurrences: 0, coFailures: 0 }
        stats.coOccurrences++
        const aPass = inProof.get(a)!.passed
        const bPass = inProof.get(b)!.passed
        if (!aPass && !bPass) stats.coFailures++
        pairStats.set(key, stats)
      }
    }
  }

  const result: CorrelationPair[] = []
  for (const [key, stats] of pairStats) {
    if (stats.coOccurrences < 2) continue
    const [probeTypeA, probeTypeB] = key.split('\x00') as [string, string]
    result.push({
      probeTypeA,
      probeTypeB,
      coOccurrences: stats.coOccurrences,
      coFailures: stats.coFailures,
      coFailureRate: stats.coFailures / stats.coOccurrences,
    })
  }
  // 按 coFailureRate 降序（最可能共现失败的在最前）
  result.sort((a, b) => b.coFailureRate - a.coFailureRate)
  return result
}

/**
 * 维度 3：恶化/改善/波动信号
 *   - 窗口大小 = min(total, 3)
 *   - 仅 total >= 3 的 (probeType, target) 进入趋势判定
 *   - 判定逻辑见下方 classifyTrend
 */
const MIN_WINDOW = 3

function classifyTrend(verdicts: ('PASSED' | 'FAILED' | 'INCONCLUSIVE')[]): {
  trend: TrendType
  currentStreak: number
} {
  const n = verdicts.length
  if (n < MIN_WINDOW) return { trend: 'insufficient-data', currentStreak: countCurrentStreak(verdicts) }

  const window = verdicts.slice(-MIN_WINDOW)

  // 全程 PASSED / FAILED 视为稳定
  if (verdicts.every((v) => v === 'PASSED')) {
    return { trend: 'stable-pass', currentStreak: n }
  }
  if (verdicts.every((v) => v === 'FAILED')) {
    return { trend: 'stable-fail', currentStreak: n }
  }

  // 改善：最近窗口全部 PASSED 且之前有 FAIL
  const windowAllPass = window.every((v) => v === 'PASSED')
  const windowAllFail = window.every((v) => v === 'FAILED')
  const priorHasFail = verdicts.slice(0, n - MIN_WINDOW).some((v) => v === 'FAILED')
  const priorHasPass = verdicts.slice(0, n - MIN_WINDOW).some((v) => v === 'PASSED')

  if (windowAllPass && priorHasFail) {
    return { trend: 'improving', currentStreak: countCurrentStreak(verdicts) }
  }
  if (windowAllFail && priorHasPass) {
    return { trend: 'worsening', currentStreak: countCurrentStreak(verdicts) }
  }

  return { trend: 'volatile', currentStreak: countCurrentStreak(verdicts) }
}

/** 计算当前 streak（连续同 verdict 的次数）*/
function countCurrentStreak(verdicts: ('PASSED' | 'FAILED' | 'INCONCLUSIVE')[]): number {
  if (verdicts.length === 0) return 0
  const last = verdicts[verdicts.length - 1]!
  let n = 0
  for (let i = verdicts.length - 1; i >= 0; i--) {
    if (verdicts[i] === last) n++
    else break
  }
  return n
}

function detectTrends(keyedProbes: KeyedProbe[]): TrendSignal[] {
  // 按 (probeType, target) 分组（与 trendMatrix 同样的 key）
  const groups = new Map<string, KeyedProbe[]>()
  for (const kp of keyedProbes) {
    const target = kp.target ?? '(no-target)'
    const key = `${kp.probeType}\x00${target}`
    const list = groups.get(key) ?? []
    list.push(kp)
    groups.set(key, list)
  }
  const result: TrendSignal[] = []
  for (const [key, list] of groups) {
    if (list.length < MIN_WINDOW) continue
    list.sort((a, b) => a.runAt.localeCompare(b.runAt))
    const [probeType, target] = key.split('\x00') as [string, string]
    const targetOut = target === '(no-target)' ? undefined : target
    const verdicts = list.map((kp) => kp.verdict)
    const { trend, currentStreak } = classifyTrend(verdicts)
    const last = list[list.length - 1]!
    const windowSize = Math.min(list.length, MIN_WINDOW)
    result.push({
      probeType,
      ...(targetOut !== undefined ? { target: targetOut } : {}),
      trend,
      latestVerdict: last.verdict,
      latestRunAt: last.runAt,
      windowSize,
      currentStreak,
    })
  }
  // 优先级：worsening > improving > volatile > stable-fail > stable-pass > insufficient-data
  const priority: Record<TrendType, number> = {
    worsening: 0,
    improving: 1,
    volatile: 2,
    'stable-fail': 3,
    'stable-pass': 4,
    'insufficient-data': 5,
  }
  result.sort((a, b) => priority[a.trend] - priority[b.trend])
  return result
}

/**
 * 维度 4：探针行为特征（v0.6 PR-5d 重命名 probeEffectiveness → probeBehaviorPattern）
 *
 * 描述"AI Agent 触碰某类 Probe 的行为特征"——**记录客观事实，不评判代码质量**：
 *   - totalRuns：触发的 proof 总数（一个 probe type 在一个 proof 中计 1 次，无论 verdict）
 *   - failedProofs：触发了至少 1 次 FAIL 或 INCONCLUSIVE 的 proof 数
 *   - failRate = failedProofs / totalRuns —— 客观事实统计，非"代码质量评分"
 *
 * 工程师基于此判断"是否需要调整 Asset / 调宽调严边界"。
 */
function rankProbeBehaviorPattern(frozenList: FrozenProof[]): ProbeBehaviorPattern[] {
  // proofId → probeType → { passed }
  const proofTypeMap = new Map<string, Map<string, { passed: boolean; anyFailing: boolean }>>()
  for (const frozen of frozenList) {
    const typeMap = new Map<string, { passed: boolean; anyFailing: boolean }>()
    for (const probe of frozen.probes) {
      const typeName = resolveTypeName(probe.ref)
      const existing = typeMap.get(typeName) ?? { passed: true, anyFailing: false }
      if (!probe.passed) existing.anyFailing = true
      // 若多个同 type probe，pass 取 AND
      if (!probe.passed) existing.passed = false
      typeMap.set(typeName, existing)
    }
    proofTypeMap.set(frozen.name, typeMap)
  }

  // 聚合
  const stats = new Map<
    string,
    { totalRuns: number; failedProofs: number; failedCount: number; inconclusiveCount: number }
  >()
  for (const typeMap of proofTypeMap.values()) {
    for (const [typeName, info] of typeMap) {
      let stat = stats.get(typeName)
      if (!stat) {
        stat = { totalRuns: 0, failedProofs: 0, failedCount: 0, inconclusiveCount: 0 }
        stats.set(typeName, stat)
      }
      stat.totalRuns++
      if (info.anyFailing) stat.failedProofs++
      // 失败类型的分布（按所有 probe 实例统计，不仅按 type）
    }
  }
  // 失败计数分布（跨所有 probe 实例）
  for (const frozen of frozenList) {
    for (const probe of frozen.probes) {
      const typeName = resolveTypeName(probe.ref)
      const stat = stats.get(typeName)
      if (!stat) continue
      if (probe.verdict === 'FAILED') stat.failedCount++
      else if (probe.verdict === 'INCONCLUSIVE') stat.inconclusiveCount++
    }
  }

  const result: ProbeBehaviorPattern[] = []
  for (const [probeType, stat] of stats) {
    result.push({
      probeType,
      totalRuns: stat.totalRuns,
      failedProofs: stat.failedProofs,
      failRate: stat.totalRuns > 0 ? stat.failedProofs / stat.totalRuns : 0,
      failureVerdicts: {
        FAILED: stat.failedCount,
        INCONCLUSIVE: stat.inconclusiveCount,
      },
    })
  }
  result.sort((a, b) => b.failRate - a.failRate)
  return result
}

/**
 * 顶层入口：FrozenProof[] + filter → CrossProofInsight
 *
 * 时间排序：frozenList 应已按 runAt 升序；本函数不再二次排序（信任 IO 层）
 */
export function computeCrossProofInsightFromInputs(
  projectRoot: string,
  frozenList: FrozenProof[],
  filter: CrossProofFilter = {},
): CrossProofInsight {
  const keyedProbes = expandToKeyedProbes(frozenList, filter)
  return {
    schemaVersion: 1,
    projectRoot,
    proofCount: frozenList.length,
    ...(filter.since !== undefined ? { since: filter.since } : {}),
    generatedAt: new Date().toISOString(),
    trendMatrix: buildTrendMatrix(keyedProbes),
    correlationMatrix: buildCorrelationMatrix(frozenList),
    trends: detectTrends(keyedProbes),
    probeBehaviorPattern: rankProbeBehaviorPattern(frozenList),
    meta: {
      insightVersion: '0.1.0',
      dataSources: ['frozen.json'],
      filter: {
        ...(filter.since !== undefined ? { since: filter.since } : {}),
        ...(filter.proofIds !== undefined && filter.proofIds.length > 0 ? { proofIds: filter.proofIds } : {}),
        ...(filter.probeTypes !== undefined && filter.probeTypes.length > 0 ? { probeTypes: filter.probeTypes } : {}),
      },
    },
  }
}
