// =============================================================================
// Bun Runtime — file 适配（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §7.2
//
// Bun.file 路径：直接包装 Bun.file() 返回 BunFile
//   - text() / json() / exists() / size / write 全部走 Bun API
// =============================================================================

import type { FileHandle } from '../types'

/**
 * v0.1.6 锁定的 openFile 实现（Bun 路径）
 */
export async function openFileBun(path: string): Promise<FileHandle> {
  const file = Bun.file(path)
  return {
    text: () => file.text(),
    json: () => file.json(),
    exists: () => file.exists(),
    size: () => file.size,
    write: async (data) => {
      // Bun.write 返回 Promise<number>（bytes written）；适配层用 Promise<void>
      await Bun.write(path, data)
    },
  }
}
