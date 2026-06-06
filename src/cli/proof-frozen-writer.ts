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
import { type FrozenProof, type FrozenProofProbeResult, safeValidateFrozenProof } from '../kernel/schemas/proof-schema'

/** frozen.json 的 body 形态（不含 _xenon_meta，由 writer 注入） */
export type FrozenProofBody = Omit<FrozenProof, '_xenon_meta'>

export interface WriteFrozenProofParams {
  name: string
  probes: FrozenProofProbeResult[]
  runAt?: string
}

export function buildFrozenProof(params: WriteFrozenProofParams): FrozenProofBody {
  const passedCount = params.probes.filter((p) => p.passed).length
  const totalCount = params.probes.length
  const verdict = (passedCount === totalCount && totalCount > 0 ? 'PASSED' : 'FAILED') as 'PASSED' | 'FAILED'

  return {
    name: params.name,
    runAt: params.runAt ?? new Date().toISOString(),
    verdict,
    totalCount,
    passedCount,
    failedCount: totalCount - passedCount,
    probes: params.probes,
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
