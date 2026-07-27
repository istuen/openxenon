// =============================================================================
// docs-heading-check handler (v0.6.2 probe)
//
// 校验 docs/{product,dev,rfc}/{zh-cn,en}/*.md 的章节骨架（H2 模式）。
// 章节内统一模板：What → Why → How → 参考。
// 复用 validateHeadingSkeleton() from @openxenon/engine/infra/markdown-headings。
// =============================================================================

import { join } from 'node:path'
import { fs } from '@openxenon/engine/infra/filesystem'
import { readdir } from '@openxenon/engine/infra/filesystem-async'
import { validateHeadingSkeleton, type HeadingSkeletonSpec, type HeadingSkeletonResult } from '../markdown-headings'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface DocsHeadingCheckParams {
  /** 要校验的文件或目录路径 */
  path: string
}

export interface DocsHeadingCheckFileResult {
  file: string
  ok: boolean
  missing: string[]
  unexpected: string[]
  headings: string[]
}

export interface DocsHeadingCheckResult {
  /** 全部通过 = true */
  passed: boolean
  /** 检查的文件数 */
  checked: number
  /** 通过的文件数 */
  passedCount: number
  /** 失败的文件列表 */
  failedFiles: string[]
  /** 详细错误 */
  errors: DocsHeadingCheckFileResult[]
}

/**
 * docs chapter spec：章内统一模板 What → Why → How → 参考（H2 模式）。
 * 触发条件：文档含有 `## What` heading 则必须满足此 spec。
 * 无 `## What` 的文档（如 RFC 短文）跳过。
 */
const DOCS_CHAPTER_SPEC: HeadingSkeletonSpec = {
  required: ['## What', '## Why', '## How'],
  optional: ['## 参考'],
  order: 'flexible',
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

export async function executeDocsHeadingCheck(
  params: DocsHeadingCheckParams,
  _context: ProbeContext,
): Promise<DocsHeadingCheckResult> {
  const result: DocsHeadingCheckResult = {
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
    result.checked++
    const content = fs.read(file)
    if (content === null) continue

    // 仅校验含 ## What 的文档（章内模板触发器）
    if (!content.includes('## What')) continue

    const v: HeadingSkeletonResult = validateHeadingSkeleton(content, DOCS_CHAPTER_SPEC)
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
