// =============================================================================
// pool-review-approve-reject-e2e.test.ts — v0.5 PR-D
//
// 黑盒 E2E：oxn pool review/approve/reject + --from insight
// 覆盖：
//   1. 手动创建 audit pool entry → review 显示
//   2. approve 流程：原子覆盖目标文件 + 写回 frozen.json approval
//   3. approve --dry-run：不写文件
//   4. reject 流程：写回 frozen.json rejection
//   5. --from insight：自动生成建议
//   6. 目标文件不存在 → OXN_INTENT_TARGET_MISSING
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
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
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-pool-review-e2e-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    try {
      chmodSync(join(tmpDir, '.openxenon'), 0o755)
    } catch {
      /* ignore */
    }
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function initProject(): Promise<void> {
  const r = await runCli(['init'])
  if (r.exitCode !== 0) throw new Error(`init failed: ${r.stderr || r.stdout}`)
}

function writeDomain(name: string, content: string): void {
  const dir = join(realpathSync(tmpDir), '.openxenon', 'domains')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.oxn`), content, 'utf-8')
}

describe('oxn pool review/approve/reject (v0.5 PR-D)', () => {
  test('创建 audit pool entry → review 显示', async () => {
    await initProject()
    const r1 = await runCli([
      'pool',
      'create',
      '--pool',
      'audit',
      '--slug',
      'test-suggestion',
      '--title',
      'Test Suggestion',
      '--content',
      '## What\n\nTest content',
    ])
    expect(r1.exitCode).toBe(0)

    const r2 = await runCli(['pool', 'review', 'test-suggestion'])
    expect(r2.exitCode).toBe(0)
    expect(r2.stdout).toContain('Audit Pool Review: test-suggestion')
    expect(r2.stdout).toContain('Test Suggestion')
  })

  test('approve 正常流程：原子覆盖目标文件', async () => {
    await initProject()
    writeDomain('TestContext', 'domain "TestContext" {\n  description = "test"\n}\n')

    // 先创建 audit pool entry
    const r1 = await runCli([
      'pool',
      'create',
      '--pool',
      'audit',
      '--slug',
      'add-invariant-test',
      '--title',
      'Add C1 invariant',
      '--content',
      '## What\n\nTest',
    ])
    expect(r1.exitCode).toBe(0)

    // 直接编辑 frozen.json 注入 metadata（绕过 --from insight）
    const frozenPath = join(realpathSync(tmpDir), '.openxenon', 'pools', 'audit', 'add-invariant-test', 'frozen.json')
    const raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    raw.metadata = {
      target: 'domain',
      targetName: 'TestContext',
      targetPath: '.openxenon/domains/TestContext.oxn',
      kind: 'add-invariant',
      patch: 'invariant {\n  "C1: test rule"\n}',
      source: 'unit-test',
    }
    chmodSync(frozenPath, 0o644)
    writeFileSync(frozenPath, JSON.stringify(raw, null, 2), 'utf-8')

    const targetPath = join(realpathSync(tmpDir), '.openxenon', 'domains', 'TestContext.oxn')
    const beforeContent = readFileSync(targetPath, 'utf-8')

    const r2 = await runCli(['pool', 'approve', 'add-invariant-test', '--json'])
    expect(r2.exitCode).toBe(0)

    const j = JSON.parse(r2.stdout) as {
      ok: boolean
      data: { beforeHash: string; afterHash: string; dryRun: boolean }
    }
    expect(j.ok).toBe(true)
    expect(j.data.beforeHash).not.toBe(j.data.afterHash)
    expect(j.data.dryRun).toBe(false)

    // 文件内容应包含 patch
    const afterContent = readFileSync(targetPath, 'utf-8')
    expect(afterContent).toContain('C1: test rule')
    expect(afterContent).not.toBe(beforeContent)

    // frozen.json 应包含 approval 记录
    const after = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(after.metadata.approval).toBeDefined()
    expect(after.metadata.approval.beforeHash).toBe(j.data.beforeHash)
    expect(after.metadata.approval.afterHash).toBe(j.data.afterHash)
  })

  test('approve --dry-run：不写文件', async () => {
    await initProject()
    writeDomain('TestContext', 'domain "TestContext" {\n  description = "test"\n}\n')

    await runCli(['pool', 'create', '--pool', 'audit', '--slug', 'dry-run-test', '--title', 'Test', '--content', 'x'])
    const frozenPath = join(realpathSync(tmpDir), '.openxenon', 'pools', 'audit', 'dry-run-test', 'frozen.json')
    const raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    raw.metadata = {
      target: 'domain',
      targetName: 'TestContext',
      targetPath: '.openxenon/domains/TestContext.oxn',
      kind: 'add-invariant',
      patch: 'invariant {\n  "C1: dry run test"\n}',
    }
    chmodSync(frozenPath, 0o644)
    writeFileSync(frozenPath, JSON.stringify(raw, null, 2), 'utf-8')

    const targetPath = join(realpathSync(tmpDir), '.openxenon', 'domains', 'TestContext.oxn')
    const beforeContent = readFileSync(targetPath, 'utf-8')

    const r = await runCli(['pool', 'approve', 'dry-run-test', '--dry-run', '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as { data: { dryRun: boolean } }
    expect(j.data.dryRun).toBe(true)

    // 文件未改
    const afterContent = readFileSync(targetPath, 'utf-8')
    expect(afterContent).toBe(beforeContent)
  })

  test('reject 流程：写回 frozen.json rejection 记录', async () => {
    await initProject()
    await runCli(['pool', 'create', '--pool', 'audit', '--slug', 'reject-test', '--title', 'Test', '--content', 'x'])

    const r = await runCli(['pool', 'reject', 'reject-test', '--reason', 'not applicable', '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as {
      ok: boolean
      data: { rejectionRecord: { reason: string } }
    }
    expect(j.ok).toBe(true)
    expect(j.data.rejectionRecord.reason).toBe('not applicable')

    const frozenPath = join(realpathSync(tmpDir), '.openxenon', 'pools', 'audit', 'reject-test', 'frozen.json')
    const after = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(after.metadata.rejection).toBeDefined()
    expect(after.metadata.rejection.reason).toBe('not applicable')
  })

  test('目标文件不存在 → OXN_INTENT_TARGET_MISSING', async () => {
    await initProject()
    await runCli(['pool', 'create', '--pool', 'audit', '--slug', 'missing-target', '--title', 'Test', '--content', 'x'])
    const frozenPath = join(realpathSync(tmpDir), '.openxenon', 'pools', 'audit', 'missing-target', 'frozen.json')
    const raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    raw.metadata = {
      target: 'domain',
      targetName: 'NonExistent',
      targetPath: '.openxenon/domains/NonExistent.oxn',
      kind: 'add-invariant',
      patch: 'invariant { "x" }',
    }
    chmodSync(frozenPath, 0o644)
    writeFileSync(frozenPath, JSON.stringify(raw, null, 2), 'utf-8')

    const r = await runCli(['pool', 'approve', 'missing-target', '--json'])
    expect(r.exitCode).toBe(1)
    // Approve prints error to stderr (via outputError) — read it from there
    let parsed: { ok: boolean; error?: { code: string } } | null = null
    try {
      parsed = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    } catch {
      // try stderr
      try {
        parsed = JSON.parse(r.stderr) as { ok: boolean; error?: { code: string } }
      } catch {
        // ignore
      }
    }
    expect(parsed).not.toBeNull()
    expect(parsed?.ok).toBe(false)
    expect(parsed?.error?.code).toBe('OXN_INTENT_TARGET_MISSING')
  })

  test('audit pool entry 不存在 → OXN_POOL_ENTRY_NOT_FOUND', async () => {
    await initProject()
    const r = await runCli(['pool', 'review', 'no-such-thing', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.error?.code).toBe('OXN_POOL_ENTRY_NOT_FOUND')
  })

  test('--from insight：从 pipeline insight JSON 自动生成建议', async () => {
    await initProject()
    writeDomain('TestDomain', 'domain "TestDomain" {\n  description = "test"\n}\n')

    // 构造一个 pipeline insight JSON（含 critical invariant）
    const insightJson = JSON.stringify({
      schemaVersion: 1,
      projectRoot: '/tmp',
      domainCount: 1,
      blueprintCount: 0,
      workCount: 0,
      proofCount: 0,
      generatedAt: '2026-01-01T00:00:00Z',
      invariantEffectiveness: [
        {
          domainName: 'TestDomain',
          invariantText: 'C99: from insight test',
          status: 'critical',
          totalWorks: 5,
          failedWorks: 3,
          totalProofs: 10,
          failedProofs: 5,
          hitRate: 0.5,
        },
      ],
      intentCoverageGaps: [],
      workProofTraces: [],
      meta: {
        insightVersion: '0.1.0',
        dataSources: ['domains', 'blueprints', 'works', 'proofs', 'trace.jsonl'],
      },
    })
    const insightPath = join(tmpDir, 'insight.json')
    writeFileSync(insightPath, insightJson, 'utf-8')

    const r = await runCli([
      '--json',
      'pool',
      'create',
      '--pool',
      'audit',
      '--from-insight',
      insightPath,
      '--target-domain',
      'TestDomain',
      '--insight-kind',
      'pipeline',
    ])
    expect(r.exitCode).toBe(0)
    const outer = JSON.parse(r.stdout) as { ok: boolean; data: { ok: boolean; fromInsight: boolean; path: string } }
    expect(outer.ok).toBe(true)
    expect(outer.data.ok).toBe(true)
    expect(outer.data.fromInsight).toBe(true)
    expect(outer.data.path).toMatch(/pools\/audit\/add-invariant-c99-testdomain-\d+\.md$/)

    // 验证 audit entry 内容
    const base = realpathSync(tmpDir)
    const mdPath = outer.data.path
    const mdContent = readFileSync(mdPath, 'utf-8')
    expect(mdContent).toContain('C99: from insight test')
  })
})
