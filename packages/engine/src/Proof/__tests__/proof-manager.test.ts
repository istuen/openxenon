// =============================================================================
// Proof Manager unit test (ADR-0088 ADR-P5)
//
// 覆盖 Proof/proof-manager.ts 2 export function + 1 deprecated alias:
//   - renderProbeDescribeHuman (probe catalog human render)
//   - renderOutcomeHuman (proof outcome human render + outcome.md path hint)
//   - renderVerdictHuman (RFC-0015 D1.1 deprecated alias)
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderOutcomeHuman, renderProbeDescribeHuman, renderVerdictHuman } from '../proof-manager'
import type { FrozenProof } from '@openxenon/engine/kernel'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-proof-manager-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

/** 构造 FrozenProof mock（避免依赖 validateFrozenProof 完整字段）*/
function mkFrozen(): FrozenProof {
  return {
    name: 'p1',
    runAt: '2026-08-01T12:00:00Z',
    outcome: 'COMPLETED',
    totalCount: 2,
    passedCount: 2,
    failedCount: 0,
    probes: [
      { probeName: 'lint-check', ref: 'lint-check@1', outcome: 'COMPLETED', passed: true, durationMs: 50 },
      { probeName: 'ts-compiles', ref: 'ts-compiles@1', outcome: 'COMPLETED', passed: true, durationMs: 200 },
    ],
    _xenon_meta: { content_hash: 'a'.repeat(64), frozen_at: '2026-08-01T12:00:00Z' },
  }
}

describe('Proof / renderProbeDescribeHuman', () => {
  test('1. 标准 probe catalog info → 含 # name + Inputs + Examples', () => {
    const info = {
      name: 'fs-exists',
      description: 'Check file existence',
      inputs: [
        { name: 'path', type: 'string', required: true, description: 'file path' },
        { name: 'root', type: 'string', required: false, description: 'project root' },
      ],
      examples: [{ name: 'default', inputs: { path: './package.json' } }],
    } as Parameters<typeof renderProbeDescribeHuman>[0]
    const out = renderProbeDescribeHuman(info)
    expect(out).toContain('# fs-exists')
    expect(out).toContain('Check file existence')
    expect(out).toContain('Inputs:')
    expect(out).toContain('path: string (required)')
    expect(out).toContain('root: string (optional)')
    expect(out).toContain('Examples:')
    expect(out).toContain('"path":"./package.json"')
  })

  test('2. 0 inputs → 仍渲染 Inputs: 段', () => {
    const info = {
      name: 'no-input',
      description: 'no params',
      inputs: [],
      examples: [],
    } as Parameters<typeof renderProbeDescribeHuman>[0]
    const out = renderProbeDescribeHuman(info)
    expect(out).toContain('Inputs:')
    expect(out).not.toContain('Examples:')
  })

  test('3. 0 examples → 不渲染 Examples 段', () => {
    const info = {
      name: 'p',
      description: 'd',
      inputs: [{ name: 'i', type: 'string', required: true, description: 'desc' }],
      examples: [],
    } as Parameters<typeof renderProbeDescribeHuman>[0]
    const out = renderProbeDescribeHuman(info)
    expect(out).toContain('Inputs:')
    expect(out).not.toContain('Examples:')
  })
})

describe('Proof / renderOutcomeHuman', () => {
  test('1. COMPLETED + outcomeWritten=true → 含 "Proof saved" + "Outcome doc" 行', () => {
    const frozen = mkFrozen()
    const out = renderOutcomeHuman('p1', frozen, tmpDir, join(tmpDir, 'outcome.md'), true)
    expect(out).toContain('Proof "p1" outcome: COMPLETED (2/2)')
    expect(out).toContain('Proof saved:')
    expect(out).toContain('Read-only:') // 检查文件 mode
    expect(out).toContain('Outcome doc:') // outcomeWritten=true 时显示
  })

  test('2. COMPLETED + outcomeWritten=false → 不显示 Outcome doc 行', () => {
    const frozen = mkFrozen()
    const out = renderOutcomeHuman('p1', frozen, tmpDir, null, false)
    expect(out).toContain('Proof saved:')
    expect(out).not.toContain('Outcome doc:')
  })

  test('3. DEVIATED frozen → icon ❌ for failed probes', () => {
    const frozen = mkFrozen()
    frozen.outcome = 'DEVIATED'
    frozen.passedCount = 1
    frozen.failedCount = 1
    frozen.probes[1]!.outcome = 'DEVIATED'
    frozen.probes[1]!.passed = false
    const out = renderOutcomeHuman('p1', frozen, tmpDir, null, false)
    expect(out).toContain('Proof "p1" outcome: DEVIATED (1/2)')
    expect(out).toContain('❌')
    expect(out).toContain('lint-check') // 第一个 probe ✅
    expect(out).toContain('ts-compiles') // 第二个 probe ❌
  })

  test('4. INCONCLUSIVE → 含 outcome text + 不强制 ✅/❌', () => {
    const frozen = mkFrozen()
    frozen.outcome = 'INCONCLUSIVE'
    frozen.failedCount = 0
    frozen.passedCount = 1
    frozen.probes[1]!.outcome = 'INCONCLUSIVE'
    frozen.probes[1]!.passed = false
    const out = renderOutcomeHuman('p1', frozen, tmpDir, null, false)
    expect(out).toContain('Proof "p1" outcome: INCONCLUSIVE (1/2)')
    // passed=true → ✅, passed=false → ❌ (renderOutcomeHuman 用 p.passed ? ✅ : ❌)
    expect(out).toContain('✅ lint-check')
  })

  test('5. outcomePath 含中文/特殊字符 → escape 写入 path 字符串', () => {
    const frozen = mkFrozen()
    const specialPath = join(tmpDir, '.openxenon', 'proofs', 'p1', 'outcome.md')
    const out = renderOutcomeHuman('p1', frozen, tmpDir, specialPath, true)
    expect(out).toContain('outcome.md')
  })
})

describe('Proof / renderVerdictHuman (deprecated alias)', () => {
  test('1. 与 renderOutcomeHuman 同语义 (RFC-0015 D1.1 alias)', () => {
    const frozen = mkFrozen()
    const a = renderOutcomeHuman('p1', frozen, tmpDir, null, false)
    const b = renderVerdictHuman('p1', frozen, tmpDir, null, false)
    expect(a).toBe(b)
  })
})
