// =============================================================================
// heading-skeleton-check handler (v0.6.2 probe)
//
// 校验 .md 文件的 heading 骨架（pool H1 模式）。
// 复用 validateHeadingSkeleton() from @openxenon/engine/infra/markdown-headings。
// 5 池 spec: research / design / issue / audit / journal
// 对应 .openxenon/pools/<pool>/*.md 的标题模板。
// =============================================================================

import { join } from 'node:path'
import { fs } from '@openxenon/engine/infra/filesystem'
import { readdir } from '@openxenon/engine/infra/filesystem-async'
import { validateHeadingSkeleton, type HeadingSkeletonSpec, type HeadingSkeletonResult } from '../markdown-headings'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export type PoolKind = 'research' | 'design' | 'issue' | 'audit' | 'journal'

export interface HeadingSkeletonCheckParams {
  /** 要校验的文件或目录路径 */
  path: string
  /** pool 类型（决定 spec） */
  pool: PoolKind
}

export interface HeadingSkeletonCheckFileResult {
  file: string
  ok: boolean
  missing: string[]
  unexpected: string[]
  headings: string[]
}

export interface HeadingSkeletonCheckResult {
  /** 全部通过 = true */
  passed: boolean
  /** 检查的文件数 */
  checked: number
  /** 通过的文件数 */
  passedCount: number
  /** 失败的文件列表 */
  failedFiles: string[]
  /** 详细错误 */
  errors: HeadingSkeletonCheckFileResult[]
}

const POOL_SPECS: Record<PoolKind, HeadingSkeletonSpec> = {
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

function poolFromPath(filePath: string): PoolKind | null {
  const m = filePath.match(/\/pools\/([^/]+)\//)
  return m?.[1] as PoolKind | null
}

/**
 * 递归收集目录下所有 .md 文件（异步 readdir）。
 */
async function collectMdFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    if (fs.isDirectory(fullPath)) {
      out.push(...(await collectMdFiles(fullPath)))
    } else if (fs.isFile(fullPath) && fullPath.endsWith('.md')) {
      out.push(fullPath)
    }
  }
  return out
}

export async function executeHeadingSkeletonCheck(
  params: HeadingSkeletonCheckParams,
  _context: ProbeContext,
): Promise<HeadingSkeletonCheckResult> {
  const spec = POOL_SPECS[params.pool]
  const result: HeadingSkeletonCheckResult = {
    passed: true,
    checked: 0,
    passedCount: 0,
    failedFiles: [],
    errors: [],
  }

  if (!fs.exists(params.path)) {
    result.passed = false
    result.failedFiles.push(params.path)
    result.errors.push({ file: params.path, ok: false, missing: ['<path not found>'], unexpected: [], headings: [] })
    return result
  }

  const files = fs.isDirectory(params.path) ? await collectMdFiles(params.path) : [params.path]

  for (const file of files) {
    // 路径里没 /pools/<pool>/ 的跳过
    const inferredPool = poolFromPath(file)
    if (!inferredPool) continue
    if (inferredPool !== params.pool) continue

    result.checked++
    const content = fs.read(file)
    if (content === null) continue
    const v: HeadingSkeletonResult = validateHeadingSkeleton(content, spec)
    if (v.ok) {
      result.passedCount++
    } else {
      result.passed = false
      result.failedFiles.push(file)
      result.errors.push({
        file,
        ok: false,
        missing: v.missing,
        unexpected: v.unexpected,
        headings: v.headings,
      })
    }
  }

  return result
}
