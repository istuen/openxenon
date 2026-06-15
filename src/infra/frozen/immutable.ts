// =============================================================================
// Frozen Immutable Writer (v0.1.2)
//
// 共享工具：把"frozen.json 不可篡改"约束（chmod 0o444 + SHA-256 签名）
// 抽象成一处，避免 proof-frozen-writer / task-frozen-writer 各写一份。
//
// IAP 第一法则兑现：frozen.json 由 Core 独占写权，AI / 工程师禁手改。
//   ① OS 层：writeFileSync mode 0o444（创建即只读）
//   ② 内容层：body 的 canonical JSON 摘要作为 _xenon_meta.content_hash
//
// 两种 frozen.json 都走这一处（schema 不同但写权约束一致）：
//   - .openxenon/proofs/<name>/frozen.json       — Proof-First
//   - .openxenon/works/<w>/tasks/<t>/frozen.json — IAP 完整模式
// =============================================================================

import { createHash } from 'crypto'
import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from '../../infra/filesystem'
import { mkdirSync } from '../../infra/filesystem'
import { dirname } from 'path'

/** frozen.json 文件权限：创建即只读（OS 层硬防御） */
export const FROZEN_FILE_MODE = 0o444

/** _xenon_meta.content_hash 的最小公共形态 */
export interface FrozenXenonMetaBase {
  frozen_at: string
  content_hash: string
}

/** 不带 _xenon_meta 的 body 形态（任意用户 schema） */
export type FrozenBody = Record<string, unknown>

/**
 * 写 frozen.json 到磁盘（不可篡改）。
 *   1. 构造 canonical body（剥 _xenon_meta）
 *   2. SHA-256(canonical body) → _xenon_meta.content_hash
 *   3. writeFileSync with mode 0o444（创建即只读）
 *   4. 显式 chmod 0o444 二次保险（应对 umask 干扰）
 */
export function writeFrozenImmutable<TBody extends FrozenBody, TMeta extends FrozenXenonMetaBase>(
  frozenPath: string,
  body: TBody,
  metaBuilder: (body: TBody, hash: string) => TMeta,
): void {
  const dir = dirname(frozenPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // 1. 算签名
  const canonical = JSON.stringify(body)
  const contentHash = createHash('sha256').update(canonical).digest('hex')

  // 2. 构造 _xenon_meta
  const meta = metaBuilder(body, contentHash)

  // 3. 写 body + meta
  const full = { ...body, _xenon_meta: meta } as TBody & { _xenon_meta: TMeta }
  const json = JSON.stringify(full, null, 2)

  // 4. 写文件 + 立即 chmod 0o444
  //    覆盖场景：若文件已存在且 mode=0o444（来自上一轮 frozen writer），
  //    owner 先抬位到 0o644 才能 writeFileSync；写完用 try/finally 保证
  //    必回锁 0o444（即使 writeFileSync 抛错也回锁，兑现 IAP 不变量）。
  //    spec: "chmod 0o644 → 写 → chmod 0o444"
  if (existsSync(frozenPath)) {
    chmodSync(frozenPath, 0o644)
  }
  try {
    writeFileSync(frozenPath, json, { mode: FROZEN_FILE_MODE })
  } finally {
    chmodSync(frozenPath, FROZEN_FILE_MODE)
  }
}

/**
 * 读 frozen.json + 校验签名完整性
 *   - body 校验通过 + signature 匹配 → ok=true
 *   - body 校验通过 + signature 不匹配 → ok=false + reason="signature mismatch"（被篡改）
 *   - 解析失败 / schema 失败 → ok=false + reason
 */
export interface ReadFrozenResult<T> {
  ok: boolean
  body: T | null
  reason?: string
}

export function readFrozenImmutable<T extends FrozenBody & { _xenon_meta: FrozenXenonMetaBase }>(
  frozenPath: string,
  bodyValidator: (raw: unknown) => T | { error: string },
): ReadFrozenResult<T> {
  if (!existsSync(frozenPath)) {
    return { ok: false, body: null, reason: `frozen.json not found: ${frozenPath}` }
  }

  const content = readFileSync(frozenPath, 'utf-8')
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    return { ok: false, body: null, reason: `frozen.json is not valid JSON: ${String(err)}` }
  }

  const result = bodyValidator(parsed)
  if (result && typeof result === 'object' && 'error' in result) {
    return { ok: false, body: null, reason: (result as { error: string }).error }
  }

  // 验签：重算 body 的 SHA-256，与 _xenon_meta.content_hash 比对
  // 注意:必须用 raw `parsed` 去掉 _xenon_meta 后再 hash,不能 hash zod `result`——
  // zod 在 re-emit 时会按 schema 声明顺序重排 key,导致与 writer 端 hash 不一致。
  // writer 端 hash 的是 writer 自己构造的 body(原始 key 顺序),reader 端必须对应。
  const { _xenon_meta: _rawMeta, ...rawBody } = parsed as Record<string, unknown> & {
    _xenon_meta: FrozenXenonMetaBase
  }
  const _xenon_meta = _rawMeta
  const expectedHash = createHash('sha256').update(JSON.stringify(rawBody)).digest('hex')
  if (expectedHash !== _xenon_meta.content_hash) {
    return {
      ok: false,
      body: result,
      reason: `signature mismatch: expected ${expectedHash}, got ${_xenon_meta.content_hash}`,
    }
  }

  return { ok: true, body: result }
}

/** 文件权限审计 */
export function isFrozenFileReadOnly(frozenPath: string): boolean {
  if (!existsSync(frozenPath)) return false
  const stat = statSync(frozenPath)
  return (stat.mode & 0o777) === FROZEN_FILE_MODE
}
