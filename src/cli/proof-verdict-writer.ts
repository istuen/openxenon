// =============================================================================
// Proof Verdict .md Writer (v0.5 PR-A)
//
// 写 .openxenon/proofs/<name>/verdict.md：
//   1. buildVerdictMd 构造 body（含 YAML frontmatter）
//   2. writeVerdictMd 写盘 + chmod 0o444 + SHA-256 content_hash 签名
//
// 与 frozen.json 的关系：
//   - frozen.json 保持机器 SSOT（已有）
//   - verdict.md 是人类消费的"视图"，两者 chmod 0o444 同时产出
//   - verdict.md frontmatter 含 frozen_hash 字段，交叉引用 frozen.json 的 SHA-256
//   - verdict.md frontmatter 含 content_hash 字段，签名自身（详见 §签名协议）
//
// 写权独占：本模块是 verdict.md 的**唯一**合法写路径（AI / 工程师禁手改）。
//
// 设计参考：v0.5-proof-insight-loop RFC §PR-A
// =============================================================================

import { createHash } from 'crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from '../infra/filesystem'
import { dirname } from 'path'
import { FROZEN_FILE_MODE } from '../infra/frozen/immutable'
import type { FrozenProof, FrozenProofProbeResult } from '../kernel/index'

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

/** verdict.md body（含 YAML frontmatter） */
export type VerdictMdBody = string

/** buildVerdictMd 的入参：直接复用 FrozenProof，零额外信息 */
export type BuildVerdictMdParams = FrozenProof

/** frontmatter 中的占位符 — 实际 hash 计算时先替换为空字符串 */
const CONTENT_HASH_PLACEHOLDER = '__PLACEHOLDER__'

/**
 * 从 FrozenProof 构造 verdict.md body（含 YAML frontmatter）。
 *
 * 格式：
 *   ---
 *   proof_id: <name>
 *   verdict: PASSED|FAILED|INCONCLUSIVE
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
export function buildVerdictMd(frozen: FrozenProof): VerdictMdBody {
  const inconclusiveCount = frozen.probes.filter((p) => p.verdict === 'INCONCLUSIVE').length

  // 第一遍：构造不含真实 content_hash 的 frontmatter + body
  const frontmatterLines = [
    '---',
    `proof_id: ${escapeYaml(frozen.name)}`,
    `verdict: ${frozen.verdict}`,
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
  const verdictIcon = frozen.verdict === 'PASSED' ? '✅' : frozen.verdict === 'INCONCLUSIVE' ? '⚠️' : '❌'
  bodyLines.push(
    `> **Verdict**: ${verdictIcon} ${frozen.verdict} (${frozen.passedCount}/${frozen.totalCount} probes passed)`,
  )
  bodyLines.push(`> **Run at**: ${frozen.runAt}`)
  bodyLines.push(`> **Frozen**: \`frozen.json\` (SHA-256: \`${frozen._xenon_meta.content_hash}\`)`)
  bodyLines.push('')

  // Evidence section
  bodyLines.push('## Evidence')
  bodyLines.push('')
  for (const probe of frozen.probes) {
    const target = extractTarget(probe)
    const icon = probe.verdict === 'PASSED' ? '✅' : probe.verdict === 'INCONCLUSIVE' ? '⚠️' : '❌'
    const targetStr = target ? ` \`${target}\`` : ''
    const errLine = probe.errorMessage ? `\n  - error: ${probe.errorMessage}` : ''
    const flagsLine =
      probe.interferenceFlags && probe.interferenceFlags.length > 0
        ? `\n  - flags: ${probe.interferenceFlags.join(', ')}`
        : ''
    bodyLines.push(
      `- ${icon} **${probe.probeName}** \`${probe.ref}\`${targetStr} (${probe.verdict}, ${probe.durationMs}ms)${errLine}${flagsLine}`,
    )
  }
  bodyLines.push('')

  // Verdict Summary section
  bodyLines.push('## Verdict Summary')
  bodyLines.push('')
  bodyLines.push('| Metric | Value |')
  bodyLines.push('|--------|-------|')
  bodyLines.push(`| Total probes | ${frozen.totalCount} |`)
  bodyLines.push(`| Passed | ${frozen.passedCount} |`)
  bodyLines.push(`| Failed | ${frozen.failedCount} |`)
  if (inconclusiveCount > 0) {
    bodyLines.push(`| Inconclusive | ${inconclusiveCount} |`)
  }
  bodyLines.push(`| **Overall verdict** | **${frozen.verdict}** |`)
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

/**
 * 提取 probe 的 target（文件路径 / URL / 命令）。
 *   - 从 probe 的 output 字段里挑第一个看起来像路径或 URL 的字符串值
 *   - output 是 unknown（Probe 自定义），只挑"第一个非空字符串"作为最佳猜测
 *   - 找不到时返回 undefined（Evidence 行不显示 target 部分）
 */
function extractTarget(probe: FrozenProofProbeResult): string | undefined {
  const output = probe.output
  if (output === null || output === undefined) return undefined
  if (typeof output !== 'object') return undefined
  // 尝试常见位置：output.params / output.target / output.path / output.url / output.command
  const obj = output as Record<string, unknown>
  const candidates = [obj.params, obj.target, obj.path, obj.url, obj.command, obj.file]
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c
    if (c && typeof c === 'object') {
      // 若是 params 对象（如 { path: "./x" }），递归找第一个 string 值
      for (const v of Object.values(c as Record<string, unknown>)) {
        if (typeof v === 'string' && v.length > 0) return v
      }
    }
  }
  return undefined
}

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
 * 写 verdict.md 到磁盘（不可篡改）。
 *   1. buildVerdictMd 构造 body（含 content_hash 签名）
 *   2. 写盘 + chmod 0o444
 *
 * 注：与 frozen.json 的写盘流程独立。verdict.md 写失败**不影响** frozen.json 已写入的主流程。
 */
export function writeVerdictMd(verdictPath: string, frozen: FrozenProof): void {
  const dir = dirname(verdictPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const body = buildVerdictMd(frozen)

  // 与 frozen.json 相同的写盘模式：若已存在且 mode=0o444，先抬位再写
  if (existsSync(verdictPath)) {
    try {
      chmodSync(verdictPath, 0o644)
    } catch {
      /* ignore */
    }
  }
  try {
    writeFileSync(verdictPath, body, { mode: FROZEN_FILE_MODE })
  } finally {
    try {
      chmodSync(verdictPath, FROZEN_FILE_MODE)
    } catch {
      /* ignore */
    }
  }
}

/**
 * 读 verdict.md + 校验 content_hash 完整性。
 *   - 文件存在 + signature 匹配 → ok=true
 *   - signature 不匹配 → ok=false + reason="signature mismatch"（被篡改）
 *   - 解析失败 / 文件不存在 → ok=false + reason
 *
 * 通过 L1-Infra filesystem 接口读写，遵守 L0→L1→L3 分层。
 */
export interface ReadVerdictMdResult {
  ok: boolean
  body: string | null
  contentHash: string | null
  frozenHash: string | null
  reason?: string
}

export function readVerdictMd(verdictPath: string): ReadVerdictMdResult {
  if (!existsSync(verdictPath)) {
    return {
      ok: false,
      body: null,
      contentHash: null,
      frozenHash: null,
      reason: `verdict.md not found: ${verdictPath}`,
    }
  }

  const content = readFileSync(verdictPath, 'utf-8')

  // 解析 frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!fmMatch) {
    return {
      ok: false,
      body: null,
      contentHash: null,
      frozenHash: null,
      reason: 'verdict.md frontmatter not found',
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
      reason: 'verdict.md content_hash not found in frontmatter',
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
