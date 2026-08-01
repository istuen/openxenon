// =============================================================================
// Proof Outcome .md Writer (v0.5 PR-A; RFC-0015 D1.1 全面重命名)
//
// 写 .openxenon/proofs/<name>/outcome.md：
//   1. buildOutcomeMd 构造 body（含 YAML frontmatter）
//   2. writeOutcomeMd 写盘 + chmod 0o444 + SHA-256 content_hash 签名
//
// 与 frozen.json 的关系：
//   - frozen.json 保持机器 SSOT（已有）
//   - outcome.md 是人类消费的"视图"，两者 chmod 0o444 同时产出
//   - outcome.md frontmatter 含 frozen_hash 字段，交叉引用 frozen.json 的 SHA-256
//   - outcome.md frontmatter 含 content_hash 字段，签名自身（详见 §签名协议）
//
// 写权独占：本模块是 outcome.md 的**唯一**合法写路径（AI / 工程师禁手改）。
//
// 历史命名（RFC-0015 D1.1 之前）：本模块曾命名为 verdict-writer.ts；函数曾命名
//   buildVerdictMd / writeVerdictMd / readVerdictMd；类型曾命名 VerdictMdBody 等。
//   RFC-0008 D2 verdict → outcome 术语迁移时文件值已改 'verdict.md' → 'outcome.md'，
//   但标识符全部残留 'verdict'。RFC-0015 D1.1 完成系统性重命名，旧标识符作为
//   @deprecated alias 保留 1 个大版本（v0.8.x）以便外部用户迁移，v0.9.0 物理删除。
//
// 设计参考：v0.5-proof-insight-loop RFC §PR-A
// =============================================================================

import { createHash } from 'crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname } from 'path'
import { FROZEN_FILE_MODE } from '@openxenon/engine/infra/frozen/immutable'
import type { FrozenProof, FrozenProofProbeResult } from '@openxenon/engine/kernel'
// proof-probe-description-target D5: 复用 extraction.ts 的 extractTarget (DRY, 正确层级)
import { extractTarget } from '@openxenon/engine/kernel/verdicts/extraction'

// ─── 签名协议 ────────────────────────────────────────────────────────────────
//
// content_hash 在 frontmatter 内，但签名计算**不**包含自身行。
//   canonical_body = full_body - (frontmatter 内的 content_hash 行)
//   content_hash   = SHA-256(canonical_body)
//
// 签名前 body 形态：frontmatter 中 content_hash 字段为占位符 `__PLACEHOLDER__`
// 签名后 body 形态：content_hash = SHA-256(canonical_body) 替换占位符
//
// 验签时：reader 拿到的 body 含真实 hash，先剥掉 content_hash 行再算 hash 比对。
// 与 frozen.json 的 _xenon_meta 设计哲学一致：hash 是内容的指纹，self-excluding。
// ──────────────────────────────────────────────────────────────────────────────

/** outcome.md body（含 YAML frontmatter） */
export type OutcomeMdBody = string
/**
 * @deprecated Use OutcomeMdBody instead. Will be removed in v0.9.0. (RFC-0015 D1.1)
 */
export type VerdictMdBody = OutcomeMdBody

/** buildOutcomeMd 的入参：直接复用 FrozenProof，零额外信息 */
export type BuildOutcomeMdParams = FrozenProof
/**
 * @deprecated Use BuildOutcomeMdParams instead. Will be removed in v0.9.0. (RFC-0015 D1.1)
 */
export type BuildVerdictMdParams = BuildOutcomeMdParams

/** frontmatter 中的占位符 — 实际 hash 计算时先替换为空字符串 */
const CONTENT_HASH_PLACEHOLDER = '__PLACEHOLDER__'

/**
 * 从 FrozenProof 构造 outcome.md body（含 YAML frontmatter）。
 *
 * 格式：
 *   ---
 *   proof_id: <name>
 *   outcome: COMPLETED|DEVIATED|INCONCLUSIVE
 *   run_at: <ISO 8601>
 *   frozen_hash: <sha256 of frozen.json body>
 *   probe_count: N
 *   passed_count: N
 *   failed_count: N
 *   [inconclusive_count: N]
 *   content_hash: <sha256 of body, excl. content_hash line>
 *   ---
 *   <markdown body>
 */
export function buildOutcomeMd(frozen: FrozenProof): OutcomeMdBody {
  const inconclusiveCount = frozen.probes.filter((p) => p.outcome === 'INCONCLUSIVE').length

  // 第一遍：构造不含真实 content_hash 的 frontmatter + body
  const frontmatterLines = [
    '---',
    `proof_id: ${escapeYaml(frozen.name)}`,
    `outcome: ${frozen.outcome}`,
    `run_at: ${escapeYaml(frozen.runAt)}`,
    `frozen_hash: ${frozen._xenon_meta.content_hash}`,
    `probe_count: ${frozen.totalCount}`,
    `passed_count: ${frozen.passedCount}`,
    `failed_count: ${frozen.failedCount}`,
    ...(inconclusiveCount > 0 ? [`inconclusive_count: ${inconclusiveCount}`] : []),
    `content_hash: ${CONTENT_HASH_PLACEHOLDER}`,
    '---',
  ]
  const frontmatter = frontmatterLines.join('\n')

  const bodyLines: string[] = []

  // H1 + 引言 blockquote
  bodyLines.push('')
  bodyLines.push(`# Proof: ${frozen.name}`)
  bodyLines.push('')
  const outcomeIcon = frozen.outcome === 'COMPLETED' ? '✅' : frozen.outcome === 'INCONCLUSIVE' ? '⚠️' : '❌'
  bodyLines.push(
    `> **Outcome**: ${outcomeIcon} ${frozen.outcome} (${frozen.passedCount}/${frozen.totalCount} probes passed)`,
  )
  bodyLines.push(`> **Run at**: ${frozen.runAt}`)
  bodyLines.push(`> **Frozen**: \`frozen.json\` (SHA-256: \`${frozen._xenon_meta.content_hash}\`)`)
  bodyLines.push('')

  // Evidence section
  bodyLines.push('## Evidence')
  bodyLines.push('')
  for (const probe of frozen.probes) {
    // proof-probe-description-target D7: target 显示优先级 — 显式 probe.target 优先, 无声明从 extractTarget 派生
    const effectiveTarget = probe.target ?? extractTarget(probe)
    const icon = probe.outcome === 'COMPLETED' ? '✅' : probe.outcome === 'INCONCLUSIVE' ? '⚠️' : '❌'
    const targetStr = effectiveTarget ? ` \`${effectiveTarget}\`` : ''
    const errLine = probe.errorMessage ? `\n  - error: ${probe.errorMessage}` : ''
    const flagsLine =
      probe.interferenceFlags && probe.interferenceFlags.length > 0
        ? `\n  - flags: ${probe.interferenceFlags.join(', ')}`
        : ''
    // proof-probe-description-target D7: description (intent 层) 子行, 无 description 时不显示
    const intentLine = probe.description ? `\n  - intent: ${probe.description}` : ''
    bodyLines.push(
      `- ${icon} **${probe.probeName}** \`${probe.ref}\`${targetStr} (${probe.outcome}, ${probe.durationMs}ms)${errLine}${flagsLine}${intentLine}`,
    )
  }
  bodyLines.push('')

  // Outcome Summary section
  bodyLines.push('## Outcome Summary')
  bodyLines.push('')
  bodyLines.push('| Metric | Value |')
  bodyLines.push('|--------|-------|')
  bodyLines.push(`| Total probes | ${frozen.totalCount} |`)
  bodyLines.push(`| Passed | ${frozen.passedCount} |`)
  bodyLines.push(`| Failed | ${frozen.failedCount} |`)
  if (inconclusiveCount > 0) {
    bodyLines.push(`| Inconclusive | ${inconclusiveCount} |`)
  }
  bodyLines.push(`| **Overall outcome** | **${frozen.outcome}** |`)
  bodyLines.push('')

  // Interference section
  const allFlags = collectInterferenceFlags(frozen.probes)
  bodyLines.push('## Interference')
  bodyLines.push('')
  if (allFlags.length === 0) {
    bodyLines.push('_(none detected)_')
  } else {
    bodyLines.push('Interference flags observed across probes:')
    bodyLines.push('')
    for (const flag of allFlags) {
      bodyLines.push(`- \`${flag}\``)
    }
  }
  bodyLines.push('')

  const bodyContent = bodyLines.join('\n')

  // 第二遍：组装占位符版本的完整 body
  const placeholderBody = `${frontmatter}\n${bodyContent}`

  // 第三遍：算 canonical body 的 SHA-256（剥掉 content_hash 行）
  const canonicalBody = placeholderBody.replace(`content_hash: ${CONTENT_HASH_PLACEHOLDER}`, 'content_hash: ')
  const contentHash = createHash('sha256').update(canonicalBody).digest('hex')

  // 第四遍：用真实 hash 替换占位符 → 最终 body
  return placeholderBody.replace(`content_hash: ${CONTENT_HASH_PLACEHOLDER}`, `content_hash: ${contentHash}`)
}

// proof-probe-description-target D5: 本地 extractTarget 已删除, 改 import @openxenon/engine/kernel/verdicts/extraction
// 原实现错误 (在 output 顶层找 params/target/path, 实际 params 在 output.outcome.params)
/** 收集所有 probe 的 interference flags（去重）*/
function collectInterferenceFlags(probes: FrozenProofProbeResult[]): string[] {
  const seen = new Set<string>()
  for (const p of probes) {
    if (p.interferenceFlags) {
      for (const f of p.interferenceFlags) seen.add(f)
    }
  }
  return Array.from(seen).sort()
}

/** YAML frontmatter 字符串转义（双引号包裹时内部双引号需转义）*/
function escapeYaml(s: string): string {
  if (/^[A-Za-z0-9_\-:./]+$/.test(s)) return s
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * 写 outcome.md 到磁盘（不可篡改）。
 *   1. buildOutcomeMd 构造 body（含 content_hash 签名）
 *   2. 写盘 + chmod 0o444
 *
 * 注：与 frozen.json 的写盘流程独立。outcome.md 写失败**不影响** frozen.json 已写入的主流程。
 */
export function writeOutcomeMd(outcomePath: string, frozen: FrozenProof): void {
  const dir = dirname(outcomePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const body = buildOutcomeMd(frozen)

  // 与 frozen.json 相同的写盘模式：若已存在且 mode=0o444，先抬位再写
  if (existsSync(outcomePath)) {
    try {
      chmodSync(outcomePath, 0o644)
    } catch {
      /* ignore */
    }
  }
  try {
    writeFileSync(outcomePath, body, { mode: FROZEN_FILE_MODE })
  } finally {
    try {
      chmodSync(outcomePath, FROZEN_FILE_MODE)
    } catch {
      /* ignore */
    }
  }
}

/**
 * 读 outcome.md + 校验 content_hash 完整性。
 *   - 文件存在 + signature 匹配 → ok=true
 *   - signature 不匹配 → ok=false + reason="signature mismatch"（被篡改）
 *   - 解析失败 / 文件不存在 → ok=false + reason
 *
 * 通过 L1-Infra filesystem 接口读写，遵守 L0→L1→L3 分层。
 */
export interface ReadOutcomeMdResult {
  ok: boolean
  body: string | null
  contentHash: string | null
  frozenHash: string | null
  reason?: string
}

/**
 * @deprecated Use ReadOutcomeMdResult instead. Will be removed in v0.9.0. (RFC-0015 D1.1)
 */
export type ReadVerdictMdResult = ReadOutcomeMdResult

export function readOutcomeMd(outcomePath: string): ReadOutcomeMdResult {
  if (!existsSync(outcomePath)) {
    return {
      ok: false,
      body: null,
      contentHash: null,
      frozenHash: null,
      reason: `outcome.md not found: ${outcomePath}`,
    }
  }

  const content = readFileSync(outcomePath, 'utf-8')

  // 解析 frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!fmMatch) {
    return {
      ok: false,
      body: null,
      contentHash: null,
      frozenHash: null,
      reason: 'outcome.md frontmatter not found',
    }
  }
  const fmBody = fmMatch[1] ?? ''

  const contentHashMatch = fmBody.match(/content_hash:\s*([a-f0-9]{64})/)
  const frozenHashMatch = fmBody.match(/frozen_hash:\s*([a-f0-9]{64})/)
  const claimedHash = contentHashMatch?.[1] ?? null
  const frozenHash = frozenHashMatch?.[1] ?? null

  if (!claimedHash) {
    return {
      ok: false,
      body: null,
      contentHash: null,
      frozenHash,
      reason: 'outcome.md content_hash not found in frontmatter',
    }
  }

  // 验签：重算 body 的 SHA-256（剥掉 content_hash 行）
  const canonicalBody = content.replace(/content_hash: [a-f0-9]{64}/, 'content_hash: ')
  const expectedHash = createHash('sha256').update(canonicalBody).digest('hex')

  if (expectedHash !== claimedHash) {
    return {
      ok: false,
      body: content,
      contentHash: claimedHash,
      frozenHash,
      reason: `signature mismatch: expected ${expectedHash}, got ${claimedHash}`,
    }
  }

  return { ok: true, body: content, contentHash: claimedHash, frozenHash }
}

/** Re-export for backward compat with old imports */
export { FROZEN_FILE_MODE }

/* ─── Deprecated aliases (RFC-0015 D1.1; 保留至 v0.9.0 删除) ─── */
export const buildVerdictMd = buildOutcomeMd
export const writeVerdictMd = writeOutcomeMd
export const readVerdictMd = readOutcomeMd
