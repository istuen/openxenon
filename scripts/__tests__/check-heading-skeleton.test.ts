// =============================================================================
// check-heading-skeleton.test.ts (T8 v0.2 Sprint 4)
//
// 3 case:
//   1. 全部 ok → exit 0 + passed=N
//   2. 缺 # How → exit 1 + failed[]
//   3. 空目录 → 0 files checked + passed=0
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { checkDirectories } from '../check-heading-skeleton'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-heading-skel-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
  // mock 池结构: <tmp>/.openxenon/pools/research/
  mkdirSync(join(tmpDir, '.openxenon', 'pools', 'research'), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('check-heading-skeleton (T8)', () => {
  test('case 1: 全部 ok → passed=N + failed=[]', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'pools', 'research', 'a.md'), '# What\nx\n# Why\ny\n# How\nz\n')
    writeFileSync(
      join(tmpDir, '.openxenon', 'pools', 'research', 'b.md'),
      '# What\nx\n# Why\ny\n# How\nz\n# Reference\nr\n',
    )
    const r = checkDirectories([join(tmpDir, '.openxenon', 'pools', 'research')])
    expect(r.checked).toBe(2)
    expect(r.passed).toBe(2)
    expect(r.failed).toEqual([])
  })

  test('case 2: 缺 # How → failed[] 含该文件', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'pools', 'research', 'a.md'), '# What\nx\n# Why\ny\n')
    const r = checkDirectories([join(tmpDir, '.openxenon', 'pools', 'research')])
    expect(r.checked).toBe(1)
    expect(r.passed).toBe(0)
    expect(r.failed.length).toBe(1)
    expect(r.errors[0]?.missing).toContain('# How')
  })

  test('case 3: 空目录 → 0 files checked + passed=0', () => {
    const r = checkDirectories([join(tmpDir, '.openxenon', 'pools', 'research')])
    expect(r.checked).toBe(0)
    expect(r.passed).toBe(0)
    expect(r.failed).toEqual([])
  })

  test('case 4: 目录不存在 → 静默跳过 (degraded mode)', () => {
    const r = checkDirectories([join(tmpDir, '.openxenon', 'pools', 'nonexistent')])
    expect(r.checked).toBe(0)
    expect(r.passed).toBe(0)
  })
})
