// =============================================================================
// markdown-headings.ts (v0.2 Sprint 4 T8)
//
// 校验 markdown 文件的 heading 骨架
// 父文档: §T4.3 — 用于 scripts/check-heading-skeleton.ts 与 pool writer 写入时的预检
//
// 解析规则: 行首 ^#{1,6}\s 视为 heading; 不在 ```代码块``` 内的 # 才计 (避免误识别)
// 顺序: order='strict' 强制按 spec 顺序; 'flexible' 只要求 required 全在场
//
// L1-Infra 层 — 纯 string 操作
// 不得 import 上层
// =============================================================================

export interface HeadingSkeletonSpec {
  /** 必填 heading 列表 (含 #, e.g. ['# What', '# Why', '# How']) */
  required: string[]
  /** 可选 heading 列表 (若出现不报错) */
  optional?: string[]
  /** 'strict' = 按 spec 顺序; 'flexible' = 仅要求 required 全在场 (默认 'flexible') */
  order?: 'strict' | 'flexible'
}

export type HeadingSkeletonResult =
  | { ok: true; headings: string[] }
  | { ok: false; missing: string[]; unexpected: string[]; headings: string[] }

const FENCE_PATTERN = /^```/

/** 提取 markdown 内容的所有 heading (# 1-6), 排除代码块内的 */
export function extractHeadings(content: string): string[] {
  const lines = content.split('\n')
  const headings: string[] = []
  let inFence = false
  for (const line of lines) {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    // 复用 HEADING_PATTERN (取 m 标志做行级匹配)
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (m) {
      headings.push(`${m[1]} ${m[2]}`)
    }
  }
  return headings
}

/** 校验 heading 骨架 */
export function validateHeadingSkeleton(content: string, spec: HeadingSkeletonSpec): HeadingSkeletonResult {
  const headings = extractHeadings(content)
  const order = spec.order ?? 'flexible'

  const requiredSet = new Set(spec.required)
  const allowedSet = new Set([...spec.required, ...(spec.optional ?? [])])

  // missing: required 中未出现的
  const missing: string[] = spec.required.filter((r) => !headings.includes(r))

  // unexpected: 不在 allowed 集合的
  const unexpected: string[] = headings.filter((h) => !allowedSet.has(h))

  if (missing.length === 0 && unexpected.length === 0 && order === 'flexible') {
    return { ok: true, headings }
  }

  if (order === 'strict') {
    // strict 模式: required 按 spec 顺序出现在 headings 中
    let cursor = 0
    for (const h of headings) {
      if (cursor >= spec.required.length) break
      if (h === spec.required[cursor]) cursor++
      else if (requiredSet.has(h)) {
        // 必需 heading 但顺序错
        return { ok: false, missing: [], unexpected, headings }
      }
    }
    if (cursor < spec.required.length) {
      return { ok: false, missing: spec.required.slice(cursor), unexpected, headings }
    }
    if (unexpected.length > 0) {
      return { ok: false, missing: [], unexpected, headings }
    }
    return { ok: true, headings }
  }

  return { ok: false, missing, unexpected, headings }
}
