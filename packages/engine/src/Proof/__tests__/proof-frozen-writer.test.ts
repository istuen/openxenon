// =============================================================================
// Proof Frozen Writer unit test (ADR-0088 ADR-P5)
//
// 覆盖 Proof/proof-frozen-writer.ts 3 export function:
//   - buildFrozenProof(params) → FrozenProofBody (三态聚合)
//   - writeFrozenProof(path, body) → void (写盘 + SHA-256 + chmod 0o444)
//   - readFrozenProof(path) → ReadFrozenProofResult (schema 验签)
//
// FrozenProofBody 三态聚合测试:
//   - 全 PASS → outcome: COMPLETED
//   - 任一 INCONCLUSIVE → outcome: INCONCLUSIVE
//   - 有 FAILED → outcome: DEVIATED
//   - 空 probes → outcome: DEVIATED
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildFrozenProof, readFrozenProof, writeFrozenProof } from '../proof-frozen-writer'
import type { FrozenProofProbeResult } from '@openxenon/engine/kernel'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-frozen-writer-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function mkProbe(overrides: {
  probeName: string
  outcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE'
  passed: boolean
  durationMs?: number
}): FrozenProofProbeResult {
  return {
    probeName: overrides.probeName,
    ref: `${overrides.probeName}@1`,
    outcome: overrides.outcome,
    passed: overrides.passed,
    durationMs: overrides.durationMs ?? 10,
  }
}

describe('Proof / buildFrozenProof (3-state 聚合)', () => {
  test('1. 全 PASS → outcome: COMPLETED + passedCount = totalCount', () => {
    const body = buildFrozenProof({
      name: 'p1',
      probes: [
        mkProbe({ probeName: 'p1', outcome: 'COMPLETED', passed: true }),
        mkProbe({ probeName: 'p2', outcome: 'COMPLETED', passed: true }),
      ],
    })
    expect(body.outcome).toBe('COMPLETED')
    expect(body.totalCount).toBe(2)
    expect(body.passedCount).toBe(2)
    expect(body.failedCount).toBe(0)
  })

  test('2. 任一 INCONCLUSIVE → 整体 INCONCLUSIVE', () => {
    const body = buildFrozenProof({
      name: 'p1',
      probes: [
        mkProbe({ probeName: 'p1', outcome: 'COMPLETED', passed: true }),
        mkProbe({ probeName: 'p2', outcome: 'INCONCLUSIVE', passed: false }),
      ],
    })
    expect(body.outcome).toBe('INCONCLUSIVE')
    expect(body.passedCount).toBe(1)
    expect(body.failedCount).toBe(0)
  })

  test('3. 有 FAILED → outcome: DEVIATED + failedCount 正确', () => {
    const body = buildFrozenProof({
      name: 'p1',
      probes: [
        mkProbe({ probeName: 'p1', outcome: 'COMPLETED', passed: true }),
        mkProbe({ probeName: 'p2', outcome: 'DEVIATED', passed: false }),
      ],
    })
    expect(body.outcome).toBe('DEVIATED')
    expect(body.passedCount).toBe(1)
    expect(body.failedCount).toBe(1)
  })

  test('4. 空 probes → outcome: DEVIATED (v0.6 安全默认)', () => {
    const body = buildFrozenProof({ name: 'empty', probes: [] })
    expect(body.outcome).toBe('DEVIATED')
    expect(body.totalCount).toBe(0)
    expect(body.passedCount).toBe(0)
    expect(body.failedCount).toBe(0)
  })

  test('5. 容错: probe 缺 outcome → 按 passed 推断 (legacy 二态兼容)', () => {
    const body = buildFrozenProof({
      name: 'p1',
      probes: [
        { probeName: 'legacy-ok', ref: 'legacy-ok@1', passed: true, durationMs: 10 } as FrozenProofProbeResult,
        { probeName: 'legacy-fail', ref: 'legacy-fail@1', passed: false, durationMs: 10 } as FrozenProofProbeResult,
      ],
    })
    expect(body.totalCount).toBe(2)
    expect(body.passedCount).toBe(1)
    expect(body.outcome).toBe('DEVIATED')
  })

  test('6. runAt 缺省 → 自动 ISO 8601', () => {
    const body = buildFrozenProof({ name: 'p1', probes: [] })
    expect(body.runAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('7. runAt 显式 → 透传', () => {
    const body = buildFrozenProof({ name: 'p1', probes: [], runAt: '2026-08-01T12:00:00Z' })
    expect(body.runAt).toBe('2026-08-01T12:00:00Z')
  })
})

describe('Proof / writeFrozenProof + readFrozenProof round-trip', () => {
  test('1. write → read → ok=true + frozen 字段完整', () => {
    const body = buildFrozenProof({
      name: 'roundtrip',
      probes: [
        mkProbe({ probeName: 'lint-check', outcome: 'COMPLETED', passed: true, durationMs: 50 }),
        mkProbe({ probeName: 'ts-compiles', outcome: 'COMPLETED', passed: true, durationMs: 200 }),
      ],
    })
    const frozenPath = join(tmpDir, '.openxenon', 'proofs', 'roundtrip', 'frozen.json')
    writeFrozenProof(frozenPath, body)
    const r = readFrozenProof(frozenPath)
    expect(r.ok).toBe(true)
    expect(r.frozen).not.toBeNull()
    expect(r.frozen?.name).toBe('roundtrip')
    expect(r.frozen?.outcome).toBe('COMPLETED')
    expect(r.frozen?.totalCount).toBe(2)
  })

  test('2. write 后 frozen.json 包含 _xenon_meta (SHA-256 签名)', () => {
    const body = buildFrozenProof({ name: 'meta', probes: [] })
    const frozenPath = join(tmpDir, '.openxenon', 'proofs', 'meta', 'frozen.json')
    writeFrozenProof(frozenPath, body)
    const raw = JSON.parse(readFileSync(frozenPath, 'utf-8')) as Record<string, unknown>
    const meta = raw._xenon_meta as { content_hash: string; frozen_at: string } | undefined
    expect(meta).toBeDefined()
    expect(meta?.content_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(meta?.frozen_at).toBe(body.runAt)
  })

  test('3. 不存在文件 → ok=false + reason 含 "not found"', () => {
    const r = readFrozenProof(join(tmpDir, 'nonexistent.json'))
    expect(r.ok).toBe(false)
    expect(r.frozen).toBeNull()
    expect(r.reason).toContain('not found')
  })

  test('4. 非法 JSON 内容 → ok=false + reason 含 schema error', () => {
    const frozenPath = join(tmpDir, 'invalid.json')
    const fs = require('node:fs') as typeof import('node:fs')
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(frozenPath, '{"invalid": "no required fields"}', 'utf-8')
    const r = readFrozenProof(frozenPath)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('schema')
  })

  test('5. 写入路径不存在 → 自动 mkdir (上层目录)', () => {
    const body = buildFrozenProof({ name: 'auto-mkdir', probes: [] })
    const frozenPath = join(tmpDir, '.openxenon', 'proofs', 'auto-mkdir', 'nested', 'sub', 'frozen.json')
    writeFrozenProof(frozenPath, body)
    expect(existsSync(frozenPath)).toBe(true)
    const r = readFrozenProof(frozenPath)
    expect(r.ok).toBe(true)
  })
})
