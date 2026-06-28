// =============================================================================
// pipeline-compute.ts (v0.5 PR-C)
//
// L0-Processor 纯函数：PipelineInput → PipelineInsight
//
// 3 维算法：
//   1. invariantEffectiveness: 用 proof probe verdict 反推 invariant 命中率
//   2. intentCoverageGaps:    blueprint observe vs proof actual 缺口
//   3. workProofTraces:       work→proof 关联链
//
// 设计原则：
//   - 不修改入参；返回全新对象
//   - 不调 IO（pure function）
//   - 输入由 L1-Infra pipeline-analyzer 从 filesystem 组装
//
// 调用方向：仅 L3-CLI 可调。L1-Infra 不可调（避免 §4.1 违规）。
// =============================================================================

import type { FrozenProof } from '../schemas/proof-schema'
import type {
  IntentCoverageGap,
  InvariantEffectiveness,
  PipelineInsight,
  WorkProofTrace,
} from '../schemas/pipeline-insight-schema'

// ─── 输入类型 ───────────────────────────────────────────────────────────────

export interface DomainInput {
  name: string
  invariants: Array<{ value: string }>
}

export interface BlueprintInput {
  name: string
  slots: Array<{ name: string; observe: string[] }>
}

export interface WorkInput {
  name: string
  domainRefs: string[] // domain file names (without .oxn)
  blueprintRefs: string[] // blueprint file names
  /** if we have associated proofs from same-named proof dir */
  proofs: Array<{
    proofId: string
    verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
    runAt: string
    probeSummary: Array<{
      probeType: string
      verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
      target?: string
    }>
  }>
  /** trace event count (optional, 0 if no trace) */
  traceEventCount: number
}

export interface PipelineInput {
  projectRoot: string
  domains: DomainInput[]
  blueprints: BlueprintInput[]
  works: WorkInput[]
  /** raw proof list for global coverage gap analysis */
  allFrozenProofs: FrozenProof[]
}

// ─── 维度 1：Invariant 有效性 ────────────────────────────────────────────────

const INVARIANT_KEYWORDS: Record<string, string> = {
  require: 'ts-compiles',
  esm: 'ts-compiles',
  import: 'ts-compiles',
  'type.?check': 'ts-compiles',
  lint: 'lint-check',
  'reg.?ex': 'lint-check',
  're.?dos': 'lint-check',
  test: 'test-pass',
  'unit.?test': 'test-pass',
  'bun test': 'test-pass',
  shell: 'shell-exec',
  command: 'shell-exec',
  spawn: 'shell-exec',
  deps: 'deps-resolved',
  dependency: 'deps-resolved',
  'bun install': 'deps-resolved',
  '(file|path).*(exist|missing|match)': 'fs-exists',
  http: 'http-responds',
  git: 'git-clean',
}

function guessProbeTypeFromInvariant(text: string): string[] {
  const lower = text.toLowerCase()
  const matched: string[] = []
  for (const [pattern, probeType] of Object.entries(INVARIANT_KEYWORDS)) {
    try {
      if (new RegExp(pattern, 'i').test(lower)) {
        if (!matched.includes(probeType)) matched.push(probeType)
      }
    } catch {
      /* skip bad pattern */
    }
  }
  return matched.length > 0 ? matched : ['unknown']
}

function computeInvariantEffectiveness(input: PipelineInput): InvariantEffectiveness[] {
  const result: InvariantEffectiveness[] = []

  for (const domain of input.domains) {
    for (const inv of domain.invariants) {
      const probeTypes = guessProbeTypeFromInvariant(inv.value)
      let totalWorks = 0
      let failedWorks = 0
      let totalProofs = 0
      let failedProofs = 0

      // 找到引用此 domain 的 work
      for (const work of input.works) {
        if (!work.domainRefs.includes(domain.name)) continue
        totalWorks++
        let workHadFailure = false

        for (const proof of work.proofs) {
          totalProofs++
          let proofHadFailure = false
          for (const ps of proof.probeSummary) {
            if (probeTypes.includes(ps.probeType) && ps.verdict !== 'PASSED') {
              proofHadFailure = true
              break
            }
          }
          if (proofHadFailure) {
            failedProofs++
            workHadFailure = true
          }
        }
        if (workHadFailure) failedWorks++
      }

      const hitRate = totalProofs > 0 ? failedProofs / totalProofs : 0
      const status: InvariantEffectiveness['status'] =
        totalWorks === 0 ? 'unused' : hitRate === 0 ? 'ok' : hitRate <= 0.3 ? 'warning' : 'critical'

      result.push({
        domainName: domain.name,
        invariantText: inv.value,
        totalWorks,
        failedWorks,
        totalProofs,
        failedProofs,
        hitRate,
        status,
      })
    }
  }
  // critical first, then warning, then ok, then unused
  const priority = { critical: 0, warning: 1, ok: 2, unused: 3 }
  result.sort((a, b) => priority[a.status] - priority[b.status])
  return result
}

// ─── 维度 2：覆盖率缺口 ──────────────────────────────────────────────────────

function computeCoverageGaps(input: PipelineInput): IntentCoverageGap[] {
  const result: IntentCoverageGap[] = []

  // Collect all probe types actually executed across all proofs
  const allActualProbes = new Set<string>()
  for (const proof of input.allFrozenProofs) {
    for (const probe of proof.probes) {
      const typeName = resolveTypeName(probe.ref)
      allActualProbes.add(typeName)
    }
  }
  for (const bp of input.blueprints) {
    const declaredProbes = new Set<string>()
    for (const slot of bp.slots) {
      for (const obs of slot.observe) {
        declaredProbes.add(obs)
      }
    }
    const declared = Array.from(declaredProbes).sort()
    const missing = declared.filter((d) => !allActualProbes.has(d))
    const actualForSource = declared.filter((d) => allActualProbes.has(d))
    result.push({
      source: bp.name,
      sourceType: 'blueprint',
      declared,
      actual: actualForSource,
      missing,
      coverageRate: declared.length > 0 ? actualForSource.length / declared.length : 0,
    })
  }

  result.sort((a, b) => a.coverageRate - b.coverageRate) // worst first
  return result
}

// ─── 维度 3：Work → Proof 全链追踪 ───────────────────────────────────────────

function computeWorkProofTraces(input: PipelineInput): WorkProofTrace[] {
  return input.works
    .map((w) => ({
      workName: w.name,
      domains: w.domainRefs,
      blueprints: w.blueprintRefs,
      proofs: w.proofs.map((p) => ({
        proofId: p.proofId,
        verdict: p.verdict,
        runAt: p.runAt,
        probeSummary: p.probeSummary.map((ps) => ({
          probeType: ps.probeType,
          verdict: ps.verdict,
          target: ps.target,
        })),
      })),
      traceEventCount: w.traceEventCount,
    }))
    .sort((a, b) => b.proofs.length - a.proofs.length) // most proofs first
}

// ─── 顶层 ────────────────────────────────────────────────────────────────────

import { getSemanticNameByInternalRef } from './catalog'

function resolveTypeName(ref: string): string {
  const byRef = getSemanticNameByInternalRef(ref)
  if (byRef) return byRef
  return ref.replace(/^@oxn\/probes?\//, '') || ref
}

export function computePipelineInsightFromInputs(input: PipelineInput): PipelineInsight {
  return {
    schemaVersion: 1,
    projectRoot: input.projectRoot,
    generatedAt: new Date().toISOString(),
    domainCount: input.domains.length,
    blueprintCount: input.blueprints.length,
    workCount: input.works.length,
    proofCount: input.allFrozenProofs.length,
    invariantEffectiveness: computeInvariantEffectiveness(input),
    intentCoverageGaps: computeCoverageGaps(input),
    workProofTraces: computeWorkProofTraces(input),
    meta: {
      insightVersion: '0.1.0',
      dataSources: ['domains', 'blueprints', 'works', 'proofs', 'trace.jsonl'],
    },
  }
}
