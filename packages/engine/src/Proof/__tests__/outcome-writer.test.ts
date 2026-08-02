// =============================================================================
// Proof Outcome Writer unit test (ADR-0088 ADR-P5)
//
// 覆盖 Proof/outcome-writer.ts 3 export function:
//   - buildOutcomeMd(frozen) → OutcomeMdBody (string 含 YAML frontmatter)
//   - writeOutcomeMd(path, frozen) → void (写盘 + chmod 0o444)
//   - readOutcomeMd(path) → ReadOutcomeMdResult (验签 + 解析)
//
// 用 mkdtempSync tmpDir 真实 fs 读写。FrozenProof 用 'as FrozenProof' cast
// 简化 mock（schema 已通过 schema.test.ts 覆盖）。
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateFrozenProof, type FrozenProof } from '@openxenon/engine/kernel'
import {
  buildOutcomeMd,
  buildVerdictMd,
  readOutcomeMd,
  readVerdictMd,
  writeOutcomeMd,
  writeVerdictMd,
} from '../outcome-writer'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-outcome-writer-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

/** 构造最小合法 FrozenProof mock（用于 build/write/read） */
function mkFrozen(
  overrides: {
    name?: string
    outcome?: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE'
    passedCount?: number
    failedCount?: number
    probes?: Array<{
      probeName: string
      ref: string
      outcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE'
      passed: boolean
      durationMs: number
      target?: string
      description?: string
      errorMessage?: string
      interferenceFlags?: string[]
    }>
  } = {},
): FrozenProof {
  const probes = overrides.probes ?? [
    { probeName: 'lint-check', ref: 'lint-check@1', outcome: 'COMPLETED' as const, passed: true, durationMs: 100 },
  ]
  return validateFrozenProof({
    name: overrides.name ?? 'p1',
    runAt: '2026-08-01T12:00:00Z',
    outcome: overrides.outcome ?? 'COMPLETED',
    totalCount: probes.length,
    passedCount: overrides.passedCount ?? probes.filter((p) => p.passed).length,
    failedCount: overrides.failedCount ?? probes.filter((p) => !p.passed).length,
    probes,
    _xenon_meta: {
      frozen_at: '2026-08-01T12:00:00Z',
      content_hash: 'a'.repeat(64),
    },
  })
}

describe('Proof / buildOutcomeMd (pure)', () => {
  test('1. 完整 FrozenProof → 含 YAML frontmatter (--- ... ---) + Evidence + Summary', () => {
    const frozen = mkFrozen({ name: 'p1', outcome: 'COMPLETED', passedCount: 1, failedCount: 0 })
    const md = buildOutcomeMd(frozen)
    expect(md).toMatch(/^---\n/)
    expect(md).toContain('proof_id: p1')
    expect(md).toContain('outcome: COMPLETED')
    expect(md).toContain('run_at: 2026-08-01T12:00:00Z')
    expect(md).toContain(`frozen_hash: ${'a'.repeat(64)}`)
    expect(md).toContain('content_hash: ') // SHA-256 hex 64 字符
    expect(md).toContain('# Proof: p1')
    expect(md).toContain('## Evidence')
    expect(md).toContain('## Outcome Summary')
  })

  test('2. COMPLETED 渲染 ✅ icon, DEVIATED 渲染 ❌ icon', () => {
    const completed = buildOutcomeMd(mkFrozen({ outcome: 'COMPLETED' }))
    const deviated = buildOutcomeMd(
      mkFrozen({
        outcome: 'DEVIATED',
        failedCount: 1,
        probes: [{ probeName: 'p1', ref: 'p1@1', outcome: 'DEVIATED', passed: false, durationMs: 50 }],
      }),
    )
    expect(completed).toContain('✅ COMPLETED')
    expect(deviated).toContain('❌ DEVIATED')
  })

  test('3. probe 含 target → Evidence 行显示 target (proof-probe-description-target D7)', () => {
    const frozen = mkFrozen({
      probes: [
        {
          probeName: 'fs-exists',
          ref: 'fs-exists@1',
          outcome: 'COMPLETED',
          passed: true,
          durationMs: 5,
          target: './package.json',
        },
      ],
    })
    const md = buildOutcomeMd(frozen)
    expect(md).toContain('`./package.json`')
  })

  test('4. probe 含 description → Evidence 行显示 intent 子行 (proof-probe-description-target D7)', () => {
    const frozen = mkFrozen({
      probes: [
        {
          probeName: 'p1',
          ref: 'p1@1',
          outcome: 'COMPLETED',
          passed: true,
          durationMs: 10,
          description: '确认 package.json 存在',
        },
      ],
    })
    const md = buildOutcomeMd(frozen)
    expect(md).toContain('intent: 确认 package.json 存在')
  })

  test('5. probe 含 errorMessage → Evidence 行显示 error', () => {
    const frozen = mkFrozen({
      outcome: 'DEVIATED',
      failedCount: 1,
      probes: [
        {
          probeName: 'p1',
          ref: 'p1@1',
          outcome: 'DEVIATED',
          passed: false,
          durationMs: 5,
          errorMessage: '3 errors found',
        },
      ],
    })
    const md = buildOutcomeMd(frozen)
    expect(md).toContain('error: 3 errors found')
  })

  test('6. probe 含 interferenceFlags → ## Interference 段', () => {
    const frozen = mkFrozen({
      probes: [
        {
          probeName: 'p1',
          ref: 'p1@1',
          outcome: 'COMPLETED',
          passed: true,
          durationMs: 5,
          interferenceFlags: ['cache_path', 'just_modified'],
        },
      ],
    })
    const md = buildOutcomeMd(frozen)
    expect(md).toContain('## Interference')
    expect(md).toContain('cache_path')
    expect(md).toContain('just_modified')
  })

  test('7. INCONCLUSIVE → outcome_summary 含 Inconclusive 行', () => {
    const frozen = mkFrozen({
      outcome: 'INCONCLUSIVE',
      passedCount: 0,
      failedCount: 0,
      probes: [{ probeName: 'p1', ref: 'p1@1', outcome: 'INCONCLUSIVE', passed: false, durationMs: 5 }],
    })
    const md = buildOutcomeMd(frozen)
    expect(md).toContain('| Inconclusive | 1 |')
  })
})

describe('Proof / writeOutcomeMd + readOutcomeMd round-trip', () => {
  test('1. write 后 read → ok=true + content_hash 匹配', () => {
    const frozen = mkFrozen({ name: 'roundtrip' })
    const outcomePath = join(tmpDir, '.openxenon', 'proofs', 'roundtrip', 'outcome.md')
    writeOutcomeMd(outcomePath, frozen)
    const r = readOutcomeMd(outcomePath)
    expect(r.ok).toBe(true)
    expect(r.body).not.toBeNull()
    expect(r.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(r.frozenHash).toBe('a'.repeat(64))
  })

  test('2. write → read + 比对内容含 Evidence', () => {
    const frozen = mkFrozen({
      name: 'with-evidence',
      probes: [
        { probeName: 'lint-check', ref: 'lint-check@1', outcome: 'COMPLETED', passed: true, durationMs: 50 },
        { probeName: 'ts-compiles', ref: 'ts-compiles@1', outcome: 'COMPLETED', passed: true, durationMs: 200 },
      ],
    })
    const outcomePath = join(tmpDir, '.openxenon', 'proofs', 'with-evidence', 'outcome.md')
    writeOutcomeMd(outcomePath, frozen)
    const r = readOutcomeMd(outcomePath)
    expect(r.ok).toBe(true)
    expect(r.body).toContain('lint-check')
    expect(r.body).toContain('ts-compiles')
  })

  test('3. 不存在路径 → ok=false + reason 含 "not found"', () => {
    const r = readOutcomeMd(join(tmpDir, 'nonexistent.md'))
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('not found')
  })

  test('4. 子目录不存在 → write 自动 mkdir', () => {
    const frozen = mkFrozen({ name: 'auto-mkdir' })
    const outcomePath = join(tmpDir, '.openxenon', 'proofs', 'auto-mkdir', 'sub', 'outcome.md')
    writeOutcomeMd(outcomePath, frozen)
    const r = readOutcomeMd(outcomePath)
    expect(r.ok).toBe(true)
  })

  test('5. 篡改 body → read signature mismatch', () => {
    const frozen = mkFrozen({ name: 'tampered' })
    const outcomePath = join(tmpDir, '.openxenon', 'proofs', 'tampered', 'outcome.md')
    writeOutcomeMd(outcomePath, frozen)
    // 读取 + 手动篡改 + 写回（用 writeFileSync 强制 chmod 后写）
    const content = readFileSync(outcomePath, 'utf-8')
    const tampered = content.replace('## Evidence', '## Hacked Evidence')
    chmodSync(outcomePath, 0o644)
    writeFileSync(outcomePath, tampered, 'utf-8')
    const r = readOutcomeMd(outcomePath)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('signature mismatch')
  })

  test('6. 没有 frontmatter → ok=false + reason', () => {
    const path = join(tmpDir, 'no-frontmatter.md')
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(path, 'just body no frontmatter\n', 'utf-8')
    const r = readOutcomeMd(path)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('frontmatter')
  })

  test('7. 前向写的 outcome.md (alias buildVerdictMd/writeVerdictMd) 仍可用', () => {
    const frozen = mkFrozen({ name: 'alias-test' })
    const path = join(tmpDir, '.openxenon', 'proofs', 'alias-test', 'outcome.md')
    writeVerdictMd(path, frozen)
    const body = buildVerdictMd(frozen)
    expect(body).toContain('proof_id: alias-test')
    const r = readVerdictMd(path)
    expect(r.ok).toBe(true)
  })
})
