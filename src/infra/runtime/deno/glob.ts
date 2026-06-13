// =============================================================================
// Deno Runtime — glob 适配（v0.1.6）
//
// Deno 没有原生 glob；用 Deno.readDir 递归遍历
// （v0.1.6 简化版：与 fs-match glob 模式同思路——非通用 glob）
//
// 真实生产应改用 npm 'glob' 包（同 Node 路径），保持跨 runtime 行为一致
// =============================================================================

import { join, relative } from 'node:path'
import type { GlobOptions } from '../types'
import { getDeno } from '../deno-helper'

/**
 * v0.1.6 锁定的 glob 实现（Deno 路径）
 *
 * 实现：Deno.readDir 递归（与 fs-match handler 自实现一致）
 */
export async function globDeno(pattern: string, opts: GlobOptions = {}): Promise<string[]> {
  const deno = getDeno()
  if (!deno) {
    return []
  }
  const cwd = opts.cwd ?? '.'
  const results: string[] = []

  function matchPattern(path: string, pat: string): boolean {
    if (pat.includes('*') || pat.includes('?')) {
      const regex = new RegExp(`^${pat.replace(/\*/g, '.*').replace(/\?/g, '.')}$`)
      return regex.test(path)
    }
    return path === pat || path.endsWith(`/${pat}`)
  }

  async function walk(dir: string): Promise<void> {
    try {
      for await (const entry of deno!.readDir(dir)) {
        const fullPath = join(dir, entry.name)
        const rel = relative(cwd, fullPath)
        if (entry.isDirectory) {
          await walk(fullPath)
        } else if (matchPattern(rel, pattern)) {
          results.push(fullPath)
        }
      }
    } catch {
      // 忽略无权限等错误
    }
  }

  await walk(cwd)
  return results
}
