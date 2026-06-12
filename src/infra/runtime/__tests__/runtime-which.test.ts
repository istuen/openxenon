// =============================================================================
// runtime-which.test.ts (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
// 2 个测：找到 / 找不到
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { which } from '../index'

describe('runtime/which', () => {
  test('找到 PATH 里的可执行文件（echo）', async () => {
    const path = await which('echo')
    expect(path).not.toBeNull()
    expect(path).toMatch(/echo$/)
  })

  test('找不到不存在的命令', async () => {
    const path = await which('oxn-nonexistent-command-12345')
    expect(path).toBeNull()
  })
})
