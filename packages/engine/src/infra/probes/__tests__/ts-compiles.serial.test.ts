// =============================================================================
// ts-compiles infra unit tests
//
// 覆盖 v1.1 P1 修复：path + --project 不再触发 TS5042。
// 策略：跑真实 tsc 验证三种组合的语义正确：
//   1. path + tsconfig 共存 → 写临时 tsconfig extends 原配置，files 限定到 path
//   2. 只传 tsconfig → 走默认命令（不写临时文件）
//   3. 只传 path → 退化为 tsc <path>（不写临时文件，丢项目配置）
//
// 临时文件清理是 P0 契约：每次 executeTsCompiles 后 projectRoot 下不能残留
// .tsconfig.oxn-*.json。
//
// 设计：每个 test 用独立 tmpDir（beforeEach 创建，afterEach 清理）。
// 这样 bun test retry=1 第二次重跑时 fixture 也干净。
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { executeTsCompiles, type TsCompilesParams } from '../ts-compiles'

let tmpDir: string
const repoRoot = join(import.meta.dir, '../../../../../..')

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-tsc-test-'))
  // 软链仓库 node_modules → fixture（让 npx tsc 找到 typescript）
  symlinkSync(join(repoRoot, 'node_modules'), join(tmpDir, 'node_modules'), 'dir')
  writeFileSync(
    join(tmpDir, 'tsconfig.json'),
    JSON.stringify({
      extends: join(repoRoot, 'tsconfig.json'),
      include: ['src/**/*'],
      files: [],
    }),
    'utf-8',
  )
  mkdirSync(join(tmpDir, 'src'), { recursive: true })
  writeFileSync(join(tmpDir, 'src', 'ok.ts'), 'export const x: number = 1\n', 'utf-8')
  writeFileSync(join(tmpDir, 'src', 'bad.ts'), 'export const y: number = "string"\n', 'utf-8')
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function ctx() {
  return { projectRoot: tmpDir }
}

function params(over: Partial<TsCompilesParams> = {}): TsCompilesParams {
  return { timeout: 30000, ...over }
}

function assertNoLeakedTempFiles() {
  const remaining = readdirSync(tmpDir).filter((f) => f.startsWith('.tsconfig.oxn-'))
  expect(remaining).toEqual([])
}

// T1: 只传 tsconfig → 不写临时文件，走项目级
describe.serial('ts-compiles: 只传 tsconfig（不传 path）', () => {
  test('不写临时 .tsconfig.oxn-*.json', async () => {
    const result = await executeTsCompiles(params({ tsconfig: './tsconfig.json' }), ctx())
    expect(result.errorCount).toBeGreaterThanOrEqual(1)
    expect(result.passed).toBe(false)
    assertNoLeakedTempFiles()
  })
})

// T2: path + tsconfig 共存 → 写临时文件 + 用完清理（核心修复）
describe.serial('ts-compiles: path + tsconfig 共存', () => {
  test('path 指向 ok 文件 → passed=true,无 TS5042', async () => {
    const result = await executeTsCompiles(params({ path: './src/ok.ts', tsconfig: './tsconfig.json' }), ctx())
    expect(result.exitCode).toBe(0)
    expect(result.passed).toBe(true)
    expect((result.stderr ?? '') + (result.stdout ?? '')).not.toMatch(/TS5042/)
    assertNoLeakedTempFiles()
  })

  test('path 指向 bad 文件 → passed=false,errorCount=1', async () => {
    const result = await executeTsCompiles(params({ path: './src/bad.ts', tsconfig: './tsconfig.json' }), ctx())
    expect(result.passed).toBe(false)
    expect(result.errorCount).toBe(1)
    expect((result.stderr ?? '') + (result.stdout ?? '')).not.toMatch(/TS5042/)
    assertNoLeakedTempFiles()
  })

  test('多次执行不冲突（hash 唯一）', async () => {
    const results = await Promise.all([
      executeTsCompiles(params({ path: './src/ok.ts', tsconfig: './tsconfig.json' }), ctx()),
      executeTsCompiles(params({ path: './src/ok.ts', tsconfig: './tsconfig.json' }), ctx()),
      executeTsCompiles(params({ path: './src/ok.ts', tsconfig: './tsconfig.json' }), ctx()),
    ])
    expect(results.every((r) => r.passed)).toBe(true)
    assertNoLeakedTempFiles()
  })
})

// T3: 只传 path → 退化为 tsc <path>，不写临时文件
describe.serial('ts-compiles: 只传 path（无 tsconfig）', () => {
  test('不写临时文件（退化路径）', async () => {
    const result = await executeTsCompiles(params({ path: './src/ok.ts' }), ctx())
    expect(result.passed).toBe(true)
    assertNoLeakedTempFiles()
  })
})

// T4: 既不传 path 也不传 tsconfig → 自动检测
describe.serial('ts-compiles: 自动检测 tsconfig', () => {
  test('auto-detect 到 ./tsconfig.json + 跑全项目', async () => {
    const result = await executeTsCompiles(params(), ctx())
    expect(result.errorCount).toBeGreaterThanOrEqual(1)
    expect(result.passed).toBe(false)
    assertNoLeakedTempFiles()
  })
})

// T5: cleanup 兜底 — 即使 tsc 报错也要清理
describe.serial('ts-compiles: 异常路径也清理', () => {
  test('path 指向不存在的文件 → 仍清理', async () => {
    const result = await executeTsCompiles(
      params({ path: './src/does-not-exist.ts', tsconfig: './tsconfig.json' }),
      ctx(),
    )
    expect(result.passed).toBe(false)
    assertNoLeakedTempFiles()
  })
})

// T6: errorCount 契约 — 必须精确计数，不是 0 也不是 undefined
describe.serial('ts-compiles: errorCount 契约', () => {
  test('坏文件路径时 errorCount 精确 = 1', async () => {
    const result = await executeTsCompiles(params({ path: './src/bad.ts', tsconfig: './tsconfig.json' }), ctx())
    expect(result.errorCount).toBe(1)
  })
})
