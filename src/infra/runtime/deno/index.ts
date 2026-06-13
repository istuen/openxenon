// =============================================================================
// Deno Runtime — 组装 RuntimePort（v0.1.6）
//
// 设计依据：arch-discussion §5.1 Deno 扩展方向
//
// 这是 Type B 接口的 Deno 实现。
// 在 index.ts 工厂里：`runtime = isDeno() ? denoRuntime : isBun() ? bunRuntime : nodeRuntime`
// =============================================================================

import type { GlobOptions, RuntimePort, SpawnOptions, SpawnResult } from '../types'
import type { FileHandle } from '../types'
import { openFileDeno } from './file'
import { globDeno } from './glob'
import { spawnDeno } from './spawn'
import { getDeno } from '../deno-helper'

export const denoRuntime: RuntimePort = {
  name: 'deno',
  spawn: (cmd: string[], opts?: SpawnOptions): Promise<SpawnResult> => spawnDeno(cmd, opts),
  openFile: (path: string): Promise<FileHandle> => openFileDeno(path),
  glob: (pattern: string, opts?: GlobOptions): Promise<string[]> => globDeno(pattern, opts),
  which: async (cmd: string): Promise<string | null> => {
    // Deno 没有原生命令 which，用 Deno.env.get('PATH') + Deno.command('which')
    // v0.1.6 简化：调用 `which` 命令（已假设 PATH 已配置）
    const deno = getDeno()
    if (!deno) return null
    try {
      const output = await deno.command('which', { args: [cmd], stdout: 'piped' })
      const path = new TextDecoder().decode(output.stdout).trim()
      return path || null
    } catch {
      return null
    }
  },
}
