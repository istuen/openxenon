// =============================================================================
// Bun Runtime — 组装 RuntimePort（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §5.4
//
// 这是 Type B 接口的 Bun 实现。
// 在 index.ts 工厂里：`runtime = isBun() ? bunRuntime : nodeRuntime`
// =============================================================================

import type { GlobOptions, RuntimePort, SpawnOptions, SpawnResult } from '../types'
import type { FileHandle } from '../types'
import { openFileBun } from './file'
import { globBun } from './glob'
import { spawnBun } from './spawn'

export const bunRuntime: RuntimePort = {
  name: 'bun',
  spawn: (cmd: string[], opts?: SpawnOptions): Promise<SpawnResult> => spawnBun(cmd, opts),
  openFile: (path: string): Promise<FileHandle> => openFileBun(path),
  glob: (pattern: string, opts?: GlobOptions): Promise<string[]> => globBun(pattern, opts),
  which: async (cmd: string): Promise<string | null> => {
    // Bun 原生 which
    const r = Bun.which(cmd)
    return r ?? null
  },
}
