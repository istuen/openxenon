// =============================================================================
// Bun Runtime — glob 适配（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §7.3
//
// Bun.glob 路径：用 Bun.glob(pattern) 返回 AsyncIterable
// 转 string[] 给 RuntimePort 统一签名
// =============================================================================

import type { GlobOptions } from '../types'

/**
 * v0.1.6 锁定的 glob 实现（Bun 路径）
 */
export async function globBun(pattern: string, opts: GlobOptions = {}): Promise<string[]> {
  const results: string[] = []
  // Bun.Glob 路径：用 new Glob(pattern).scan({ cwd })
  const iter = new Bun.Glob(pattern).scan({ cwd: opts.cwd })
  for await (const file of iter) {
    results.push(file)
  }
  return results
}
