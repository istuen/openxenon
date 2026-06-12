// =============================================================================
// Proof Runner (v0.1.2 Phase C/D: 真运行时 + catalog 封装)
//
// IAP 三轴分离兑现：
//   - Infra (L1 src/infra/probes/): 物理观测 — fs-exists / shell-exec 等
//   - Kernel (L0 src/kernel/verdicts/verdict.ts): 纯函数判定
//   - catalog (L0.5 src/kernel/verdicts/catalog.ts): 语义层翻译（AI ↔ internal）
//   - proof-runner (Align 编排): 拿 internalRef → 调 Infra → 调 Kernel
//
// v0.1.2 命名约定（与文档对齐）：
//   - internalRef 形如 `@oxn/probes/fs-exists`（复数 probes）
//   - 旧 `@oxn/probe/*`（单数）仍可 resolve（向后兼容别名）
// =============================================================================

import { getProbeHandler, hasProbeHandler, type ProbeContext } from '../infra/probes'
import { judge } from '../kernel/index'
import type { FrozenProofProbeResult } from '../kernel/index'

/** 内存中的 proof.oxn 解析结果 */
export interface ProofProbeIR {
  probeName: string
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
 *   1. resolveProbeKind(ref) → kind（路由失败抛 ProbeNotFound）
 *   2. getProbeHandler(kind) → Infra handler（物理观测）
 *   3. Infra.execute(params, ctx) → ProbeObservation
 *   4. Kernel.judge(observation, params) → ProbeVerdict
 *   5. 转换为 FrozenProofProbeResult
 */
export async function executeProbe(
  probe: ProofProbeIR,
  context?: Partial<ProbeContext>,
): Promise<FrozenProofProbeResult> {
  const start = Date.now()
  const ctx: ProbeContext = {
    projectRoot: context?.projectRoot ?? process.cwd(),
  }

  const kind = resolveProbeKind(probe.ref)
  if (!kind) {
    return {
      probeName: probe.probeName,
      ref: probe.ref,
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
      passed: false,
      errorMessage: `Infra exception: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - start,
    }
  }

  const verdict = judge(observation, probe.params)

  return {
    probeName: probe.probeName,
    ref: probe.ref,
    passed: verdict.passed,
    output: { observation, verdict },
    errorMessage: verdict.passed ? undefined : (verdict.failureMessage ?? verdict.message),
    durationMs: Date.now() - start,
  }
}
