// =============================================================================
// json-path.test.ts — RFC-0016 D3 一等公民 probe 验证
//
// 7 case: nested object / array index / [*] all-match / path not exist /
//   JSON parse error / file not found / type mismatch
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeJsonPath, type ProbeContext } from '../json-path'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-json-path-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function writeJson(name: string, data: unknown): string {
  const p = join(tmpDir, name)
  mkdirSync(join(tmpDir, name.split('/').slice(0, -1).join('/') ?? ''), { recursive: true })
  writeFileSync(p, JSON.stringify(data))
  return p
}

describe('json-path (RFC-0016 D3)', () => {
  test('case 1: 嵌套 object path $.a.b → matched', async () => {
    const file = writeJson('nested.json', { a: { b: 'hello' } })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file, path: '$.a.b', expected: 'hello' }, ctx)
    expect(r.passed).toBe(true)
    expect(r.actual?.resolved).toBe('hello')
  })

  test('case 2: array index $.list[0] → matched', async () => {
    const file = writeJson('arr.json', { list: ['first', 'second'] })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file, path: '$.list[0]', expected: 'first' }, ctx)
    expect(r.passed).toBe(true)
  })

  test('case 3: array all-match $.items[*] → 任一元素匹配 → pass', async () => {
    const file = writeJson('items.json', { items: [{ id: 1 }, { id: 2 }, { id: 3 }] })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file, path: '$.items[*]', expected: { id: 2 } }, ctx)
    expect(r.passed).toBe(true)
  })

  test('case 4: array all-match 无元素匹配 → fail', async () => {
    const file = writeJson('items.json', { items: [{ id: 1 }] })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file, path: '$.items[*]', expected: { id: 99 } }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('no array element matches')
  })

  test('case 5: path 不存在 → fail', async () => {
    const file = writeJson('a.json', { a: 1 })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file, path: '$.nonexistent', expected: 'x' }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('path does not exist')
  })

  test('case 6: JSON parse error → fail', async () => {
    const file = join(tmpDir, 'bad.json')
    writeFileSync(file, '{ invalid json }')
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file, path: '$.a', expected: 1 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('JSON parse failed')
  })

  test('case 7: 文件不存在 → fail', async () => {
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file: './no-such.json', path: '$.a', expected: 1 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('not found')
  })

  test('case 8: boolean expected value (tsconfig strict check) → matched', async () => {
    const file = writeJson('tsconfig.json', { compilerOptions: { strict: true } })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeJsonPath({ file, path: '$.compilerOptions.strict', expected: true }, ctx)
    expect(r.passed).toBe(true)
  })
})
