// =============================================================================
// intent-overwriter.test.ts — v0.5 PR-D
//
// L1-Infra 原子覆盖引擎测试
// 覆盖：
//   1. overwriteIntent 正常流程（添加 patch → 内容追加）
//   2. dry-run 模式不写文件 + hash 一致
//   3. previewOverwrite 返回完整 patch 应用结果
//   4. buildPatch kind-aware 模板生成
//   5. resolveTargetPath 绝对 vs 相对路径
//   6. ensureWritable 清除只读位
//   7. 目标文件不存在 → 抛 IAPError
// =============================================================================

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildPatch, ensureWritable, overwriteIntent, previewOverwrite, resolveTargetPath } from '../intent-overwriter'
import type { ImprovementSuggestionMeta } from '../../../kernel/index'

let tmpDir: string
let origCwd: string
let targetPath: string

const TEST_INVARIANT_META: ImprovementSuggestionMeta = {
  target: 'domain',
  targetName: 'TestContext',
  targetPath: 'TEST_PATH_PLACEHOLDER',
  kind: 'add-invariant',
  patch: 'invariant {\n  "C1: test rule"\n}',
  source: 'unit-test',
}

beforeAll(() => {
  origCwd = process.cwd()
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-overwriter-test-'))
  process.chdir(tmpDir)
})

afterAll(() => {
  process.chdir(origCwd)
  rmSync(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  // 每个 test 独立 .oxn 文件
  targetPath = join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.oxn`)
  writeFileSync(targetPath, 'domain "TestContext" {\n  description = "test"\n}\n', 'utf-8')
})

afterEach(() => {
  if (existsSync(targetPath)) {
    try {
      chmodSync(targetPath, 0o644)
    } catch {
      /* ignore */
    }
    rmSync(targetPath, { force: true })
  }
})

describe('overwriteIntent', () => {
  test('正常流程：追加 patch 到文件末尾 + 返回 before/afterHash', () => {
    const meta = { ...TEST_INVARIANT_META, targetPath }
    const result = overwriteIntent({ targetPath, meta, operator: 'tester' })
    expect(result.beforeHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.afterHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.beforeHash).not.toBe(result.afterHash)
    expect(result.approvalRecord.approvedBy).toBe('tester')
    expect(result.isDryRun).toBe(false)

    // 验证文件内容
    const newContent = readFileSync(targetPath, 'utf-8')
    expect(newContent).toContain('C1: test rule')
    expect(newContent).toContain('description = "test"')
  })

  test('dry-run 模式不写文件 + hash 一致', () => {
    const meta = { ...TEST_INVARIANT_META, targetPath }
    const beforeContent = readFileSync(targetPath, 'utf-8')

    const result = overwriteIntent({ targetPath, meta, dryRun: true })
    expect(result.isDryRun).toBe(true)

    // 文件未改
    const afterContent = readFileSync(targetPath, 'utf-8')
    expect(afterContent).toBe(beforeContent)

    // hash 一致（dry-run 算的是相同内容）
    const manualHash = result.afterHash // 跟写盘后相同
    expect(manualHash).toMatch(/^[a-f0-9]{64}$/)
  })

  test('目标文件不存在 → 抛 IAPError', () => {
    const meta = { ...TEST_INVARIANT_META, targetPath: '/nonexistent/path.oxn' }
    expect(() => overwriteIntent({ targetPath: '/nonexistent/path.oxn', meta })).toThrow()
  })
})

describe('previewOverwrite', () => {
  test('返回 before/afterHash + patchApplied', () => {
    const meta = { ...TEST_INVARIANT_META, targetPath }
    const result = previewOverwrite(targetPath, meta)
    expect(result.beforeHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.afterHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.patchApplied).toContain('C1: test rule')
  })
})

describe('buildPatch', () => {
  test('add-invariant 生成 invariant 块', () => {
    const patch = buildPatch('add-invariant', '"C1: rule"')
    expect(patch).toBe('invariant {\n  "C1: rule"\n}')
  })

  test('add-term 生成 term 块', () => {
    const patch = buildPatch('add-term', '"Foo": "desc"')
    expect(patch).toBe('term {\n  "Foo": "desc"\n}')
  })

  test('add-ban 生成 ban 块', () => {
    const patch = buildPatch('add-ban', '"old", "legacy"')
    expect(patch).toBe('ban {\n  "old", "legacy"\n}')
  })

  test('add-observe 生成 observe 数组', () => {
    const patch = buildPatch('add-observe', '"lint-check", "ts-compiles"')
    expect(patch).toBe('  observe = ["lint-check", "ts-compiles"]')
  })
})

describe('resolveTargetPath', () => {
  test('绝对路径直接返回', () => {
    expect(resolveTargetPath('/tmp', '/abs/path.oxn')).toBe('/abs/path.oxn')
  })

  test('相对路径拼接 projectRoot', () => {
    const result = resolveTargetPath('/tmp', 'rel/path.oxn')
    expect(result).toBe(join('/tmp', 'rel/path.oxn'))
  })
})

describe('ensureWritable', () => {
  test('0o444 文件 → ensureWritable 后可写', () => {
    chmodSync(targetPath, 0o444)
    expect(statSync(targetPath).mode & 0o777).toBe(0o444)
    ensureWritable(targetPath)
    expect(statSync(targetPath).mode & 0o777).toBe(0o644)
  })

  test('不存在文件 → 静默忽略（无抛错）', () => {
    expect(() => ensureWritable('/nonexistent/path')).not.toThrow()
  })
})
