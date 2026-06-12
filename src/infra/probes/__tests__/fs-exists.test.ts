// =============================================================================
// probes-fs-exists.test.ts (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
// 2 个端到端测：命中 / 不命中
// =============================================================================

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { executeFsExists } from '../fs-exists'
import { executeFsNotExists } from '../fs-not-exists'
import type { ProbeContext } from '../fs-exists'

let tmpDir: string
let ctx: ProbeContext

beforeAll(() => {
  tmpDir = join(tmpdir(), 'oxn-probe-fs-test')
  mkdirSync(join(tmpDir, 'sub'), { recursive: true })
  writeFileSync(join(tmpDir, 'a.txt'), 'hello', 'utf-8')
  writeFileSync(join(tmpDir, 'sub', 'b.txt'), 'world', 'utf-8')
  ctx = { projectRoot: tmpDir }
})

afterAll(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('probes/fs-exists', () => {
  test('命中：相对路径 a.txt → 返回绝对路径', async () => {
    const result = await executeFsExists('a.txt', ctx)
    expect(result.length).toBe(1)
    expect(result[0]?.endsWith('a.txt')).toBe(true)
  })

  test('不命中：相对路径 missing.txt → []', async () => {
    const result = await executeFsExists('missing.txt', ctx)
    expect(result).toEqual([])
  })
})

describe('probes/fs-not-exists', () => {
  test('命中：a.txt 存在 → not-exists 返回路径（v0.1.5 兼容）', async () => {
    const result = await executeFsNotExists('a.txt', ctx)
    expect(result.length).toBe(1)
    expect(result[0]?.endsWith('a.txt')).toBe(true)
  })

  test('不命中：missing.txt → not-exists 返回 []', async () => {
    const result = await executeFsNotExists('missing.txt', ctx)
    expect(result).toEqual([])
  })
})
