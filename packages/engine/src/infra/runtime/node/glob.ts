// =============================================================================
// Node Runtime — glob 适配（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §7.3
//
// Node 路径：用 npm 'glob' 包（已是 OpenXenon 依赖，§7.3 拍板）
// =============================================================================

import { glob as nodeGlob } from 'glob'
import type { GlobOptions } from '../types'

/**
 * v0.1.6 锁定的 glob 实现（Node 18+ 路径）
 */
export async function globNode(pattern: string, opts: GlobOptions = {}): Promise<string[]> {
  const results = await nodeGlob(pattern, {
    cwd: opts.cwd,
    nocase: opts.nocase,
    ignore: opts.ignore,
  })
  return results
}
