// =============================================================================
// file-hash.test.ts — RFC-0016 D1 一等公民 probe 验证
//
// 6 case: match / mismatch / file-not-found / sha512 / md5 / large file
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeFileHash, type ProbeContext } from '../file-hash'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-file-hash-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function writeFile(name: string, content: string): string {
  const p = join(tmpDir, name)
  writeFileSync(p, content)
  return p
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

describe('file-hash (RFC-0016 D1)', () => {
  test('case 1: SHA-256 匹配 → passed=true', async () => {
    const content = 'hello world'
    const file = writeFile('a.txt', content)
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeFileHash({ file, expectedHash: sha256(content) }, ctx)
    expect(r.passed).toBe(true)
    expect(r.actual?.algorithm).toBe('sha256')
    expect(r.actual?.hash).toBe(sha256(content))
  })

  test('case 2: SHA-256 不匹配 → passed=false', async () => {
    const file = writeFile('a.txt', 'hello')
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeFileHash({ file, expectedHash: '0'.repeat(64) }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('hash mismatch')
  })

  test('case 3: 文件不存在 → passed=false, error 含 not found', async () => {
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeFileHash({ file: './no-such.txt', expectedHash: 'x' }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('not found')
  })

  test('case 4: SHA-512 算法 → passed', async () => {
    const content = 'multi-algo'
    const file = writeFile('b.txt', content)
    const expected = createHash('sha512').update(content).digest('hex')
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeFileHash({ file, expectedHash: expected, algorithm: 'sha512' }, ctx)
    expect(r.passed).toBe(true)
    expect(r.actual?.algorithm).toBe('sha512')
  })

  test('case 5: MD5 算法 → passed', async () => {
    const content = 'md5 test'
    const file = writeFile('c.txt', content)
    const expected = createHash('md5').update(content).digest('hex')
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeFileHash({ file, expectedHash: expected, algorithm: 'md5' }, ctx)
    expect(r.passed).toBe(true)
  })

  test('case 6: 相对路径 (相对 projectRoot) → resolved', async () => {
    mkdirSync(join(tmpDir, 'sub'), { recursive: true })
    const content = 'relative path'
    writeFileSync(join(tmpDir, 'sub/rel.txt'), content)
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeFileHash({ file: './sub/rel.txt', expectedHash: sha256(content) }, ctx)
    expect(r.passed).toBe(true)
  })

  test('case 7: 不支持的算法 → passed=false, error 含 unsupported', async () => {
    const file = writeFile('d.txt', 'x')
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeFileHash({ file, expectedHash: 'x', algorithm: 'invalid-algo' as 'sha256' }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('unsupported')
  })
})
