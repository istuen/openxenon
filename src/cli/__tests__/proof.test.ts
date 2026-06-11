// Proof CLI tests (v0.1.2 Phase A)
// 覆盖：proof 命名规范 / create / list / probe add / run / show / 签名 / chmod 0o444

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'fs'
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
  '../proof-frozen-writer'
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
    require('fs').mkdirSync(dir, { recursive: true })
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
    require('fs').mkdirSync(dir, { recursive: true })
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
    require('fs').mkdirSync(dir, { recursive: true })
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
    const result = await (await import('../proof-runner')).executeProbe(probeIRs[0]!)
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
    const { executeProbe, resolveProbeKind } = await import('../proof-runner')
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
    const { executeProbe } = await import('../proof-runner')
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
    const { executeProbe } = await import('../proof-runner')
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
    const { executeProbe } = await import('../proof-runner')
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
    const verdictSrc = readFileSync(join(repoRoot, 'src/kernel/verdicts/verdict.ts'), 'utf-8')
    // 去掉注释行（// ...）和块注释，再 grep
    const codeOnly = verdictSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(codeOnly).not.toMatch(/\bfs\.|require\(['"]fs|child_process|spawn\(/)
  })

  test('Infra 真实观测：fs-exists handler 在 src/infra/probes/ 里', async () => {
    const { readFileSync, existsSync } = await import('fs')
    expect(existsSync(join(repoRoot, 'src/infra/probes/fs-exists.ts'))).toBe(true)
    expect(existsSync(join(repoRoot, 'src/infra/probes/shell-exec.ts'))).toBe(true)
    const fsExists = readFileSync(join(repoRoot, 'src/infra/probes/fs-exists.ts'), 'utf-8')
    expect(fsExists).toMatch(/statSync|readFileSync/)
  })
})

// -----------------------------------------------------------------------------
// T8: 集成到 OXN DSL grammar — 确认 proof 顶层 entity 正确生成
// -----------------------------------------------------------------------------

describe('OXN DSL grammar integration', () => {
  test('proof 出现在 TopLevelEntity', async () => {
    const { createOxnParser, isProofDeclaration } = await import('../../oxl')
    const { URI } = await import('langium')
    const parser = createOxnParser()
    const r = await parser.parse('proof "x" { probe "p1" { ref "r" } }', URI.file('/tmp/proof-grammar-test.oxn'))
    expect(r.parseErrors).toEqual([])
    expect(r.lexerErrors).toEqual([])
    const ast = r.ast as any
    expect(ast.entities.some(isProofDeclaration)).toBe(true)
  })
})
