// =============================================================================
// runtime-file.test.ts (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
// 4 个测：text / json / exists / write
// =============================================================================

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { openFile } from '../index'

let tmpDir: string
let jsonFile: string
let textFile: string
let missingFile: string

beforeAll(() => {
  tmpDir = join(tmpdir(), 'oxn-runtime-file-test')
  mkdirSync(tmpDir, { recursive: true })
  jsonFile = join(tmpDir, 'sample.json')
  textFile = join(tmpDir, 'sample.txt')
  missingFile = join(tmpDir, 'does-not-exist.txt')
  writeFileSync(jsonFile, JSON.stringify({ name: 'adapter', version: '0.1.6' }, null, 2), 'utf-8')
  writeFileSync(textFile, 'hello file adapter\n', 'utf-8')
})

afterAll(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('runtime/file', () => {
  test('text() 读全文', async () => {
    const f = await openFile(textFile)
    const text = await f.text()
    expect(text).toBe('hello file adapter\n')
  })

  test('json() 读全文 + JSON.parse', async () => {
    const f = await openFile(jsonFile)
    const data = (await f.json()) as { name: string; version: string }
    expect(data.name).toBe('adapter')
    expect(data.version).toBe('0.1.6')
  })

  test('exists() 命中 + 不命中', async () => {
    const f1 = await openFile(textFile)
    expect(await f1.exists()).toBe(true)

    const f2 = await openFile(missingFile)
    expect(await f2.exists()).toBe(false)
  })

  test('write() 覆盖写', async () => {
    const target = join(tmpDir, 'write-target.txt')
    const f = await openFile(target)
    await f.write('written by adapter\n')
    expect(readFileSync(target, 'utf-8')).toBe('written by adapter\n')
  })
})
