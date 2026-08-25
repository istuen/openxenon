// =============================================================================
// plan-hash.ts — PR-2 → RFC-0033 极简化
//
// 稳定 hash 工具：把 work.md 算成可复算的 sha256 hex。
//
// 用途（RFC-0033 D3 重定义）：
//   1. submit 时刻算 work.md hash，作为"完成指纹"记入 trace.jsonl SUBMIT 事件；
//   2. AI 改 work.md 后再 submit 时，比较上次 submit 的 hash，不一致 append ASSET_DRIFT 事件（不阻断）；
//   3. 不再保护 work.md 不可改（防漂移的锁已删，HashAsSubmitFingerprint 仅记完成时刻的事实）。
//
// 稳定性要求（关键）：
//   - CRLF / LF 归一化（Windows 提交 → Linux CI 不漂）
//   - 末尾空白 / BOM 不参与 hash
//   - file 不存在 → hash 为 null（不是抛错）；调用方决定缺文件是 fail 还是 warn
//
// 复用 infra/hash 现有 HashPort，避免重复造轮子。
// =============================================================================

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { relative } from 'path'
import { hashPort } from '@openxenon/engine/infra/hash'
import { getWorkMdPath } from './dual-state-io'

// ───────── 文本 hash（归一化）─────────

/**
 * 文本归一化：
 *   - 去 BOM (\uFEFF)
 *   - CRLF → LF
 *   - 末尾多余空行折叠（保留 1 个 LF）
 *
 * 这保证：同一 work.md 在不同 OS / 编辑器下 hash 一致。
 */
export function normalizeText(text: string): string {
  let s = text
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  s = s.replace(/\r\n/g, '\n')
  s = s.replace(/\r/g, '\n')
  // 折叠末尾连续空行（保留 1 个）
  s = s.replace(/\n+$/, '\n')
  return s
}

/**
 * 文本 → sha256 hex。归一化后计算。
 */
export function hashText(text: string): string {
  return hashPort.computeHash(normalizeText(text))
}

// ───────── 文件 hash（容错）─────────

/**
 * 文件 → sha256 hex。文件不存在返回 null（不是抛错）。
 *
 * 用途：planLock 计算时允许某些文件尚未生成（如 per-work domains.json 在
 *       PR-3 之前不存在）；返回 null 后由调用方决定如何处理。
 */
export function hashFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null
  try {
    const content = readFileSync(filePath, 'utf-8')
    return hashText(content)
  } catch {
    return null
  }
}

// ───────── Work hash（submit 时刻完成指纹 · RFC-0033 D3）─────────

/**
 * Work 完成指纹（RFC-0033 D3 HashAsSubmitFingerprint）：
 *   - workMdHash   work.md 自身 sha256 hex
 *   - missing      缺失/不可读的文件名（用于 AI 报告）
 *
 * 语义（与旧 PlanLock 完全不同）：
 *   - 旧 PlanLock：4 组件 hash + combined hash，用来防 work.md 漂移（锁后改 → 阻断）
 *   - 新指纹：submit 时刻算 work.md hash，记入 trace.jsonl SUBMIT 事件；
 *     改 work.md 不阻断，只 append ASSET_DRIFT 事件；指纹数 = submit 次数
 *
 * 文件缺失 → hash 为 null；调用方决定缺文件是 fail 还是 warn。
 */
export interface PlanHash {
  workMdHash: string | null
  /** 缺失/不可读的组件名（用于 AI 报告） */
  missing: string[]
}

export function hashWorkPlan(projectRoot: string, workName: string): PlanHash {
  const workMdHash = hashFile(getWorkMdPath(projectRoot, workName))

  const missing: string[] = []
  if (workMdHash === null) missing.push('work.md')

  return { workMdHash, missing }
}

// ───────── 单文件 hash 工具（直接暴露给 CLI 调试用）─────────

/**
 * 直接算一个字符串的 sha256 hex（用 node:crypto，不走 HashPort —— 调试用）。
 * 主要供 CLI 子命令 `--print-hash` 之类场景。
 */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(normalizeText(text)).digest('hex')
}

// ───────── 资产 hash（domain/blueprint refs）─────────

/**
 * 给 asset list（[{name, scope?, version, filePath}]）算组合 hash。
 * 用于 .work.assets.<type> 锁：把引用的 domain/blueprint 的当前文件 hash
 * 快照下来，将来如果资产改了但 work.md 没改，assets 就能警告"资产漂了"。
 */
export function hashAssetList(
  assets: Array<{ name: string; scope?: string; version: number; filePath: string }>,
): string {
  // 按 name 排序；缺文件 hash 仍记入（值为 MISSING）以保证幂等
  const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name))
  const lines = sorted.map((a) => {
    const h = hashFile(a.filePath) ?? 'MISSING'
    return `${a.name}@${a.scope ?? '@prj'}#${a.version}=${h}`
  })
  return hashPort.computeHash(lines.join('\n'))
}

// ───────── 内部 helper：把 relative path 转 projectRoot-relative 字符串 ─────────

/** 给 AI 看时去掉 projectRoot 前缀，只留 .openxenon/... 相对路径 */
export function relPath(projectRoot: string, absPath: string): string {
  return relative(projectRoot, absPath) || absPath
}
