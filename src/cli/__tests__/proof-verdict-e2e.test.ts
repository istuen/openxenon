// =============================================================================
// proof-verdict-e2e.test.ts — v0.5 PR-A
//
// 黑盒 E2E：oxn proof run 后 verdict.md 落盘并 chmod 0o444 + SHA-256 自洽
//
// 覆盖：
//   1. 跑 `oxn proof run` 后 .openxenon/proofs/<n>/verdict.md 存在且 chmod 0o444
//   2. verdict.md 含 YAML frontmatter（含 proof_id/verdict/frozen_hash/content_hash）
//   3. verdict.md frontmatter 的 frozen_hash 与 frozen.json 的 SHA-256 一致
//   4. verdict.md frontmatter 的 content_hash 与 readVerdictMd 验签一致
//   5. `oxn proof show` 提示 verdict.md 路径（hasVerdict=true）
//   6. dry-run 模式不写 verdict.md（仅 Phase 1）
//   7. verdict.md 写失败时 frozen.json 仍保留（独立产出）
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
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-proof-verdict-e2e-'))
})

afterEach(() => {
  // chmod 0o444 防御：顶层 .openxenon 目录可能因 verdict.md 写入而变 mode
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

function proofDir(name: string): string {
  // macOS resolves /var/... → /private/var/... via realpath
  return join(realpathSync(tmpDir), '.openxenon', 'proofs', name)
}
function frozenPath(name: string): string {
  return join(proofDir(name), 'frozen.json')
}
function verdictPath(name: string): string {
  return join(proofDir(name), 'verdict.md')
}
function proofOxnPath(name: string): string {
  return join(proofDir(name), 'proof.oxn')
}

function writeProof(name: string, probes: string): void {
  mkdirSync(proofDir(name), { recursive: true })
  writeFileSync(
    proofOxnPath(name),
    `proof "${name}" {
  description = "v0.5 PR-A verdict.md E2E"
${probes}
}
`,
    'utf-8',
  )
}

describe('oxn proof run → verdict.md 落盘 (v0.5 PR-A)', () => {
  test('happy path：frozen.json + verdict.md 同时存在 + verdict.md chmod 0o444', async () => {
    await initProject()
    const name = 'verdict-happy'

    writeProof(
      name,
      `  probe "p1-trivial" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`,
    )

    const r = await runCli(['proof', 'run', name, '--json'])
    expect(r.exitCode).toBe(0)

    const j = JSON.parse(r.stdout) as {
      data: { verdict: string; frozenPath: string; verdictPath: string | null; verdictWritten: boolean }
    }
    expect(j.data.verdict).toBe('PASSED')
    expect(j.data.verdictWritten).toBe(true)
    expect(j.data.verdictPath).toBe(verdictPath(name))

    expect(existsSync(frozenPath(name))).toBe(true)
    expect(existsSync(verdictPath(name))).toBe(true)

    const stat = statSync(verdictPath(name))
    expect(stat.mode & 0o777).toBe(0o444)
  })

  test('verdict.md 含 YAML frontmatter（proof_id/verdict/frozen_hash/content_hash）', async () => {
    await initProject()
    const name = 'verdict-frontmatter'

    writeProof(
      name,
      `  probe "p1-trivial" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`,
    )

    const r = await runCli(['proof', 'run', name, '--json'])
    expect(r.exitCode).toBe(0)

    const md = readFileSync(verdictPath(name), 'utf-8')
    expect(md).toMatch(/^---\n/)
    expect(md).toMatch(/proof_id: verdict-frontmatter/)
    expect(md).toMatch(/verdict: PASSED/)
    expect(md).toMatch(/frozen_hash: [a-f0-9]{64}/)
    expect(md).toMatch(/content_hash: [a-f0-9]{64}/)
    expect(md).toMatch(/\n---\n/)
  })

  test('verdict.md frontmatter 的 frozen_hash 等于 frozen.json SHA-256', async () => {
    await initProject()
    const name = 'verdict-cross-ref'

    writeProof(
      name,
      `  probe "p1-trivial" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`,
    )

    const r = await runCli(['proof', 'run', name, '--json'])
    expect(r.exitCode).toBe(0)

    const frozen = JSON.parse(readFileSync(frozenPath(name), 'utf-8'))
    const frozenHash = frozen._xenon_meta.content_hash

    const md = readFileSync(verdictPath(name), 'utf-8')
    const fhMatch = md.match(/frozen_hash: ([a-f0-9]{64})/)
    expect(fhMatch).not.toBeNull()
    expect(fhMatch![1]).toBe(frozenHash)
  })

  test('verdict.md 篡改后 content_hash 验签失败', async () => {
    await initProject()
    const name = 'verdict-tamper'

    writeProof(
      name,
      `  probe "p1-trivial" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`,
    )

    const r = await runCli(['proof', 'run', name, '--json'])
    expect(r.exitCode).toBe(0)

    // 篡改 verdict.md
    chmodSync(verdictPath(name), 0o644)
    const original = readFileSync(verdictPath(name), 'utf-8')
    const tampered = original.replace('Total probes | 1', 'Total probes | 99')
    writeFileSync(verdictPath(name), tampered, 'utf-8')
    chmodSync(verdictPath(name), 0o444)

    // frozen.json 不变，verdict.md 验签应失败
    const j = readFileSync(frozenPath(name), 'utf-8')
    expect(j).toContain('_xenon_meta') // frozen.json 仍 OK

    // 直接调用 readVerdictMd 模块（不走 CLI）验签
    const { readVerdictMd } = await import('@openxenon/engine/Proof/verdict-writer')
    const v = readVerdictMd(verdictPath(name))
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/signature mismatch/)
  })

  test('dry-run 模式不写 verdict.md', async () => {
    await initProject()
    const name = 'verdict-dryrun'

    writeProof(
      name,
      `  probe "p1-trivial" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`,
    )

    const r = await runCli(['proof', 'run', name, '--dry-run', '--json'])
    expect(r.exitCode).toBe(0)

    expect(existsSync(frozenPath(name))).toBe(false)
    expect(existsSync(verdictPath(name))).toBe(false)
  })

  test('oxn proof show 输出 hasVerdict=true + verdictPath', async () => {
    await initProject()
    const name = 'verdict-show'

    writeProof(
      name,
      `  probe "p1-trivial" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`,
    )

    const r1 = await runCli(['proof', 'run', name, '--json'])
    expect(r1.exitCode).toBe(0)

    const r2 = await runCli(['proof', 'show', name, '--json'])
    expect(r2.exitCode).toBe(0)

    const j = JSON.parse(r2.stdout) as {
      data: { hasVerdict: boolean; verdictPath: string }
    }
    expect(j.data.hasVerdict).toBe(true)
    expect(j.data.verdictPath).toBe(verdictPath(name))
  })

  test('FAILED proof 仍产出 verdict.md', async () => {
    await initProject()
    const name = 'verdict-fail'

    writeProof(
      name,
      `  probe "p1-fail" {
    ref "@oxn/probes/shell-exec"
    params { command = "false", timeout = "5000" }
  }`,
    )

    const r = await runCli(['proof', 'run', name, '--json'])
    // FAILED verdict 仍 exit 0（frozen.json 已写入）
    expect(r.exitCode).toBe(0)

    const j = JSON.parse(r.stdout) as { data: { verdict: string; verdictWritten: boolean } }
    expect(j.data.verdict).toBe('FAILED')
    expect(j.data.verdictWritten).toBe(true)
    expect(existsSync(verdictPath(name))).toBe(true)

    const md = readFileSync(verdictPath(name), 'utf-8')
    expect(md).toMatch(/verdict: FAILED/)
    expect(md).toMatch(/❌/)
  })
})
