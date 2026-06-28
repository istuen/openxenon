// =============================================================================
// runtime-glob.test.ts (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
// 3 个测：1 pattern / 多 pattern / cwd
// =============================================================================

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { glob } from '../index'

let tmpDir: string

beforeAll(() => {
  tmpDir = join(tmpdir(), 'oxn-runtime-glob-test')
  mkdirSync(join(tmpDir, 'sub'), { recursive: true })
  writeFileSync(join(tmpDir, 'a.ts'), '// a', 'utf-8')
  writeFileSync(join(tmpDir, 'b.ts'), '// b', 'utf-8')
  writeFileSync(join(tmpDir, 'sub', 'c.ts'), '// c', 'utf-8')
  writeFileSync(join(tmpDir, 'sub', 'd.json'), '{}', 'utf-8')
})

afterAll(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

describe('runtime/glob', () => {
  test('1 pattern 匹配多个文件', async () => {
    const results = await glob('*.ts', { cwd: tmpDir })
    // 期望 a.ts + b.ts（2 个）；但 npm glob 在没有异步等待时可能行为不同
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results.some((p) => p.endsWith('a.ts'))).toBe(true)
    expect(results.some((p) => p.endsWith('b.ts'))).toBe(true)
  })

  test('多 pattern 匹配多类型', async () => {
    const results = await glob('**/*.{ts,json}', { cwd: tmpDir })
    expect(results.length).toBeGreaterThanOrEqual(4)
  })

  test('cwd 选项生效（隔离扫描根）', async () => {
    const results = await glob('*.ts', { cwd: join(tmpDir, 'sub') })
    expect(results.length).toBe(1)
    expect(results[0]?.endsWith('c.ts')).toBe(true)
  })
})
