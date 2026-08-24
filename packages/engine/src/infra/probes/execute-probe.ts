// =============================================================================
// execute-probe.ts —— Probe 编排层（v0.6.4, RFC-0032 Phase 2）
//
// 替代原 packages/engine/src/Proof/runner.ts。设计动机：
//   - Proof 模块整体删除（RFC-0032 D25），但 executeProbe + ProofProbeIR 是 Work 真实依赖
//   - 编排语义（catalog 路由 + infra 执行 + kernel 判定）属于 Probe 工具能力（D27）
//   - 与 infra/probes/*.ts 平级：probes 是 L1 物理观测；这里是 L1.5 Probe 编排包装
//
// IAP 三轴分离兑现：
//   - Infra (L1 src/infra/probes/): 物理观测 — fs-exists / shell-exec 等
//   - Kernel (L0 src/kernel/verdicts/outcome.ts): 纯函数判定
//   - catalog (L0.5 src/kernel/verdicts/catalog.ts): 语义层翻译（AI ↔ internal）
//   - execute-probe (Align 编排): 拿 internalRef → 调 Infra → 调 Kernel
//
// 不写 frozen.json（RFC-0032 D27：Probe = 工具能力；不是主权验证）
// =============================================================================

import { getProbeHandler, hasProbeHandler, type ProbeContext } from './'
import { judge } from '@openxenon/engine/kernel'
import type { FrozenProofProbeResult } from '@openxenon/engine/kernel'

/** 内存中的 probe 描述（迁移自原 Proof/runner.ts，保留向后兼容） */
export interface ProofProbeIR {
  probeName: string
  // proof-probe-description-target D4: 副本同步, 与 oxl/transformers/proof.ts:ProofProbeIR 字段对齐
  description?: string
  target?: string
  ref: string
  params: Record<string, unknown>
}

/**
 * 把 internalRef 路由到 Infra handler（向后兼容 + 复数命名统一）
 *   - "@oxn/probes/fs-exists"   → "fs_exists" (catalog 默认)
 *   - "@oxn/probe/fs-exists"    → "fs-exists" (旧别名)
 *   - "fs-exists" / "fs_exists"  → 直通
 *   - "shell-exec" / "shell_exec" → 直通
 */
export function resolveProbeKind(ref: string): string | null {
  // 1. 去掉 @oxn/probes/ 或 @oxn/probe/ 前缀
  const stripped = ref.replace(/^@oxn\/probes?\//, '')
  if (hasProbeHandler(stripped)) return stripped
  // 2. alias 映射
  const aliases: Record<string, string> = {
    'fs-exists': 'fs_exists',
    'fs-not-exists': 'fs_not_exists',
    'fs-content-match': 'fs_match',
    'exec-exit-zero': 'shell_exec',
    'shell-exec': 'shell_exec',
  }
  if (aliases[stripped]) return aliases[stripped]
  return null
}

/**
 * 真实执行一个 probe（Kernel + Infra 分离）。
 *
 *   1. resolveProbeKind(ref) → kind（路由失败返 DEVIATED）
 *   2. getProbeHandler(kind) → Infra handler（物理观测）
 *   3. Infra.execute(params, ctx) → ProbeObservation
 *   4. Kernel.judge(observation, params) → ProbeOutcome
 *   5. 转换为 FrozenProofProbeResult
 *
 * 🆕 v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5):
 *   - context.stackTools 透传到 ProbeContext.stackTools
 *   - L1 probe handlers (shell-exec / lint-check / ts-compiles) 可按 tool.name 匹配做 env metadata merge
 *   - 缺省 undefined → 兼容老调用（dual-state-exec 不传 stackTools 时不影响行为）
 */
export async function executeProbe(
  probe: ProofProbeIR,
  context?: Partial<ProbeContext>,
): Promise<FrozenProofProbeResult> {
  const start = Date.now()
  const ctx: ProbeContext = {
    projectRoot: context?.projectRoot ?? process.cwd(),
    // 🆕 v0.7.3 P6 (ADR-0061 §D5): 仅当 stackTools 非空数组时透传（避免无意义 entry）
    ...(context?.stackTools && context.stackTools.length > 0 ? { stackTools: context.stackTools } : {}),
  }

  const kind = resolveProbeKind(probe.ref)
  if (!kind) {
    return {
      probeName: probe.probeName,
      ref: probe.ref,
      outcome: 'DEVIATED',
      passed: false,
      errorMessage: `unknown probe ref: ${probe.ref} (no Infra handler)`,
      durationMs: Date.now() - start,
    }
  }
  const handler = getProbeHandler(kind)
  if (!handler) {
    return {
      probeName: probe.probeName,
      ref: probe.ref,
      outcome: 'DEVIATED',
      passed: false,
      errorMessage: `no Infra handler for kind: ${kind}`,
      durationMs: Date.now() - start,
    }
  }

  let observation
  try {
    observation = await handler(probe.params, ctx)
  } catch (err) {
    return {
      probeName: probe.probeName,
      ref: probe.ref,
      outcome: 'DEVIATED',
      passed: false,
      errorMessage: `Infra exception: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - start,
    }
  }

  const outcome = judge(observation, probe.params)

  return {
    probeName: probe.probeName,
    ref: probe.ref,
    // proof-probe-description-target D4: 透传 description/target 到 FrozenProofProbeResult (向后兼容 optional)
    ...(probe.description ? { description: probe.description } : {}),
    ...(probe.target ? { target: probe.target } : {}),
    outcome: outcome.outcome === 'INCONCLUSIVE' ? 'INCONCLUSIVE' : outcome.passed ? 'COMPLETED' : 'DEVIATED',
    passed: outcome.passed,
    output: { observation, outcome },
    errorMessage: outcome.passed ? undefined : (outcome.failureMessage ?? outcome.message),
    durationMs: Date.now() - start,
  }
}
