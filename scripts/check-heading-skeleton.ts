#!/usr/bin/env bun
// =============================================================================
// check-heading-skeleton.ts (v0.2 Sprint 4 T8)
//
// 扫指定目录下的 .md 文件, 校验 heading 骨架
// 物理路径: scripts/check-heading-skeleton.ts
// 父文档: §T4.4 — lefthook pre-commit 钩子 + 人工 'bun <script> <dir>' 调用
//
// 用法:
//   bun scripts/check-heading-skeleton.ts <dir1> [dir2 ...]
//
// 输出: JSON 形式 { checked, passed, failed, errors }
// 退出码: 0 = 全部通过; 1 = 有 .md 缺 heading
//
// 本 PR 仅实施 research 池 spec (# What # Why # How 三公共必填)
// Sprint 6 扩 5 池 union
// =============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { validateHeadingSkeleton, type HeadingSkeletonSpec } from '@openxenon/engine/infra/markdown-headings'

/** 5 池 spec (v0.2 T8: research 池有 spec; T13 Sprint 6: 全部 5 池启用) */
const POOL_SPECS: Record<string, HeadingSkeletonSpec> = {
  research: {
    required: ['# What', '# Why', '# How'],
    optional: ['# Reference'],
    order: 'flexible',
  },
  design: {
    required: ['# What', '# Why', '# How'],
    optional: ['# 决策记录', '# 范围之外'],
    order: 'flexible',
  },
  issue: {
    required: ['# What', '# Why', '# How', '# 复现步骤', '# 期望', '# 实际'],
    order: 'flexible',
  },
  audit: {
    required: ['# What', '# Why', '# How', '# 证据', '# 结论'],
    order: 'flexible',
  },
  journal: {
    required: ['# What', '# Why', '# How', '# 时间线'],
    order: 'flexible',
  },
}

interface CheckResult {
  checked: number
  passed: number
  failed: string[]
  errors: Array<{ file: string; missing: string[]; unexpected: string[] }>
}

/** 从文件路径推池名 (e.g. .openxenon/pools/research/foo.md → 'research') */
function poolFromPath(filePath: string): string | null {
  const m = filePath.match(/\/pools\/([^/]+)\//)
  return m?.[1] ?? null
}

export function checkDirectories(dirs: string[]): CheckResult {
  const result: CheckResult = { checked: 0, passed: 0, failed: [], errors: [] }

  for (const dir of dirs) {
    let entries: string[]
    try {
      if (!statSync(dir).isDirectory()) continue
      entries = readdirSync(dir)
    } catch {
      // 目录不存在 → 跳过 (degraded mode, 兼容期)
      continue
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      let st
      try {
        st = statSync(fullPath)
      } catch {
        continue
      }

      // 仅检查 .md
      if (st.isFile() && fullPath.endsWith('.md')) {
        result.checked++
        const pool = poolFromPath(fullPath)
        if (!pool || !POOL_SPECS[pool]) {
          // 不在 spec 范围 → 跳过 (forges/ 兼容期, Sprint 6 flip)
          continue
        }

        const content = readFileSync(fullPath, 'utf-8')
        const v = validateHeadingSkeleton(content, POOL_SPECS[pool]!)
        if (v.ok) {
          result.passed++
        } else {
          result.failed.push(fullPath)
          result.errors.push({ file: fullPath, missing: v.missing, unexpected: v.unexpected })
        }
      } else if (st.isDirectory()) {
        // 递归: 不深 (本 PR 限定单层; Sprint 6 扩)
      }
    }
  }

  return result
}

// CLI 入口
if (import.meta.main) {
  const dirs = process.argv.slice(2)
  if (dirs.length === 0) {
    console.error('Usage: bun check-heading-skeleton.ts <dir1> [dir2 ...]')
    process.exit(1)
  }
  const result = checkDirectories(dirs)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.failed.length > 0 ? 1 : 0)
}
