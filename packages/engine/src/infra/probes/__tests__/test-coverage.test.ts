// =============================================================================
// test-coverage.test.ts — RFC-0016 D2 一等公民 probe 验证
//
// 4 case: invalid threshold / coverage summary missing / malformed JSON / happy path (mock coverage file)
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeTestCoverage, type ProbeContext } from '../test-coverage'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-test-cov-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function writeCoverageSummary(data: unknown): void {
  mkdirSync(join(tmpDir, 'coverage'), { recursive: true })
  writeFileSync(join(tmpDir, 'coverage/coverage-summary.json'), JSON.stringify(data))
}

describe('test-coverage (RFC-0016 D2)', () => {
  test('case 1: invalid minLinesPct (负数) → passed=false, error 含 invalid', async () => {
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeTestCoverage({ minLinesPct: -1 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('invalid minLinesPct')
  })

  test('case 2: invalid minLinesPct (> 100) → passed=false', async () => {
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeTestCoverage({ minLinesPct: 150 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('invalid minLinesPct')
  })

  test('case 3: coverage-summary.json 不存在 → passed=false, error 含 not found', async () => {
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeTestCoverage({ minLinesPct: 80 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('coverage summary not found')
  })

  test('case 4: malformed JSON → passed=false, error 含 JSON parse failed', async () => {
    mkdirSync(join(tmpDir, 'coverage'), { recursive: true })
    writeFileSync(join(tmpDir, 'coverage/coverage-summary.json'), '{ broken json')
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeTestCoverage({ minLinesPct: 80 }, ctx)
    expect(r.passed).toBe(false)
    expect(r.error).toContain('JSON parse failed')
  })

  test('case 5: coverage 满足 minLinesPct → lines.passed=true (mock summary)', async () => {
    writeCoverageSummary({
      total: { lines: { pct: 85 }, branches: { pct: 70 }, functions: { pct: 90 } },
    })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeTestCoverage({ minLinesPct: 80, minBranchesPct: 60, minFunctionsPct: 80 }, ctx)
    expect(r.lines.actual).toBe(85)
    expect(r.lines.threshold).toBe(80)
    expect(r.lines.passed).toBe(true)
    expect(r.branches?.passed).toBe(true)
    expect(r.functions?.passed).toBe(true)
  })

  test('case 6: coverage 低于 minLinesPct → lines.passed=false (mock summary)', async () => {
    writeCoverageSummary({ total: { lines: { pct: 50 } } })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeTestCoverage({ minLinesPct: 80 }, ctx)
    expect(r.lines.passed).toBe(false)
    expect(r.lines.actual).toBe(50)
  })
})
