// =============================================================================
// pool-writer.test.ts (T8 v0.2 Sprint 4)
//
// 3 case:
//   1. 写合法 research entry (md + frozen.json)
//   2. 落盘后 frozen.json 0o444 物理权限正确
//   3. 错误 slug (大写 / 特殊字符) 抛 IAPError
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writePoolEntry, FROZEN_FILE_MODE } from '../frozen/pool-writer'
import { IAPError } from '../../kernel/index'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-pool-writer-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(join(tmpDir, '.openxenon', 'pools'), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('writePoolEntry (T8)', () => {
  test('case 1: 写合法 research entry (md + frozen.json)', async () => {
    const result = await writePoolEntry(tmpDir, {
      pool: 'research',
      slug: 'sample-1',
      title: 'Sample Research Note',
      content: '## Why\nThis is a sample research note.\n',
      metadata: { tags: ['demo'] },
    })
    expect(existsSync(result.path)).toBe(true)
    expect(existsSync(result.frozenPath)).toBe(true)
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/)
    const frozen = JSON.parse(readFileSync(result.frozenPath, 'utf-8'))
    expect(frozen.pool).toBe('research')
    expect(frozen.slug).toBe('sample-1')
    expect(frozen.title).toBe('Sample Research Note')
  })

  test('case 2: 落盘后 frozen.json 0o444 物理权限正确', async () => {
    const result = await writePoolEntry(tmpDir, {
      pool: 'research',
      slug: 'perm-test',
      title: 'Perm Test',
      content: '## How\n',
    })
    const mode = statSync(result.frozenPath).mode & 0o777
    expect(mode).toBe(FROZEN_FILE_MODE)
    expect(mode).toBe(0o444)
  })

  test('case 3: 错误 slug (大写 / 特殊字符) 抛 IAPError', async () => {
    await expect(
      writePoolEntry(tmpDir, {
        pool: 'research',
        slug: 'Bad-Slug',
        title: 'X',
        content: '',
      }),
    ).rejects.toThrow(IAPError)
  })
})
