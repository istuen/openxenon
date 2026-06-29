// Proof CLI tests (v0.1.2 Phase A)
// 覆盖：proof 命名规范 / create / list / probe add / run / show / 签名 / chmod 0o444

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'

// -----------------------------------------------------------------------------
// Setup: chdir to a temp project so we don't pollute the real .openxenon/
// -----------------------------------------------------------------------------

let tmpDir: string
let origCwd: string
let repoRoot: string

beforeAll(() => {
  origCwd = process.cwd()
  // __dirname = src/cli/__tests__/，向上 3 级才是 repo root
  repoRoot = resolve(__dirname, '../../..')
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-proof-test-'))
  process.chdir(tmpDir)
  writeFileSync(join(tmpDir, 'package.json'), '{"name":"tmp","version":"0.0.1"}', 'utf-8')
})

afterAll(() => {
  process.chdir(origCwd)
  rmSync(tmpDir, { recursive: true, force: true })
})

afterEach(() => {
  // 每次测试后清理 .openxenon/proofs 目录
  const proofsDir = join(tmpDir, '.openxenon', 'proofs')
  if (existsSync(proofsDir)) {
    // chmod 0o444 的目录可能删不动，强制改回
    try {
      chmodSync(proofsDir, 0o755)
    } catch {
      /* ignore */
    }
    rmSync(proofsDir, { recursive: true, force: true })
  }
})

// -----------------------------------------------------------------------------
// Import the CLI + helpers AFTER chdir so paths resolve against tmpDir
// -----------------------------------------------------------------------------

const proof = await import('../proof')
const { buildFrozenProof, isFrozenFileReadOnly, readFrozenProof, writeFrozenProof } = await import(
  '@openxenon/engine/Proof/proof-frozen-writer'
)

// -----------------------------------------------------------------------------
// T1: proof 命名规范
// -----------------------------------------------------------------------------

describe('proof name validation', () => {
  test('accepts valid kebab-case', () => {
    expect(/^[A-Za-z][A-Za-z0-9_-]*$/.test('check-deploy')).toBe(true)
    expect(/^[A-Za-z][A-Za-z0-9_-]*$/.test('build_artifact')).toBe(true)
  })

  test('rejects invalid names', () => {
    expect(/^[A-Za-z][A-Za-z0-9_-]*$/.test('1-leading-digit')).toBe(false)
    expect(/^[A-Za-z][A-Za-z0-9_-]*$/.test('-leading-dash')).toBe(false)
    expect(/^[A-Za-z][A-Za-z0-9_-]*$/.test('')).toBe(false)
  })
})

// -----------------------------------------------------------------------------
// T2: 路径工具
// -----------------------------------------------------------------------------

describe('proof path helpers', () => {
  test('getProofDir / getProofOxnPath / getProofFrozenPath', () => {
    // macOS resolves /var/... -> /private/var/... via realpath; align expectations
    const cwd = realpathSync(tmpDir)
    expect(proof.getProofDir('check-deploy')).toBe(join(cwd, '.openxenon/proofs/check-deploy'))
    expect(proof.getProofOxnPath('check-deploy')).toBe(join(cwd, '.openxenon/proofs/check-deploy/proof.oxn'))
    expect(proof.getProofFrozenPath('check-deploy')).toBe(join(cwd, '.openxenon/proofs/check-deploy/frozen.json'))
  })
})

// -----------------------------------------------------------------------------
// T3: proof.oxn 解析（DSL）
// -----------------------------------------------------------------------------

describe('parseProofFile', () => {
  test('parses minimal proof.oxn', async () => {
    const oxnPath = proof.getProofOxnPath('parse-test')
    const dir = proof.getProofDir('parse-test')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      oxnPath,
      `proof "parse-test" {
  description = "test desc"
  probe "p1" {
    ref "@oxn/probe/fs-exists"
    params { target = "./package.json" }
  }
}`,
      'utf-8',
    )
    const r = await proof.parseProofFile(oxnPath)
    expect(r.ok).toBe(true)
    expect(r.proof).toBeDefined()
    expect(r.proof!.probes).toHaveLength(1)
    expect(r.proof!.probes[0]!.ref).toBe('@oxn/probe/fs-exists')
  })

  test('rejects malformed proof.oxn', async () => {
    const oxnPath = proof.getProofOxnPath('bad-test')
    const dir = proof.getProofDir('bad-test')
    mkdirSync(dir, { recursive: true })
    writeFileSync(oxnPath, `proof "bad-test" { junk }`, 'utf-8')
    const r = await proof.parseProofFile(oxnPath)
    expect(r.ok).toBe(false)
  })
})

// -----------------------------------------------------------------------------
// T4: frozen writer — signature + chmod 0o444
// -----------------------------------------------------------------------------

describe('writeFrozenProof', () => {
  test('writes frozen.json with SHA-256 signature + chmod 0o444', () => {
    const path = join(tmpDir, 'frozen-test.json')
    const frozen = buildFrozenProof({
      name: 'frozen-test',
      probes: [
        {
          probeName: 'p1',
          ref: '@oxn/probe/fs-exists',
          passed: true,
          durationMs: 5,
        },
      ],
    })
    writeFrozenProof(path, frozen)

    expect(existsSync(path)).toBe(true)
    expect(isFrozenFileReadOnly(path)).toBe(true)

    // 验证签名
    const r = readFrozenProof(path)
    expect(r.ok).toBe(true)
    expect(r.frozen!._xenon_meta.content_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(r.frozen!.verdict).toBe('PASSED')
  })

  test('chmod 0o444 — write attempt should fail', () => {
    const path = join(tmpDir, 'readonly-test.json')
    const frozen = buildFrozenProof({ name: 'r', probes: [] })
    writeFrozenProof(path, frozen)

    expect(() => writeFileSync(path, 'tamper', 'utf-8')).toThrow()
  })

  test('detects tampered content (signature mismatch)', () => {
    const path = join(tmpDir, 'tamper-test.json')
    const frozen = buildFrozenProof({
      name: 'tamper-test',
      probes: [{ probeName: 'p1', ref: 'r', passed: true, durationMs: 1 }],
    })
    writeFrozenProof(path, frozen)

    // 强制 chmod 后篡改文件
    chmodSync(path, 0o644)
    const original = readFileSync(path, 'utf-8')
    const tampered = original.replace('"PASSED"', '"FAILED"')
    writeFileSync(path, tampered, 'utf-8')
    chmodSync(path, 0o444)

    const r = readFrozenProof(path)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/signature mismatch/)
  })

  test('overwrite: 第二次写命中 0o444 文件，writer 自抬位不 EACCES（regression）', () => {
    const path = join(tmpDir, 'overwrite-readonly.json')

    // 第一轮：正常创 frozen.json
    writeFrozenProof(
      path,
      buildFrozenProof({
        name: 'overwrite',
        probes: [{ probeName: 'p1', ref: '@oxn/probe/fs-exists', passed: true, durationMs: 1 }],
      }),
    )
    expect(isFrozenFileReadOnly(path)).toBe(true)

    // 显式确认第二轮写前是 0o444（让"自抬位"测试的 pre-condition 自证）
    expect(statSync(path).mode & 0o777).toBe(0o444)

    // 第二轮：不手动 chmod 0o644，直接覆盖
    expect(() =>
      writeFrozenProof(
        path,
        buildFrozenProof({
          name: 'overwrite',
          probes: [{ probeName: 'p1', ref: '@oxn/probe/fs-exists', passed: false, durationMs: 2 }],
        }),
      ),
    ).not.toThrow()

    // writer 写完自动回锁
    expect(isFrozenFileReadOnly(path)).toBe(true)

    // 读回来：新内容、新签名（readFrozenProof 内部已验签）
    const r = readFrozenProof(path)
    expect(r.ok).toBe(true)
    expect(r.frozen!.verdict).toBe('FAILED')
    expect(r.frozen!.probes[0].passed).toBe(false)
  })
})

// -----------------------------------------------------------------------------
// T5: buildFrozenProof — verdict 判定
// -----------------------------------------------------------------------------

describe('buildFrozenProof verdict', () => {
  test('all PASS → PASSED', () => {
    const f = buildFrozenProof({
      name: 'a',
      probes: [
        { probeName: 'p1', ref: 'r', passed: true, durationMs: 1 },
        { probeName: 'p2', ref: 'r', passed: true, durationMs: 1 },
      ],
    })
    expect(f.verdict).toBe('PASSED')
    expect(f.passedCount).toBe(2)
    expect(f.failedCount).toBe(0)
  })

  test('one FAIL → FAILED', () => {
    const f = buildFrozenProof({
      name: 'b',
      probes: [
        { probeName: 'p1', ref: 'r', passed: true, durationMs: 1 },
        { probeName: 'p2', ref: 'r', passed: false, errorMessage: 'not found', durationMs: 1 },
      ],
    })
    expect(f.verdict).toBe('FAILED')
    expect(f.passedCount).toBe(1)
    expect(f.failedCount).toBe(1)
  })

  test('empty probes → FAILED (no probes means no proof)', () => {
    const f = buildFrozenProof({ name: 'c', probes: [] })
    expect(f.verdict).toBe('FAILED')
    expect(f.totalCount).toBe(0)
  })
})

// -----------------------------------------------------------------------------
// T6: 完整 e2e 流程（手动模拟 CLI 步骤）
// -----------------------------------------------------------------------------

describe('end-to-end: create → probe add → run → show', () => {
  test('full happy path', async () => {
    const name = 'e2e-happy'

    // 1. create
    const oxnPath = proof.getProofOxnPath(name)
    const dir = proof.getProofDir(name)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      oxnPath,
      `proof "${name}" {
  description = "happy path test"
  probe "p1" {
    ref "@oxn/probes/fs-exists"
    params { pattern = "./package.json" }
  }
}`,
      'utf-8',
    )
    expect(existsSync(oxnPath)).toBe(true)

    // 2. parse + run
    const parsed = await proof.parseProofFile(oxnPath)
    expect(parsed.ok).toBe(true)
    const probeIRs = proof.proofProbesToIR(parsed.proof!)
    expect(probeIRs).toHaveLength(1)
    expect(probeIRs[0]!.ref).toBe('@oxn/probes/fs-exists')

    // 3. executeProbe (Kernel + Infra 分离)
    const result = await (await import('@openxenon/engine/Proof/runner')).executeProbe(probeIRs[0]!)
    expect(result.passed).toBe(true)

    // 4. write frozen
    const frozenPath = proof.getProofFrozenPath(name)
    const body = buildFrozenProof({ name, probes: [result] })
    writeFrozenProof(frozenPath, body)

    // 5. verify
    expect(existsSync(frozenPath)).toBe(true)
    expect(isFrozenFileReadOnly(frozenPath)).toBe(true)
    const r = readFrozenProof(frozenPath)
    expect(r.ok).toBe(true)
    expect(r.frozen!.verdict).toBe('PASSED')
  })
})

// -----------------------------------------------------------------------------
// T7: Kernel + Infra 分离验证（v0.1.2 真运行时）
// -----------------------------------------------------------------------------

describe('Kernel + Infra separation (real execution)', () => {
  test('fs-exists with existing file → PASS', async () => {
    const { executeProbe, resolveProbeKind } = await import('@openxenon/engine/Proof/runner')
    expect(resolveProbeKind('@oxn/probes/fs-exists')).toBe('fs-exists')
    const r = await executeProbe(
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        params: { pattern: './package.json' },
      },
      { projectRoot: realpathSync(tmpDir) },
    )
    expect(r.passed).toBe(true)
    expect(r.errorMessage).toBeUndefined()
  })

  test('fs-exists with missing file → FAIL (Kernel verdict)', async () => {
    const { executeProbe } = await import('@openxenon/engine/Proof/runner')
    const r = await executeProbe(
      {
        probeName: 'p1',
        ref: '@oxn/probes/fs-exists',
        params: { pattern: './non-existent-file.xyz' },
      },
      { projectRoot: realpathSync(tmpDir) },
    )
    expect(r.passed).toBe(false)
    expect(r.errorMessage).toMatch(/got 0/)
  })

  test('shell-exec with exit 0 → PASS', async () => {
    const { executeProbe } = await import('@openxenon/engine/Proof/runner')
    const r = await executeProbe(
      {
        probeName: 'p2',
        ref: '@oxn/probes/shell-exec',
        params: { command: 'true' },
      },
      { projectRoot: realpathSync(tmpDir) },
    )
    expect(r.passed).toBe(true)
  })

  test('shell-exec with non-zero exit → FAIL', async () => {
    const { executeProbe } = await import('@openxenon/engine/Proof/runner')
    const r = await executeProbe(
      {
        probeName: 'p3',
        ref: '@oxn/probes/shell-exec',
        params: { command: 'false' },
      },
      { projectRoot: realpathSync(tmpDir) },
    )
    expect(r.passed).toBe(false)
    expect(r.errorMessage).toMatch(/exit code 1/)
  })

  test('Kernel 纯函数：judge() 不碰 IO（无 fs.* / child_process）', async () => {
    const { readFileSync } = await import('fs')
    const verdictSrc = readFileSync(join(repoRoot, 'packages/engine/src/kernel/verdicts/verdict.ts'), 'utf-8')
    // 去掉注释行（// ...）和块注释，再 grep
    const codeOnly = verdictSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(codeOnly).not.toMatch(/\bfs\.|require\(['"]fs|child_process|spawn\(/)
  })

  test('Infra 真实观测：fs-exists handler 在 packages/engine/src/infra/probes/ 里', async () => {
    const { readFileSync, existsSync } = await import('fs')
    expect(existsSync(join(repoRoot, 'packages/engine/src/infra/probes/fs-exists.ts'))).toBe(true)
    expect(existsSync(join(repoRoot, 'packages/engine/src/infra/probes/shell-exec.ts'))).toBe(true)
    const fsExists = readFileSync(join(repoRoot, 'packages/engine/src/infra/probes/fs-exists.ts'), 'utf-8')
    expect(fsExists).toMatch(/statSync|readFileSync/)
  })
})

// -----------------------------------------------------------------------------
// T8: 集成到 OXL grammar — 确认 proof 顶层 entity 正确生成
// -----------------------------------------------------------------------------

describe('OXL grammar integration', () => {
  test('proof 出现在 TopLevelEntity', async () => {
    const { createOxnParser, isProofDeclaration } = await import('@openxenon/engine/oxl')
    const { URI } = await import('langium')
    const parser = createOxnParser()
    const r = await parser.parse('proof "x" { probe "p1" { ref "r" } }', URI.file('/tmp/proof-grammar-test.oxn'))
    expect(r.parseErrors).toEqual([])
    expect(r.lexerErrors).toEqual([])
    const ast = r.ast as any
    expect(ast.entities.some(isProofDeclaration)).toBe(true)
  })
})

// -----------------------------------------------------------------------------
// T5 (v0.2 Sprint 3b): renderShowHuman 3-state verdict 展示
// -----------------------------------------------------------------------------

describe('renderShowHuman 3-state (T5)', () => {
  function buildAndRoundtrip(
    name: string,
    probes: import('../../kernel/schemas/proof-schema').FrozenProofProbeResult[],
  ): import('../../kernel/schemas/proof-schema').FrozenProof {
    const path = join(tmpDir, `${name}.json`)
    writeFrozenProof(path, buildFrozenProof({ name, probes }))
    const r = readFrozenProof(path)
    if (!r.ok || !r.frozen) throw new Error(`roundtrip failed: ${r.reason}`)
    return r.frozen
  }

  test('PASSED 渲染含 ✅ 与 "PASSED (1/1)"', async () => {
    const { renderShowHuman } = await import('../proof')
    const frozen = buildAndRoundtrip('p1-shape', [
      { probeName: 'p1', ref: 'r', passed: true, verdict: 'PASSED', durationMs: 5 },
    ])
    const out = renderShowHuman(frozen)
    expect(out).toMatch(/✅/)
    expect(out).toMatch(/PASSED \(1\/1\)/)
    expect(out).toMatch(/✅ p1 \(r\) — PASSED, 5ms/)
  })

  test('FAILED 渲染含 ❌', async () => {
    const { renderShowHuman } = await import('../proof')
    const frozen = buildAndRoundtrip('p1-fail', [
      { probeName: 'p1', ref: 'r', passed: false, verdict: 'FAILED', durationMs: 5, errorMessage: 'not found' },
    ])
    const out = renderShowHuman(frozen)
    expect(out).toMatch(/❌/)
    expect(out).toMatch(/FAILED \(0\/1\)/)
    expect(out).toMatch(/not found/)
  })

  test('INCONCLUSIVE 渲染含 ⚠️ + "INCONCLUSIVE probes"', async () => {
    const { renderShowHuman } = await import('../proof')
    const frozen = buildAndRoundtrip('p1-inconclusive', [
      {
        probeName: 'p1',
        ref: 'r',
        passed: false,
        verdict: 'INCONCLUSIVE',
        durationMs: 5,
        interferenceFlags: ['sandbox_violation', 'permission_denied'],
      },
    ])
    const out = renderShowHuman(frozen)
    expect(out).toMatch(/⚠️/)
    expect(out).toMatch(/INCONCLUSIVE \(0\/1, INCONCLUSIVE probes\)/)
    expect(out).toMatch(/\[flags: sandbox_violation, permission_denied\]/)
  })
})

// =============================================================================
// v0.4 PR-B (Q4-A): proof ↔ work 快照机制测试
// =============================================================================

import {
  getProofMdPath,
  getProofWorkHashPath,
  parseProofMetadata,
  resolveWorkPath,
  snapshotWorkMd,
  verifyWorkHash,
} from '../proof'

describe('v0.4 PR-B Q4-A: parseProofMetadata', () => {
  test('extracts proofs-target-work from comment', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'oxn-meta-'))
    const proofPath = join(tmp, 'proof.oxn')
    writeFileSync(
      proofPath,
      [
        '// Proof: foo',
        '// proofs-target-work: ../../works/foo/work.oxn',
        '// Other comment',
        'proof "foo" { description = "..." probe "p1" { ref "x" } }',
      ].join('\n'),
    )
    const meta = parseProofMetadata(proofPath)
    expect(meta['proofs-target-work']).toBe('../../works/foo/work.oxn')
    rmSync(tmp, { recursive: true, force: true })
  })

  test('returns empty metadata for proof without target comment', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'oxn-meta-'))
    const proofPath = join(tmp, 'proof.oxn')
    writeFileSync(proofPath, '// just a comment\nproof "foo" { }')
    const meta = parseProofMetadata(proofPath)
    expect(meta['proofs-target-work']).toBeUndefined()
    rmSync(tmp, { recursive: true, force: true })
  })

  test('returns empty metadata for missing file', () => {
    const meta = parseProofMetadata('/nonexistent/proof.oxn')
    expect(meta).toEqual({})
  })
})

describe('v0.4 PR-B Q4-A: resolveWorkPath', () => {
  test('absolute path passes through', () => {
    const proofPath = '/some/proof.oxn'
    const result = resolveWorkPath(proofPath, '/abs/path/work.oxn')
    expect(result).toBe('/abs/path/work.oxn')
  })

  test('relative path resolves against proof.oxn directory', () => {
    const proofPath = '/x/proofs/foo/proof.oxn'
    const result = resolveWorkPath(proofPath, '../../works/foo/work.oxn')
    expect(result).toBe('/x/works/foo/work.oxn')
  })
})

describe('v0.4 PR-B Q4-A: snapshotWorkMd', () => {
  let tmpDir: string
  let workDir: string
  let proofDir: string
  let proofOxnPath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-snap-'))
    workDir = join(tmpDir, 'works', 'foo')
    proofDir = join(tmpDir, 'proofs', 'foo')
    mkdirSync(workDir, { recursive: true })
    mkdirSync(proofDir, { recursive: true })
    writeFileSync(join(workDir, 'work.oxn'), '# work content v1\n')
    proofOxnPath = join(proofDir, 'proof.oxn')
    writeFileSync(
      proofOxnPath,
      [
        '// Proof: foo',
        `// proofs-target-work: ../../works/foo/work.oxn`,
        'proof "foo" { description = "x" probe "p1" { ref "y" } }',
      ].join('\n'),
    )
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('first run: status=updated, writes proof.md + work-hash.txt', () => {
    const r = snapshotWorkMd('foo', proofOxnPath)
    expect(r.status).toBe('updated')
    expect(r.workHash).toBeDefined()
    expect(existsSync(getProofMdPath('foo'))).toBe(true)
    expect(existsSync(getProofWorkHashPath('foo'))).toBe(true)
  })

  test('idempotent: same work.md → status=unchanged, no overwrite', async () => {
    snapshotWorkMd('foo', proofOxnPath)
    const mtime1 = statSync(getProofMdPath('foo')).mtimeMs
    await new Promise((r) => setTimeout(r, 10))
    const r2 = snapshotWorkMd('foo', proofOxnPath)
    expect(r2.status).toBe('unchanged')
    const mtime2 = statSync(getProofMdPath('foo')).mtimeMs
    expect(mtime2).toBe(mtime1)
  })

  test('work.md changed: status=updated, new hash', () => {
    snapshotWorkMd('foo', proofOxnPath)
    const hash1 = readFileSync(getProofWorkHashPath('foo'), 'utf-8').trim()
    writeFileSync(join(workDir, 'work.oxn'), '# work content v2 changed\n')
    const r2 = snapshotWorkMd('foo', proofOxnPath)
    expect(r2.status).toBe('updated')
    const hash2 = readFileSync(getProofWorkHashPath('foo'), 'utf-8').trim()
    expect(hash2).not.toBe(hash1)
  })

  test('proof.md is 0o444 (immutable)', () => {
    snapshotWorkMd('foo', proofOxnPath)
    const st = statSync(getProofMdPath('foo'))
    // 0o444 = 292; 0o444 & 0o777 = 292
    expect(st.mode & 0o777).toBe(0o444)
  })

  test('no proofs-target-work annotation: status=no-target', () => {
    writeFileSync(proofOxnPath, '// no target\nproof "foo" { }')
    const r = snapshotWorkMd('foo', proofOxnPath)
    expect(r.status).toBe('no-target')
  })

  test('work file missing: status=error', () => {
    rmSync(join(workDir, 'work.oxn'))
    const r = snapshotWorkMd('foo', proofOxnPath)
    expect(r.status).toBe('error')
    expect(r.error).toContain('work file not found')
  })
})

describe('v0.4 PR-B Q4-A: verifyWorkHash', () => {
  let tmpDir: string
  let workDir: string
  let proofDir: string
  let proofOxnPath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-verify-'))
    workDir = join(tmpDir, 'works', 'foo')
    proofDir = join(tmpDir, 'proofs', 'foo')
    mkdirSync(workDir, { recursive: true })
    mkdirSync(proofDir, { recursive: true })
    writeFileSync(join(workDir, 'work.oxn'), '# content\n')
    proofOxnPath = join(proofDir, 'proof.oxn')
    writeFileSync(proofOxnPath, ['// proofs-target-work: ../../works/foo/work.oxn', 'proof "foo" { }'].join('\n'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('no snapshot yet: status=no-snapshot, ok=false', () => {
    const r = verifyWorkHash('foo', proofOxnPath)
    expect(r.status).toBe('no-snapshot')
    expect(r.ok).toBe(false)
  })

  test('after snapshot, no change: status=match, ok=true', () => {
    snapshotWorkMd('foo', proofOxnPath)
    const r = verifyWorkHash('foo', proofOxnPath)
    expect(r.status).toBe('match')
    expect(r.ok).toBe(true)
  })

  test('after snapshot, work.md changed: status=drift, ok=false', () => {
    snapshotWorkMd('foo', proofOxnPath)
    writeFileSync(join(workDir, 'work.oxn'), '# changed\n')
    const r = verifyWorkHash('foo', proofOxnPath)
    expect(r.status).toBe('drift')
    expect(r.ok).toBe(false)
    expect(r.liveHash).not.toBe(r.prevHash)
  })

  test('work file missing: status=work-missing', () => {
    snapshotWorkMd('foo', proofOxnPath)
    rmSync(join(workDir, 'work.oxn'))
    const r = verifyWorkHash('foo', proofOxnPath)
    expect(r.status).toBe('work-missing')
    expect(r.ok).toBe(false)
  })

  test('no target annotation: status=no-target, ok=true (silent pass)', () => {
    writeFileSync(proofOxnPath, '// no target\nproof "foo" { }')
    const r = verifyWorkHash('foo', proofOxnPath)
    expect(r.status).toBe('no-target')
    expect(r.ok).toBe(true)
  })
})
