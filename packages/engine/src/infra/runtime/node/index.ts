// =============================================================================
// Node Runtime — 组装 RuntimePort（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §5.4
// =============================================================================

import which from 'which'
import type { GlobOptions, RuntimePort, SpawnOptions, SpawnResult } from '../types'
import type { FileHandle } from '../types'
import { openFileNode } from './file'
import { globNode } from './glob'
import { spawnNode } from './spawn'

export const nodeRuntime: RuntimePort = {
  name: 'node',
  spawn: (cmd: string[], opts?: SpawnOptions): Promise<SpawnResult> => spawnNode(cmd, opts),
  openFile: (path: string): Promise<FileHandle> => openFileNode(path),
  glob: (pattern: string, opts?: GlobOptions): Promise<string[]> => globNode(pattern, opts),
  which: async (cmd: string): Promise<string | null> => {
    // 用 npm 'which' 包（§7.4 拍板）—— 自动处理 Windows %PATHEXT% 等
    try {
      return await which(cmd, { nothrow: true })
    } catch {
      return null
    }
  },
}
