// =============================================================================
// proof.ts (v0.2 T14 — Daemon PR-2: Proof handler rewrite)
// =============================================================================
import type { StepResult } from '../../infra/step'

interface ProofRunParams {
  proofName: string
  projectRoot: string
}

/** Proof handler: 驱动单个 proof 的执行流程 (增量式 Step) */
export async function handleProofRun(params: ProofRunParams): Promise<StepResult> {
  // v0.2 T14: 集成 ProbeProviderRegistry + sandboxValidate
  // PoC 阶段返回 ok (完整实现在 T15 spike 后由 T14.1 完成)
  return { ok: true, snapshot: { proofName: params.proofName, started: Date.now() } }
}
