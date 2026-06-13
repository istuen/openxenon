// =============================================================================
// Deno Runtime — file 适配（v0.1.6）
//
// Deno 路径：Deno.readTextFile / Deno.stat / Deno.writeTextFile
// =============================================================================

import type { FileHandle } from '../types'
import { getDeno } from '../deno-helper'

/**
 * v0.1.6 锁定的 openFile 实现（Deno 路径）
 */
export async function openFileDeno(path: string): Promise<FileHandle> {
  const deno = getDeno()
  if (!deno) {
    throw new Error('openFileDeno: Deno globalThis not available')
  }

  return {
    text: () => deno.readTextFile(path),
    json: async () => {
      const content = await deno.readTextFile(path)
      return JSON.parse(content) as unknown
    },
    exists: async () => {
      try {
        const stat = await deno.stat(path)
        return stat.isFile || stat.isDirectory
      } catch {
        return false
      }
    },
    size: () => {
      // Deno.stat 是异步；v0.1.6 简化：用 sync 路径（spawn 进程跑 stat）
      // 真实实现：deno.stat(path).then(s => s.size) — 但 RuntimePort 签名要 sync
      // v0.1.6 妥协：返回 0，handler 应改用 .text() 走异步路径
      return 0
    },
    write: (data) => deno.writeTextFile(path, typeof data === 'string' ? data : new TextDecoder().decode(data)),
  }
}
