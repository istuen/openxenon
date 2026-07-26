// =============================================================================
// probe-stats-store.test.ts — v0.1.2 PR-A
//
// 覆盖：
//   1. 读不存在的文件 → null
//   2. 写后读回 → 数据一致
//   3. 原子写：写时不留 .tmp 残留
//   4. 非法 JSON → null（不抛错）
//   5. schema 不匹配 → null（不抛错）
//   6. 自动 mkdir 父目录
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { readProbeStatsFromFile, writeProbeStatsToFile } from '@openxenon/engine/infra/probes/probe-stats-store'
import { emptyProbeStats } from '@openxenon/engine/kernel'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-probe-stats-store-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('readProbeStatsFromFile', () => {
  test('returns null when file does not exist', () => {
    const path = join(tmpDir, 'probe-stats.json')
    expect(readProbeStatsFromFile(path)).toBeNull()
  })

  test('returns null on invalid JSON', () => {
    const path = join(tmpDir, 'probe-stats.json')
    writeFileSync(path, '{ not valid json', 'utf-8')
    expect(readProbeStatsFromFile(path)).toBeNull()
  })

  test('returns null on schema mismatch', () => {
    const path = join(tmpDir, 'probe-stats.json')
    // schemaVersion 必须是 literal(1)，用 2 触发不匹配
    writeFileSync(
      path,
      JSON.stringify({ schemaVersion: 2, projectRoot: '/x', probes: {}, proofRuns: [], updatedAt: 'now' }),
      'utf-8',
    )
    expect(readProbeStatsFromFile(path)).toBeNull()
  })

  test('returns parsed stats on valid file', () => {
    const path = join(tmpDir, 'probe-stats.json')
    const stats = emptyProbeStats('/test/project')
    writeFileSync(path, JSON.stringify(stats), 'utf-8')
    const r = readProbeStatsFromFile(path)
    expect(r).not.toBeNull()
    expect(r?.projectRoot).toBe('/test/project')
    expect(r?.schemaVersion).toBe(1)
  })
})

describe('writeProbeStatsToFile', () => {
  test('writes and reads back identical data', () => {
    const path = join(tmpDir, 'sub', 'probe-stats.json') // 测试 mkdir 父目录
    const stats = emptyProbeStats('/proj')
    stats.probes['fs-exists'] = {
      totalCount: 3,
      passCount: 2,
      failCount: 1,
      lastRun: '2026-01-01T00:00:00Z',
      targets: {
        './dist/index.js': { total: 3, pass: 2, fail: 1, consecutiveFails: 1, lastRun: '2026-01-01T00:00:00Z' },
      },
    }
    writeProbeStatsToFile(path, stats)
    expect(existsSync(path)).toBe(true)
    const r = readProbeStatsFromFile(path)
    expect(r).not.toBeNull()
    expect(r?.probes['fs-exists'].totalCount).toBe(3)
    expect(r?.probes['fs-exists'].targets['./dist/index.js'].consecutiveFails).toBe(1)
  })

  test('atomic write: no .tmp residue after success', () => {
    const path = join(tmpDir, 'probe-stats.json')
    const stats = emptyProbeStats('/proj')
    writeProbeStatsToFile(path, stats)
    expect(existsSync(path)).toBe(true)
    expect(existsSync(`${path}.tmp`)).toBe(false)
  })

  test('auto-creates parent directory', () => {
    const nested = join(tmpDir, 'deep', 'nested', 'probe-stats.json')
    expect(existsSync(join(tmpDir, 'deep', 'nested'))).toBe(false)
    writeProbeStatsToFile(nested, emptyProbeStats('/p'))
    expect(existsSync(join(tmpDir, 'deep', 'nested'))).toBe(true)
    expect(existsSync(nested)).toBe(true)
  })

  test('overwrites existing file', () => {
    const path = join(tmpDir, 'probe-stats.json')
    const v1 = emptyProbeStats('/v1')
    writeProbeStatsToFile(path, v1)
    const v2 = emptyProbeStats('/v2')
    writeProbeStatsToFile(path, v2)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('"/v2"')
    expect(content).not.toContain('"/v1"')
  })
})

// =============================================================================
// updater 纯函数单测（顺便覆盖 schema 与 catalog 翻译）
// =============================================================================

import { updateProbeStats, initProbeStatsFromFrozen, type FrozenProof } from '@openxenon/engine/kernel'

function makeFrozen(
  name: string,
  runAt: string,
  probes: Array<{ probeName: string; ref: string; passed: boolean; params?: Record<string, unknown> }>,
): FrozenProof {
  return {
    name,
    runAt,
    outcome: probes.every((p) => p.passed) ? 'COMPLETED' : 'DEVIATED',
    totalCount: probes.length,
    passedCount: probes.filter((p) => p.passed).length,
    failedCount: probes.filter((p) => !p.passed).length,
    probes: probes.map((p) => ({
      probeName: p.probeName,
      ref: p.ref,
      passed: p.passed,
      output: p.params ? { outcome: { passed: p.passed, message: 'mock', params: p.params } } : undefined,
      durationMs: 1,
    })),
    _xenon_meta: { frozen_at: runAt, content_hash: 'a'.repeat(64) },
  }
}

describe('updateProbeStats', () => {
  test('empty stats + 1 frozen → 正确初始化', () => {
    const frozen = makeFrozen('check-deploy', '2026-01-01T00:00:00Z', [
      { probeName: 'p1', ref: '@oxn/probes/fs-exists', passed: true, params: { pattern: './dist/index.js' } },
    ])
    const r = initProbeStatsFromFrozen('/proj', frozen)
    expect(r.probes['fs-exists'].totalCount).toBe(1)
    expect(r.probes['fs-exists'].passCount).toBe(1)
    expect(r.probes['fs-exists'].failCount).toBe(0)
    expect(r.probes['fs-exists'].targets['./dist/index.js'].consecutiveFails).toBe(0)
    expect(r.proofRuns.length).toBe(1)
    expect(r.proofRuns[0]?.outcome).toBe('COMPLETED')
  })

  test('连续失败累加 consecutiveFails', () => {
    const frozen1 = makeFrozen('a', '2026-01-01T00:00:00Z', [
      { probeName: 'p1', ref: '@oxn/probes/fs-exists', passed: false, params: { pattern: './missing.js' } },
    ])
    const frozen2 = makeFrozen('a', '2026-01-02T00:00:00Z', [
      { probeName: 'p1', ref: '@oxn/probes/fs-exists', passed: false, params: { pattern: './missing.js' } },
    ])
    const frozen3 = makeFrozen('a', '2026-01-03T00:00:00Z', [
      { probeName: 'p1', ref: '@oxn/probes/fs-exists', passed: true, params: { pattern: './missing.js' } },
    ])

    let s = initProbeStatsFromFrozen('/p', frozen1)
    s = updateProbeStats(s, frozen2)
    s = updateProbeStats(s, frozen3)

    expect(s.probes['fs-exists'].totalCount).toBe(3)
    expect(s.probes['fs-exists'].passCount).toBe(1)
    expect(s.probes['fs-exists'].failCount).toBe(2)
    // 连续 2 失败后 1 成功 → 清零
    expect(s.probes['fs-exists'].targets['./missing.js'].consecutiveFails).toBe(0)
  })

  test('FIFO 截断 proofRuns', async () => {
    const { MAX_PROOF_RUNS } = await import('@openxenon/engine/kernel')
    let s = emptyProbeStats('/p')
    // 写 MAX_PROOF_RUNS + 5 条
    for (let i = 0; i < MAX_PROOF_RUNS + 5; i++) {
      const frozen = makeFrozen(`p${i}`, `2026-01-01T00:${String(i % 60).padStart(2, '0')}:00Z`, [
        { probeName: 'p1', ref: '@oxn/probes/shell-exec', passed: true, params: { command: 'bun test' } },
      ])
      s = updateProbeStats(s, frozen)
    }
    expect(s.proofRuns.length).toBe(MAX_PROOF_RUNS)
    expect(s.proofRuns[0]?.proofId).toBe('p5') // 前 5 条被丢弃
    expect(s.proofRuns[MAX_PROOF_RUNS - 1]?.proofId).toBe(`p${MAX_PROOF_RUNS + 4}`)
  })

  test('shell-exec 的 target 是 command', () => {
    const frozen = makeFrozen('a', '2026-01-01T00:00:00Z', [
      { probeName: 'p1', ref: '@oxn/probes/shell-exec', passed: true, params: { command: 'bun test' } },
    ])
    const s = initProbeStatsFromFrozen('/p', frozen)
    expect(s.probes['shell-exec']).toBeDefined()
    expect(s.probes['shell-exec'].targets['bun test']).toBeDefined()
  })

  test('不可变性：不修改入参', () => {
    const frozen = makeFrozen('a', '2026-01-01T00:00:00Z', [
      { probeName: 'p1', ref: '@oxn/probes/fs-exists', passed: true, params: { pattern: './x' } },
    ])
    const before = emptyProbeStats('/p')
    const beforeJson = JSON.stringify(before)
    const r = updateProbeStats(before, frozen)
    expect(JSON.stringify(before)).toBe(beforeJson)
    expect(r).not.toBe(before)
    expect(r.proofRuns.length).toBe(1)
    expect(before.proofRuns.length).toBe(0)
  })

  test('unknown ref 走 fallback：去 @oxn/probes/ 前缀', () => {
    const frozen = makeFrozen('a', '2026-01-01T00:00:00Z', [
      { probeName: 'p1', ref: '@oxn/probes/some-future-probe', passed: true, params: { foo: 'bar' } },
    ])
    const s = initProbeStatsFromFrozen('/p', frozen)
    expect(s.probes['some-future-probe']).toBeDefined()
  })
})
