// =============================================================================
// Node Runtime — file 适配（v0.1.6）
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §7.2
//
// Node 路径：fs.promises.readFile / access / writeFile + fs.statSync（同步）
// =============================================================================

import { statSync } from 'node:fs'
import { access, readFile, writeFile } from 'node:fs/promises'
import type { FileHandle } from '../types'

/**
 * v0.1.6 锁定的 openFile 实现（Node 18+ 路径）
 */
export async function openFileNode(path: string): Promise<FileHandle> {
  return {
    text: () => readFile(path, 'utf-8'),
    json: async () => {
      const content = await readFile(path, 'utf-8')
      return JSON.parse(content) as unknown
    },
    exists: async () => {
      try {
        await access(path)
        return true
      } catch {
        return false
      }
    },
    size: () => {
      try {
        return statSync(path).size
      } catch {
        return 0
      }
    },
    write: (data) => writeFile(path, data),
  }
}
