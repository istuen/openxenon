// =============================================================================
// Proof Runner (v0.1.2 Phase A: STUB)
//
// Phase A 职责：把 proof.oxn 解析为 IR 后，对每个 probe 调一次 executeProbe()
//               并返回结构化结果供 frozen-writer 写判决书。
//
// Phase B 替换：executeProbe 会分发到 src/infra/probes/<ref>.ts（Kernel+Infra 分层）
//               当前的 mock 会被替换为真实物理观测。
// =============================================================================

import type { FrozenProofProbeResult } from '../kernel/schemas/proof-schema'

/** 内存中的 proof.oxn 解析结果（来自 Langium AST → IR 映射） */
export interface ProofProbeIR {
  probeName: string
  ref: string
  params: Record<string, unknown>
}

/**
 * Phase A stub：当前总是返回 PASS。
 * Phase B 会按 ref 路由：
 *   - @oxn/probe/fs-exists    → src/infra/probes/fs-exists.ts (Infra 物理观测)
 *   - @oxn/probe/shell-exec   → src/infra/probes/shell-exec.ts
 *   - ... 路由到对应真实实现
 * 然后由 Kernel (src/kernel/probes/verdict.ts) 给出 PASS/FAIL 判定。
 */
export async function executeProbe(probe: ProofProbeIR): Promise<FrozenProofProbeResult> {
  const start = Date.now()
  // Phase A mock: 全部 PASS。Phase B 替换为真实 Kernel+Infra 分发。
  return {
    probeName: probe.probeName,
    ref: probe.ref,
    passed: true,
    output: {
      mock: true,
      reason: 'Phase A stub: all probes return PASS. Real Kernel+Infra split ships in Phase B.',
      ref: probe.ref,
      params: probe.params,
    },
    durationMs: Date.now() - start,
  }
}
