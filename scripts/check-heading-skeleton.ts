#!/usr/bin/env bun
/**
 * check-heading-skeleton.ts — Draft 骨架守门（v0.7.5 重写）
 *
 * version: 0.7.5
 * synced-at: 2026-08-09
 *
 * v0.7.5 重写：
 * - 路径从 v0.2 era `pools/<pool-name>/` → v0.6+ `.openxenon/drafts/<DraftType>-<slug>.md`
 * - DraftType 从 5 pool（research/design/issue/audit/journal）→ 3 DraftType（design/report/issue）+ RFC 子目录
 * - 骨架规范从「research 池必填 What/Why/Reference」→ 当前 RFC / Issue / Report 的真实 Heading 结构
 * - Design Draft 探索性 → 不强制骨架（warning-only 或跳过）
 *
 * 物理路径：scripts/check-heading-skeleton.ts
 * 父文档：docs/dev/zh-cn/three-tier-docs.md + oxn-draft-domain.md
 *
 * 用法：
 *   bun scripts/check-heading-skeleton.ts <dir1> [dir2 ...]
 *   bun scripts/check-heading-skeleton.ts .openxenon/drafts/
 *
 * 输出：JSON 形式 { checked, passed, failed, errors, skipped }
 * 退出码：0 = 全部通过或无强制骨架；1 = 有 .md 缺必填 heading
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { validateHeadingSkeleton, type HeadingSkeletonSpec } from '@openxenon/engine/infra/markdown-headings'

/**
 * v0.7.5 DraftType 骨架规范
 * - rfc: 严格必填骨架（RFC 是冻结产物）
 * - issue: 推荐骨架（Issue Draft 收尾前应有 evidence）
 * - report: 推荐骨架（Report 需 What / Why / How / Evidence）
 * - design: 探索性骨架（不强制，warning-only）
 */
const DRAFT_SPECS: Record<string, HeadingSkeletonSpec> = {
  rfc: {
    required: ['## 决策要点', '## 影响范围', '## 相关术语', '## 相关决策', '## Errata'],
    optional: ['## 摘要', '## 推迟', '## 实施路径'],
    order: 'flexible',
  },
  issue: {
    required: ['## 复现步骤', '## 期望', '## 实际'],
    optional: ['## 根因', '## 修复', '## 验证'],
    order: 'flexible',
  },
  report: {
    // report 是探索性骨架（与 design 同级；推荐含 TL;DR / 时间线但不强制）
    required: [],
    optional: ['## TL;DR', '## 时间线', '## 结论', '## 证据'],
    order: 'flexible',
  },
  design: {
    // design 是探索性骨架，不强制
    required: [],
    optional: ['## 背景', '## 核心设计', '## 决策点', '## 关联', '## 下一步'],
    order: 'flexible',
  },
}

/**
 * 从文件路径推 DraftType
 * - `rfc/rfc-XXXX-<slug>.md` → rfc
 * - `issue-<slug>.md` → issue
 * - `report-<slug>.md` → report
 * - `design-<slug>.md` → design
 * - 其他 → null（跳过）
 */
function draftTypeFromPath(filePath: string): string | null {
  // rfc 子目录
  const rfcMatch = filePath.match(/\/drafts\/rfc\/(.+)\.md$/)
  if (rfcMatch) return 'rfc'
  // 顶层 draft-*.md 按前缀
  const prefixMatch = filePath.match(/\/drafts\/(draft|design|report|issue)-(.+)\.md$/)
  if (prefixMatch) return prefixMatch[1]!
  return null
}

interface CheckResult {
  checked: number
  passed: number
  failed: string[]
  skipped: number
  errors: Array<{ file: string; missing: string[]; unexpected: string[] }>
}

export function checkDirectories(dirs: string[]): CheckResult {
  const result: CheckResult = { checked: 0, passed: 0, failed: [], skipped: 0, errors: [] }

  for (const dir of dirs) {
    walkDraftTree(dir, result)
  }

  return result
}

/**
 * DFS 递归 walk Draft 目录树。
 * - 跳过 `.archived/`（约定不检查归档）
 * - 对每个 .md 文件调 draftTypeFromPath 推类型，不匹配则跳过
 * - 递归到子目录（修复 v3.2.1 pre-existing：rfc/ 子目录路径被丢弃的 bug）
 */
function walkDraftTree(dir: string, result: CheckResult): void {
  let entries: string[]
  try {
    if (!statSync(dir).isDirectory()) return
    entries = readdirSync(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    let st
    try {
      st = statSync(fullPath)
    } catch {
      continue
    }

    if (st.isFile() && fullPath.endsWith('.md')) {
      checkDraftFile(fullPath, result)
    } else if (st.isDirectory()) {
      // 跳过 .archived/ 目录（约定不检查归档草稿）
      if (entry === '.archived') continue
      // 递归 walk 子目录（如 drafts/rfc/）
      walkDraftTree(fullPath, result)
    }
  }
}

/**
 * 检查单个 Draft 文件的骨架是否符合 DRAFT_SPECS[draftType].required。
 */
function checkDraftFile(filePath: string, result: CheckResult): void {
  const draftType = draftTypeFromPath(filePath)
  if (!draftType) return // 非 Draft 路径，跳过

  const spec = DRAFT_SPECS[draftType]
  if (!spec) return

  result.checked++

  // design 是探索性，无 required → 直接通过
  if (spec.required.length === 0) {
    result.passed++
    return
  }

  const content = readFileSync(filePath, 'utf-8')
  const v = validateHeadingSkeleton(content, spec)
  if (v.ok) {
    result.passed++
  } else {
    result.failed.push(filePath)
    result.errors.push({ file: filePath, missing: v.missing, unexpected: v.unexpected })
  }
}

// CLI 入口

// CLI 入口
if (import.meta.main) {
  const dirs = process.argv.slice(2)
  if (dirs.length === 0) {
    console.error('Usage: bun scripts/check-heading-skeleton.ts <dir1> [dir2 ...]')
    process.exit(1)
  }
  const result = checkDirectories(dirs)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.failed.length > 0 ? 1 : 0)
}
