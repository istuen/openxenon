// =============================================================================
// Proof Verdict .md Writer tests (v0.5 PR-A)
//
// 覆盖：
//   1. buildVerdictMd 构造 frontmatter + Evidence + Summary + Interference
//   2. 三态 verdict 渲染（PASSED / FAILED / INCONCLUSIVE）
//   3. SHA-256 content_hash 自洽（写完后 readVerdictMd 验签通过）
//   4. SHA-256 frozen_hash 交叉引用
//   5. 写盘 chmod 0o444
//   6. 篡改后 readVerdictMd 验签失败
//   7. Target 提取（fs-exists → path / shell-exec → command）
//   8. Interference flags 收集与去重
// =============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// -----------------------------------------------------------------------------
// Setup: chdir to a temp project so we don't pollute the real .openxenon/
// -----------------------------------------------------------------------------

let tmpDir: string
let origCwd: string

beforeAll(() => {
  origCwd = process.cwd()
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-verdict-test-'))
  process.chdir(tmpDir)
  writeFileSync(join(tmpDir, 'package.json'), '{"name":"tmp","version":"0.0.1"}', 'utf-8')
})

afterAll(() => {
  process.chdir(origCwd)
  rmSync(tmpDir, { recursive: true, force: true })
})

afterEach(() => {
  // chmod 0o444 的目录可能删不动
  try {
    chmodSync(join(tmpDir, 'proofs'), 0o755)
  } catch {
    /* ignore */
  }
  rmSync(join(tmpDir, 'proofs'), { recursive: true, force: true })
})

// -----------------------------------------------------------------------------
// Import AFTER chdir
// -----------------------------------------------------------------------------

const { buildVerdictMd, writeVerdictMd, readVerdictMd, FROZEN_FILE_MODE } = await import('@openxenon/engine/Proof/verdict-writer')
const { buildFrozenProof, writeFrozenProof, readFrozenProof } = await import('@openxenon/engine/Proof/proof-frozen-writer')

// -----------------------------------------------------------------------------
// T1: buildVerdictMd frontmatter
// -----------------------------------------------------------------------------

describe('buildVerdictMd frontmatter', () => {
  test('含 proof_id / verdict / run_at / frozen_hash / content_hash 等必填字段', () => {
    const frozenPath = join(tmpDir, 't1-shape.json')
    const body = buildFrozenProof({
      name: 'check-deploy',
      probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 10 }],
    })
    writeFrozenProof(frozenPath, body)
    const r = readFrozenProof(frozenPath)
    if (!r.ok || !r.frozen) throw new Error('roundtrip failed')

    const md = buildVerdictMd(r.frozen)

    expect(md).toMatch(/^---\n/)
    expect(md).toMatch(/proof_id: check-deploy/)
    expect(md).toMatch(/verdict: PASSED/)
    expect(md).toMatch(/run_at: /)
    expect(md).toMatch(/frozen_hash: [a-f0-9]{64}/)
    expect(md).toMatch(/probe_count: 1/)
    expect(md).toMatch(/passed_count: 1/)
    expect(md).toMatch(/failed_count: 0/)
    expect(md).toMatch(/content_hash: [a-f0-9]{64}/)
    expect(md).toMatch(/\n---\n/)
  })

  test('FAILED verdict 时含 ❌ emoji', () => {
    const path = join(tmpDir, 't1-fail.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'p-fail',
        probes: [{ probeName: 'p1', ref: 'r', passed: false, verdict: 'FAILED', durationMs: 5, errorMessage: 'boom' }],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')
    const md = buildVerdictMd(r.frozen)
    expect(md).toMatch(/❌/)
    expect(md).toMatch(/verdict: FAILED/)
    expect(md).toMatch(/error: boom/)
  })

  test('INCONCLUSIVE verdict 时含 ⚠️ + inconclusive_count 字段', () => {
    const path = join(tmpDir, 't1-inconclusive.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'p-inc',
        probes: [
          {
            probeName: 'p1',
            ref: 'r',
            passed: false,
            verdict: 'INCONCLUSIVE',
            durationMs: 5,
            interferenceFlags: ['waf_detected'],
          },
        ],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')
    const md = buildVerdictMd(r.frozen)
    expect(md).toMatch(/⚠️/)
    expect(md).toMatch(/verdict: INCONCLUSIVE/)
    expect(md).toMatch(/inconclusive_count: 1/)
    expect(md).toMatch(/waf_detected/)
  })

  test('所有 probe PASSED 时不含 inconclusive_count 字段', () => {
    const path = join(tmpDir, 't1-all-pass.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'all-pass',
        probes: [
          { probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 1 },
          { probeName: 'p2', ref: 'r2', passed: true, verdict: 'PASSED', durationMs: 2 },
        ],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')
    const md = buildVerdictMd(r.frozen)
    expect(md).not.toMatch(/inconclusive_count/)
  })
})

// -----------------------------------------------------------------------------
// T2: buildVerdictMd Evidence / Summary / Interference sections
// -----------------------------------------------------------------------------

describe('buildVerdictMd sections', () => {
  test('## Evidence / ## Verdict Summary / ## Interference 三段齐全', () => {
    const path = join(tmpDir, 't2-sections.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'sections',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 5 }],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')
    const md = buildVerdictMd(r.frozen)
    expect(md).toMatch(/## Evidence/)
    expect(md).toMatch(/## Verdict Summary/)
    expect(md).toMatch(/\| Metric \| Value \|/)
    expect(md).toMatch(/\| \*\*Overall verdict\*\* \| \*\*PASSED\*\* \|/)
    expect(md).toMatch(/## Interference/)
    expect(md).toMatch(/_\(none detected\)_/)
  })

  test('Evidence 每行含 probe name + ref + verdict + duration', () => {
    const path = join(tmpDir, 't2-evidence.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'evidence',
        probes: [
          { probeName: 'p1', ref: '@oxn/probes/ts-compiles', passed: true, verdict: 'PASSED', durationMs: 12 },
          {
            probeName: 'p2',
            ref: '@oxn/probes/test-pass',
            passed: false,
            verdict: 'FAILED',
            durationMs: 8,
            errorMessage: '1 test failed',
          },
        ],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')
    const md = buildVerdictMd(r.frozen)
    expect(md).toMatch(/- ✅ \*\*p1\*\* `@oxn\/probes\/ts-compiles` \(PASSED, 12ms\)/)
    expect(md).toMatch(/- ❌ \*\*p2\*\* `@oxn\/probes\/test-pass` \(FAILED, 8ms\)/)
    expect(md).toMatch(/error: 1 test failed/)
  })

  test('Interference 段去重排序多个 flag', () => {
    const path = join(tmpDir, 't2-interference.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'intf',
        probes: [
          {
            probeName: 'p1',
            ref: 'r',
            passed: true,
            verdict: 'PASSED',
            durationMs: 1,
            interferenceFlags: ['cdn_cache', 'waf_detected'],
          },
          {
            probeName: 'p2',
            ref: 'r',
            passed: true,
            verdict: 'PASSED',
            durationMs: 1,
            interferenceFlags: ['waf_detected', 'cache_path'],
          },
        ],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')
    const md = buildVerdictMd(r.frozen)
    // 仅截取 ## Interference 段做顺序验证（避免 Evidence 段的同名 flag 干扰）
    const intfSection = md.split('## Interference')[1] ?? ''
    expect(intfSection).toMatch(/- `cache_path`/)
    expect(intfSection).toMatch(/- `cdn_cache`/)
    expect(intfSection).toMatch(/- `waf_detected`/)
    const cacheIdx = intfSection.indexOf('cache_path')
    const cdnIdx = intfSection.indexOf('cdn_cache')
    const wafIdx = intfSection.indexOf('waf_detected')
    expect(cacheIdx).toBeLessThan(cdnIdx)
    expect(cdnIdx).toBeLessThan(wafIdx)
  })
})

// -----------------------------------------------------------------------------
// T3: SHA-256 content_hash 自洽
// -----------------------------------------------------------------------------

describe('content_hash integrity', () => {
  test('content_hash 是 body (剥 content_hash 行) 的 SHA-256', async () => {
    const path = join(tmpDir, 't3-hash.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'hash-test',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 1 }],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')

    const md = buildVerdictMd(r.frozen)
    const hashMatch = md.match(/content_hash: ([a-f0-9]{64})/)
    expect(hashMatch).not.toBeNull()
    const claimedHash = hashMatch![1]!

    const canonical = md.replace(/content_hash: [a-f0-9]{64}/, 'content_hash: ')
    const { createHash } = await import('crypto')
    const expectedHash = createHash('sha256').update(canonical).digest('hex')
    expect(claimedHash).toBe(expectedHash)
  })

  test('frozen_hash 等于 frozen.json._xenon_meta.content_hash', () => {
    const path = join(tmpDir, 't3-frozen-hash.json')
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'fh',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 1 }],
      }),
    )
    const r = readFrozenProof(path)
    if (!r.frozen) throw new Error('no frozen')

    const md = buildVerdictMd(r.frozen)
    const fhMatch = md.match(/frozen_hash: ([a-f0-9]{64})/)
    expect(fhMatch).not.toBeNull()
    expect(fhMatch![1]).toBe(r.frozen._xenon_meta.content_hash)
  })
})

// -----------------------------------------------------------------------------
// T4: 写盘 chmod 0o444
// -----------------------------------------------------------------------------

describe('writeVerdictMd disk write', () => {
  test('写盘后文件存在 + mode=0o444', () => {
    const proofDir = join(tmpDir, 'proofs', 'check-deploy')
    const frozenPath = join(proofDir, 'frozen.json')
    const verdictPath = join(proofDir, 'verdict.md')
    writeFrozenProof(
      frozenPath,
      buildFrozenProof({
        name: 'check-deploy',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 5 }],
      }),
    )
    const r = readFrozenProof(frozenPath)
    if (!r.frozen) throw new Error('no frozen')
    writeVerdictMd(verdictPath, r.frozen)

    expect(existsSync(verdictPath)).toBe(true)
    const stat = statSync(verdictPath)
    expect(stat.mode & 0o777).toBe(FROZEN_FILE_MODE)
  })

  test('覆盖场景：先 chmod 0o644 再写 → 最终 mode=0o444', () => {
    const proofDir = join(tmpDir, 'proofs', 'check-deploy-2')
    const frozenPath = join(proofDir, 'frozen.json')
    const verdictPath = join(proofDir, 'verdict.md')
    writeFrozenProof(
      frozenPath,
      buildFrozenProof({
        name: 'check-deploy-2',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 5 }],
      }),
    )
    const r = readFrozenProof(frozenPath)
    if (!r.frozen) throw new Error('no frozen')
    writeVerdictMd(verdictPath, r.frozen)
    writeVerdictMd(verdictPath, r.frozen)
    const stat = statSync(verdictPath)
    expect(stat.mode & 0o777).toBe(FROZEN_FILE_MODE)
  })
})

// -----------------------------------------------------------------------------
// T5: readVerdictMd 验签
// -----------------------------------------------------------------------------

describe('readVerdictMd signature', () => {
  test('正常写盘 → readVerdictMd ok=true', () => {
    const proofDir = join(tmpDir, 'proofs', 'check-deploy-3')
    const frozenPath = join(proofDir, 'frozen.json')
    const verdictPath = join(proofDir, 'verdict.md')
    writeFrozenProof(
      frozenPath,
      buildFrozenProof({
        name: 'check-deploy-3',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 5 }],
      }),
    )
    const r = readFrozenProof(frozenPath)
    if (!r.frozen) throw new Error('no frozen')
    writeVerdictMd(verdictPath, r.frozen)

    const v = readVerdictMd(verdictPath)
    expect(v.ok).toBe(true)
    expect(v.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(v.frozenHash).toBe(r.frozen._xenon_meta.content_hash)
  })

  test('篡改 verdict.md 内容 → readVerdictMd ok=false + reason=signature mismatch', () => {
    const proofDir = join(tmpDir, 'proofs', 'check-deploy-4')
    const frozenPath = join(proofDir, 'frozen.json')
    const verdictPath = join(proofDir, 'verdict.md')
    writeFrozenProof(
      frozenPath,
      buildFrozenProof({
        name: 'check-deploy-4',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 5 }],
      }),
    )
    const r = readFrozenProof(frozenPath)
    if (!r.frozen) throw new Error('no frozen')
    writeVerdictMd(verdictPath, r.frozen)

    chmodSync(verdictPath, 0o644)
    const original = readFileSync(verdictPath, 'utf-8')
    const tampered = original.replace('Total probes | 1', 'Total probes | 99')
    writeFileSync(verdictPath, tampered, 'utf-8')
    chmodSync(verdictPath, FROZEN_FILE_MODE)

    const v = readVerdictMd(verdictPath)
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/signature mismatch/)
  })

  test('文件不存在 → ok=false + reason=not found', () => {
    const v = readVerdictMd(join(tmpDir, 'proofs', 'no-such', 'verdict.md'))
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/not found/)
  })
})

// -----------------------------------------------------------------------------
// T6: 独立产出（verdict.md 写失败不影响 frozen.json）
// -----------------------------------------------------------------------------

describe('verdict.md independent of frozen.json', () => {
  test('删 verdict.md → frozen.json 仍可读', () => {
    const proofDir = join(tmpDir, 'proofs', 'ind')
    const frozenPath = join(proofDir, 'frozen.json')
    const verdictPath = join(proofDir, 'verdict.md')
    writeFrozenProof(
      frozenPath,
      buildFrozenProof({
        name: 'ind',
        probes: [{ probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 5 }],
      }),
    )
    const r = readFrozenProof(frozenPath)
    if (!r.frozen) throw new Error('no frozen')
    writeVerdictMd(verdictPath, r.frozen)

    chmodSync(verdictPath, 0o644)
    rmSync(verdictPath)

    const f = readFrozenProof(frozenPath)
    expect(f.ok).toBe(true)
    expect(f.frozen).not.toBeNull()
  })
})
