// =============================================================================
// verdict-builder.ts — 🆕 v0.6.1: Work 级 verdict.md 构建
//
// 与独立 Proof 轴 verdict.md 区别：
//   - 独立轴（proof-verdict-writer.ts）：展示 Probe 列表
//   - Work 级（本文件）：展示 Work 是什么 + 都有哪些 Task + 产物 + Probe
//
// 签名协议（与独立轴一致）：
//   - frontmatter 含 content_hash（SHA-256，self-excluding）
//   - frontmatter 含 frozen_hash（交叉引用 frozen.json）
//   - 写盘后 chmod 0o444（不可篡改）
// =============================================================================

import { createHash } from 'crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname } from 'path'
import { FROZEN_FILE_MODE } from '@openxenon/engine/infra/frozen/immutable'
import { getWorkFrozenPath, getWorkVerdictPath } from '../Work/dual-state-io'
import type { WorkEvidence } from './evidence-collector'

// ─── 签名占位符 ───
const CONTENT_HASH_PLACEHOLDER = '__PLACEHOLDER__'

/**
 * 从 WorkEvidence 构建人类可读的 verdict.md
 */
export function buildWorkVerdictMd(evidence: WorkEvidence, frozenHash: string): string {
  const lines: string[] = []

  // ─── Frontmatter（self-excluding content_hash 协议）───
  const frontmatterLines = [
    '---',
    `work: ${evidence.work.name}`,
    `verdict: ${evidence.workState.finalVerdict}`,
    `completed_at: ${evidence.workState.completedAt}`,
    `blueprint: ${evidence.work.blueprint}`,
    `goal: ${escapeYaml(evidence.work.goal)}`,
    `plan_lock_hash: ${evidence.planLock.allHash}`,
    `frozen_hash: ${frozenHash}`,
    `content_hash: ${CONTENT_HASH_PLACEHOLDER}`,
    '---',
  ]
  const frontmatter = frontmatterLines.join('\n')

  // ─── Body ───
  const verdictIcon =
    evidence.workState.finalVerdict === 'PASSED'
      ? '✅'
      : evidence.workState.finalVerdict === 'INCONCLUSIVE'
        ? '⚠️'
        : '❌'

  lines.push(frontmatter)
  lines.push('')
  lines.push(`# Verdict: ${evidence.work.name}`)
  lines.push('')
  lines.push(`> ${verdictIcon} ${evidence.workState.finalVerdict}`)
  lines.push('')

  // Work 段
  lines.push('## Work')
  lines.push('')
  lines.push(`- Name: ${evidence.work.name}`)
  lines.push(`- Goal: ${evidence.work.goal}`)
  lines.push(`- Blueprint: ${evidence.work.blueprint}`)
  if (evidence.planLock.lockedAt) {
    lines.push(`- Plan Lock: \`${evidence.planLock.allHash}\` (locked at ${evidence.planLock.lockedAt})`)
  }
  if (evidence.work.constraints.length > 0) {
    lines.push('- Constraints:')
    for (const c of evidence.work.constraints) {
      lines.push(`  - ${c}`)
    }
  }
  lines.push('')

  // Tasks & Probes 段
  lines.push('## Tasks & Probes')
  lines.push('')
  for (const task of evidence.taskEvidence) {
    const taskIcon = task.status === 'passed' ? '✅' : '❌'
    const boundary = evidence.work.tasks.find((t) => t.taskName === task.taskName)?.boundary ?? ''
    lines.push(`### Task: ${task.taskName}`)
    lines.push(`- Status: ${taskIcon} ${task.status.toUpperCase()}`)
    if (boundary) lines.push(`- Boundary: ${boundary}`)
    if (task.completedAt) lines.push(`- Completed: ${task.completedAt}`)
    lines.push('')
    if (task.probes.length === 0) {
      lines.push('（无 Probe 记录）')
    } else {
      lines.push('| Probe | 验证 | 产物 | 事实 | 结果 |')
      lines.push('|---|---|---|---|---|')
      for (const p of task.probes) {
        const pIcon = p.verdict === 'PASSED' ? '✅' : p.verdict === 'INCONCLUSIVE' ? '⚠️' : '❌'
        const artifact = p.artifact ?? '-'
        const verification = p.ref.includes('/') ? p.ref.replace(/^@oxn\/probes\//, '') : p.ref
        lines.push(
          `| ${pIcon} \`${p.probeName}\` | ${verification} | ${artifact} | ${p.passed ? '通过' : (p.errorMessage ?? '失败')} | ${pIcon} |`,
        )
      }
    }
    lines.push('')
  }

  // Boundary Violations 段
  lines.push('## Boundary Violations')
  lines.push('')
  if (evidence.boundaryViolations.length === 0) {
    lines.push('（无）')
  } else {
    for (const v of evidence.boundaryViolations) {
      lines.push(
        `- **${v.domain}** / \`${v.invariant}\` → ${v.verdict}${v.failureMessage ? `: ${v.failureMessage}` : ''}`,
      )
    }
  }
  lines.push('')

  // Summary 段
  const totalTasks = evidence.taskEvidence.length
  const passedTasks = evidence.taskEvidence.filter((t) => t.status === 'passed').length
  const failedTasks = totalTasks - passedTasks
  const allProbes = evidence.taskEvidence.flatMap((t) => t.probes)
  const totalProbes = allProbes.length
  const passedProbes = allProbes.filter((p) => p.passed).length
  const failedProbes = totalProbes - passedProbes

  lines.push('## Summary')
  lines.push('')
  lines.push('| 指标 | 值 |')
  lines.push('|---|---|')
  lines.push(`| Tasks | ${passedTasks} passed / ${failedTasks} failed |`)
  lines.push(`| Probes | ${passedProbes} passed / ${failedProbes} failed |`)
  lines.push(`| Boundary Violations | ${evidence.boundaryViolations.length} |`)
  lines.push(`| **Verdict** | **${evidence.workState.finalVerdict}** |`)
  lines.push('')

  const body = lines.join('\n')

  // ─── 算 content_hash（self-excluding：剥 content_hash 行）───
  const canonicalBody = body.replace(`content_hash: ${CONTENT_HASH_PLACEHOLDER}`, 'content_hash: ')
  const contentHash = createHash('sha256').update(canonicalBody).digest('hex')

  // ─── 用真实 hash 替换占位符 ───
  return body.replace(`content_hash: ${CONTENT_HASH_PLACEHOLDER}`, `content_hash: ${contentHash}`)
}

/**
 * 写 verdict.md 到磁盘（不可篡改）
 *   1. buildWorkVerdictMd 构造 body（含 content_hash 签名）
 *   2. 写盘 + chmod 0o444
 */
export function writeWorkVerdictMd(projectRoot: string, workName: string, evidence: WorkEvidence): void {
  // 读 Work 级 frozen.json 的 content_hash 用于交叉引用
  const frozenPath = getWorkFrozenPath(projectRoot, workName)
  let frozenHash = ''
  if (existsSync(frozenPath)) {
    try {
      const frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
      frozenHash = frozen._xenon_meta?.content_hash ?? ''
    } catch {
      // 忽略解析错误
    }
  }

  const body = buildWorkVerdictMd(evidence, frozenHash)

  const verdictPath = getWorkVerdictPath(projectRoot, workName)
  const dir = dirname(verdictPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // 写盘模式：若已存在且 mode=0o444，先抬位再写
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
 * YAML 转义
 */
function escapeYaml(s: string): string {
  if (/^[A-Za-z0-9_\-:./]+$/.test(s)) return s
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}
