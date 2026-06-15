// =============================================================================
// Proof Frozen Writer (v0.1.2)
//
// 写 .openxenon/proofs/<name>/frozen.json：
//   1. buildFrozenProof 构造 body
//   2. writeFrozenProof 调 shared writeFrozenImmutable（自动算 SHA-256 + chmod 0o444）
//
// 写权独占：本模块是 frozen.json 的**唯一**合法写路径（AI / 工程师禁手改）。
// =============================================================================

import {
  FROZEN_FILE_MODE,
  isFrozenFileReadOnly,
  readFrozenImmutable,
  writeFrozenImmutable,
  type FrozenXenonMetaBase,
} from '../infra/frozen/immutable'
import { type FrozenProof, type FrozenProofProbeResult, safeValidateFrozenProof } from '../kernel/index'

/** frozen.json 的 body 形态（不含 _xenon_meta，由 writer 注入） */
export type FrozenProofBody = Omit<FrozenProof, '_xenon_meta'>

export interface WriteFrozenProofParams {
  name: string
  probes: FrozenProofProbeResult[]
  runAt?: string
}

export function buildFrozenProof(params: WriteFrozenProofParams): FrozenProofBody {
  const totalCount = params.probes.length

  // 容错补全: 老 caller / 老 test fixture 只传 passed, 缺 verdict; 按 passed 推断二态后,
  // 再由 proof-runner.ts 提供的 3-state verdict 覆盖(若有)
  const normalizedProbes: FrozenProofProbeResult[] = params.probes.map((p) => {
    const inferred: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' =
      (p.verdict as 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | undefined) ?? (p.passed ? 'PASSED' : 'FAILED')
    return { ...p, verdict: inferred }
  })

  const passedCount = normalizedProbes.filter((p) => p.passed).length
  const inconclusiveCount = normalizedProbes.filter((p) => p.verdict === 'INCONCLUSIVE').length
  const failedCount = totalCount - passedCount - inconclusiveCount

  // 三态聚合:任一 INCONCLUSIVE → 整体 INCONCLUSIVE; 否则全 PASSED → PASSED; 其余 FAILED
  const verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' =
    totalCount === 0
      ? 'FAILED'
      : inconclusiveCount > 0
        ? 'INCONCLUSIVE'
        : passedCount === totalCount
          ? 'PASSED'
          : 'FAILED'

  return {
    name: params.name,
    runAt: params.runAt ?? new Date().toISOString(),
    verdict,
    totalCount,
    passedCount,
    failedCount,
    probes: normalizedProbes,
  }
}

export function writeFrozenProof(frozenPath: string, frozen: FrozenProofBody): void {
  // 构造 body（已是 body 形态，writer 内部会算签名并注入 _xenon_meta）
  writeFrozenImmutable(
    frozenPath,
    frozen as unknown as Record<string, unknown>,
    (_body, hash): FrozenXenonMetaBase => ({
      frozen_at: frozen.runAt,
      content_hash: hash,
    }),
  )
}

export interface ReadFrozenProofResult {
  ok: boolean
  frozen: FrozenProof | null
  reason?: string
}

export function readFrozenProof(frozenPath: string): ReadFrozenProofResult {
  const r = readFrozenImmutable(frozenPath, (raw) => {
    const v = safeValidateFrozenProof(raw)
    if (!v.success) {
      return { error: `frozen.json schema invalid: ${v.error.issues.map((i) => i.message).join('; ')}` }
    }
    return v.data
  })
  return {
    ok: r.ok,
    frozen: r.body as FrozenProof | null,
    reason: r.reason,
  }
}

// Re-export for backward compat with old imports
export { FROZEN_FILE_MODE, isFrozenFileReadOnly }
