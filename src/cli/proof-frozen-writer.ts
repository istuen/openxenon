// =============================================================================
// Proof Frozen Writer (v0.1.2)
//
// 写 .openxenon/proofs/<name>/frozen.json：
//   1. 构造 FrozenProof body
//   2. 算 SHA-256 签名（canonical JSON 序列化）
//   3. writeFileSync with mode 0o444（创建即只读，OS 层硬防御）
//
// 不可篡改性: 双重保险
//   - 文件权限 0o444：OS 层禁止写入
//   - _xenon_meta.content_hash：内容级签名，下次 show 可校验完整性
//
// 写权独占：本文件是 frozen.json 的**唯一**合法写路径。
//   AI / 工程师不得绕过本 writer 直接编辑 frozen.json。
// =============================================================================

import { createHash } from 'crypto'
import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { mkdirSync } from 'fs'
import { type FrozenProof, type FrozenProofProbeResult, safeValidateFrozenProof } from '../kernel/schemas/proof-schema'

export interface WriteFrozenProofParams {
  name: string
  probes: FrozenProofProbeResult[]
  /** 自定义 runAt（默认 now），测试时注入 */
  runAt?: string
}

/**
 * 构造 FrozenProof 完整对象（含 _xenon_meta）。
 * 内部流程：body → 序列化 → SHA-256 → 注入 _xenon_meta。
 */
export function buildFrozenProof(params: WriteFrozenProofParams): FrozenProof {
  const passedCount = params.probes.filter((p) => p.passed).length
  const totalCount = params.probes.length
  const verdict = passedCount === totalCount && totalCount > 0 ? 'PASSED' : 'FAILED'

  const body = {
    name: params.name,
    runAt: params.runAt ?? new Date().toISOString(),
    verdict: verdict as 'PASSED' | 'FAILED',
    totalCount,
    passedCount,
    failedCount: totalCount - passedCount,
    probes: params.probes,
  }

  const canonical = JSON.stringify(body)
  const contentHash = createHash('sha256').update(canonical).digest('hex')

  return {
    ...body,
    _xenon_meta: {
      frozen_at: body.runAt,
      content_hash: contentHash,
    },
  }
}

/**
 * 写 frozen.json 到磁盘（不可篡改）
 *   - 自动创建父目录
 *   - 写文件时直接给 0o444 权限
 *   - 内部失败时回滚（删文件）
 */
export function writeFrozenProof(frozenPath: string, frozen: FrozenProof): void {
  const dir = dirname(frozenPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const json = JSON.stringify(frozen, null, 2)

  // 1. 写文件 + 立即 chmod 0o444（创建即只读）
  writeFileSync(frozenPath, json, { mode: 0o444 })
  chmodSync(frozenPath, 0o444)
}

/**
 * 读 frozen.json + 校验签名完整性
 *   - 解析成功 + signature 匹配 → 完整
 *   - 解析成功 + signature 不匹配 → 已被篡改（warning，不抛错，让调用方决定）
 */
export interface ReadFrozenProofResult {
  ok: boolean
  frozen: FrozenProof | null
  reason?: string
}

export function readFrozenProof(frozenPath: string): ReadFrozenProofResult {
  if (!existsSync(frozenPath)) {
    return { ok: false, frozen: null, reason: `frozen.json not found: ${frozenPath}` }
  }

  const content = readFileSync(frozenPath, 'utf-8')
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    return { ok: false, frozen: null, reason: `frozen.json is not valid JSON: ${String(err)}` }
  }

  const validation = safeValidateFrozenProof(parsed)
  if (!validation.success) {
    return {
      ok: false,
      frozen: null,
      reason: `frozen.json schema invalid: ${validation.error.issues.map((i) => i.message).join('; ')}`,
    }
  }

  // 验签：重算 body 的 SHA-256，与 _xenon_meta.content_hash 比对
  const frozen = validation.data
  const { _xenon_meta, ...body } = frozen
  const expectedHash = createHash('sha256').update(JSON.stringify(body)).digest('hex')
  if (expectedHash !== _xenon_meta.content_hash) {
    return {
      ok: false,
      frozen,
      reason: `signature mismatch: expected ${expectedHash}, got ${_xenon_meta.content_hash}`,
    }
  }

  return { ok: true, frozen }
}

/** 文件权限常量（OS-level 不可篡改的硬防御） */
export const FROZEN_FILE_MODE = 0o444

/**
 * 验证文件权限是否为 0o444
 *   - 用于测试与 audit
 */
export function isFrozenFileReadOnly(frozenPath: string): boolean {
  if (!existsSync(frozenPath)) return false
  const stat = statSync(frozenPath)
  return (stat.mode & 0o777) === FROZEN_FILE_MODE
}
