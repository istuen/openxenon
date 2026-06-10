// =============================================================================
// v1.1 fs_match 数据契约修复 — 回归测试
//
// 验证 fs_match 策略读取 Infra JSON-stringify 后的 output.matched 字段，
// 而不是只看 output.length > 0。
//
// 关键回归：修复前 fs_match 对**任何非空 output**都 PASS（即便 regex 不匹配）。
// 修复后必须严格依赖 `matched: true` 布尔。
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { PROBE_VERDICT_STRATEGIES } from '../../../../src/kernel/probes/verdict'

const fsMatchStrategy = PROBE_VERDICT_STRATEGIES.fs_match
if (!fsMatchStrategy) throw new Error('fs_match strategy missing')

describe('fs_match 数据契约 (v1.1 修复)', () => {
  test('PASS: matched=true + 无 error → PASS', () => {
    const result = fsMatchStrategy(
      {
        probeType: 'fs_match',
        output: JSON.stringify({ matched: true, content: 'package.json content', pattern: 'openxenon' }),
        executedAt: 0,
      },
      { pattern: 'openxenon' },
    )
    expect(result.passed).toBe(true)
    expect(result.actual).toBe('package.json content')
    expect(result.message).toContain('matched')
  })

  test('FAIL (P0 回归): matched=false + 文件 read 成功 → 必须 FAIL', () => {
    // 这是 v1.1 修复的核心场景：
    // 修复前：'Pattern not found' 是非空字符串 → 假 PASS
    // 修复后：matched=false → 真 FAIL
    const result = fsMatchStrategy(
      {
        probeType: 'fs_match',
        output: JSON.stringify({ matched: false, content: 'full file content', pattern: 'nonexistent-pattern' }),
        executedAt: 0,
      },
      { pattern: 'nonexistent-pattern' },
    )
    expect(result.passed).toBe(false)
    expect(result.failureMessage).toContain('not found')
    expect(result.failureMessage).toContain('nonexistent-pattern')
  })

  test('FAIL: file read 失败 (error 字段) → FAIL', () => {
    const result = fsMatchStrategy(
      {
        probeType: 'fs_match',
        output: JSON.stringify({ matched: false, error: 'ENOENT: no such file' }),
        error: 'ENOENT: no such file',
        executedAt: 0,
      },
      { path: './missing.json' },
    )
    expect(result.passed).toBe(false)
    expect(result.failureMessage).toContain('ENOENT')
  })

  test('FAIL: 损坏的 JSON output (旧格式遗留) → FAIL 而非 假 PASS', () => {
    // 防御性：旧 Infra 格式（纯字符串 output）应该走兜底 FAIL，
    // 而不是误判为 'non-empty = PASS'
    const result = fsMatchStrategy(
      {
        probeType: 'fs_match',
        output: 'Plain string from legacy Infra (no JSON wrapper)',
        executedAt: 0,
      },
      {},
    )
    expect(result.passed).toBe(false)
  })

  test('FAIL: 空 output → FAIL', () => {
    const result = fsMatchStrategy(
      {
        probeType: 'fs_match',
        output: '',
        executedAt: 0,
      },
      {},
    )
    expect(result.passed).toBe(false)
  })
})
