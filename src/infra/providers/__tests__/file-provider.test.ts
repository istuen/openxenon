// =============================================================================
// FileProvider tests (v0.2 Sprint 3c T6)
//
// 父文档 T3.6 表 4 case:
//   1. 普通文件 → flags: []
//   2. Symlink → flags: ['symlink']
//   3. Cache path → flags: ['cache_path']
//   4. Just modified (mtimeMs 距 now < 1000) → flags: ['just_modified']
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { FileProvider } from '../file-provider'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-file-provider-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('FileProvider', () => {
  const provider = new FileProvider()

  test('case 1: 普通文件 → flags: []', async () => {
    const path = join(tmpDir, 'normal.txt')
    writeFileSync(path, 'hello world')
    // 强制 mtime 距 now > 1000ms (避免触发 just_modified)
    const past = new Date(Date.now() - 60_000)
    utimesSync(path, past, past)

    const r = await provider.ioStat({ path })
    expect(r.result.exists).toBe(true)
    expect(r.result.isFile).toBe(true)
    expect(r.result.symlink).toBe(false)
    expect(r.interference.flags).toEqual([])
  })

  test('case 2: Symlink → flags: 包含 symlink', async () => {
    const target = join(tmpDir, 'target.txt')
    writeFileSync(target, 'real file')
    const past = new Date(Date.now() - 60_000)
    utimesSync(target, past, past)

    const link = join(tmpDir, 'link.txt')
    symlinkSync(target, link)

    const r = await provider.ioStat({ path: link })
    expect(r.result.exists).toBe(true)
    expect(r.result.symlink).toBe(true)
    expect(r.interference.flags).toContain('symlink')
  })

  test('case 3: Cache path → flags: 包含 cache_path', async () => {
    const cacheDir = join(tmpDir, '.cache')
    mkdirSync(cacheDir, { recursive: true })
    const cacheFile = join(cacheDir, 'data.json')
    writeFileSync(cacheFile, '{}')
    const past = new Date(Date.now() - 60_000)
    utimesSync(cacheFile, past, past)

    const r = await provider.ioStat({ path: cacheFile })
    expect(r.result.exists).toBe(true)
    expect(r.interference.flags).toContain('cache_path')
  })

  test('case 4: Just modified (mtimeMs 距 now < 1000ms) → flags: 包含 just_modified', async () => {
    const path = join(tmpDir, 'fresh.txt')
    writeFileSync(path, 'just written')
    // 不调用 utimesSync, mtimeMs = now → 必触发 just_modified
    const r = await provider.ioStat({ path })
    expect(r.result.exists).toBe(true)
    expect(r.interference.flags).toContain('just_modified')
  })

  test('ioExec 必须抛 IAPError (file provider 不实现 io.exec)', async () => {
    await expect(provider.ioExec({ command: 'ls' })).rejects.toThrow(/file provider does not implement io\.exec/)
  })
})
