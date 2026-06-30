// =============================================================================
// fs-not-exists handler (v0.1.6 — 走 runtime 适配层)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §8.2
//
// v0.1.6: 走 openFile().exists()（适配层抽象）
// =============================================================================

import { join } from 'path'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'
import { openFile } from '../runtime/index'
import { matchGlob, parseGlobPattern } from './glob-utils'

export interface ProbeContext extends ProbeContextBase {}

export async function executeFsNotExists(pattern: string, context: ProbeContext): Promise<string[]> {
  const fullPattern = pattern.startsWith('/') ? pattern : join(context.projectRoot, pattern)

  if (fullPattern.includes('*') || fullPattern.includes('?')) {
    const { baseDir, globPattern } = parseGlobPattern(fullPattern, context.projectRoot)
    return matchGlob(globPattern, baseDir)
  }

  // v0.1.6: 走 openFile().exists()
  // 行为（v0.1.5 兼容）：
  //   - 存在 → 返回 [fullPattern]（保留作为"不存在的反向"语义证据）
  //   - 不存在 → 返回 []（v0.1.5 兼容）
  const file = await openFile(fullPattern)
  const exists = await file.exists()
  return exists ? [fullPattern] : []
}
