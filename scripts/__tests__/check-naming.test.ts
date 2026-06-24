/**
 * scripts/__tests__/check-naming.test.ts
 *
 * v0.3 stage 4 T14 单元测试
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { checkNaming } from '../check-naming.js'

describe('scripts/check-naming', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `oxn-naming-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(join(testDir, '.openxenon', 'pools', 'design'), { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  test('checkNaming — 跨切架构 OK', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'md-ssot-system.md'), '# Crosscutting')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — 阶段文档 OK', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'req-md-ssot-v0.3.0.md'), '# Stage doc')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — 审计文档 OK', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'audit-0.2.0-test.md'), '# Audit')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — journal 日期前缀 OK', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', '2026-06-20-decision.md'), '# Journal')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — roadmap 形式 OK', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'v0.3.0-roadmap.md'), '# Roadmap')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — DEPRECATED 文档 OK（在 _archive/）', () => {
    mkdirSync(join(testDir, '.openxenon', 'pools', '_archive', '2026-06'), {
      recursive: true,
    })
    writeFileSync(join(testDir, '.openxenon', 'pools', '_archive', '2026-06', 'old-deprecated.md'), '# Deprecated')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — 任意带 -v<X.Y.Z> 后缀 OK', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'custom-v0.4.0.md'), '# Custom')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — 未知模式产生 warning', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'unrecognized.md'), '# Unknown')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.passed).toBe(0)
    expect(result.warnings.length).toBe(1)
  })

  test('checkNaming — pool-roadmap.md OK', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'pool-roadmap.md'), '# Pool Roadmap')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.failed).toBe(0)
  })

  test('checkNaming — README 跳过', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'README.md'), '# Readme')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.passed).toBe(1)
    expect(result.failed).toBe(0)
  })

  test('checkNaming — 排除 forges/', () => {
    mkdirSync(join(testDir, '.openxenon', 'forges'), { recursive: true })
    writeFileSync(join(testDir, '.openxenon', 'forges', 'random.md'), '# Forges')
    const result = checkNaming({ projectRoot: testDir })
    expect(result.passed).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.warnings.length).toBe(0)
  })

  test('checkNaming — strict 模式下 warning 算失败', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'unrecognized.md'), '# Unknown')
    const result = checkNaming({ projectRoot: testDir, strict: true })
    // strict 模式：warning 计入 failed
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  test('checkNaming — .openxenon 不存在抛错', () => {
    expect(() => checkNaming({ projectRoot: '/tmp/nonexistent' })).toThrow()
  })
})
