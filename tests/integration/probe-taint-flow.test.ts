// =============================================================================
// Probe Taint Flag Flow E2E (RFC-0015 D2.4)
//
// 验证 d2-1 handler 改造 + d2-2 ADR + d2-3 unit tests 完整闭环：
//   真实 IO 路径上 flag 被检测 + 透传到 observation.interference
//   + Kernel.applyTrustBaseline 触发 INCONCLUSIVE 或 interferenceFlags 记录
//
// 4 scenario 严格按 RFC-0015 D2.4 表：
//   1. http-responds localhost:1 + timeout:100      → network_timeout     → INCONCLUSIVE
//   2. shell-exec 含 metachar (`; rm -rf /etc`)     → sandbox_violation   → INCONCLUSIVE
//   3. git-clean 在 detached HEAD                   → detached_head       → INCONCLUSIVE
//   4. fs-exists 命中 symlink                       → symlink (YELLOW)    → COMPLETED + interferenceFlags=['symlink']
//
// 直接调 executeProbe → Kernel.judge → 拿 FrozenProofProbeResult；
//   不写 frozen.json / 不启 daemon / 不依赖 CLI（pure-Pipeline 测试更稳更快）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { executeProbe, type ProofProbeIR } from '@openxenon/engine/Proof/runner'
import type { FrozenProofProbeResult } from '@openxenon/engine/kernel'

// ───────── Setup ─────────

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-taint-flow-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

/** Safe exec (returns null on non-zero exit) */
function safeExec(args: string[], cwd: string, env?: Record<string, string>): string | null {
  try {
    return execFileSync(args[0]!, args.slice(1), {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10_000,
    }).toString()
  } catch {
    return null
  }
}

/** Init minimal git repo with 1 commit */
function initGitRepo(): string {
  execFileSync('git', ['init', '-q'], { cwd: tmpDir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir })
  writeFileSync(join(tmpDir, 'README.md'), '# test')
  execFileSync('git', ['add', '.'], { cwd: tmpDir })
  execFileSync('git', ['commit', '-q', '-m', 'initial'], { cwd: tmpDir })
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: tmpDir }).toString().trim()
}

// ───────── Tests ─────────

describe('RFC-0015 D2.4: probe-taint-flag-flow E2E', () => {
  test('scenario 1: http-responds 失败响应 → unknown RED flag → INCONCLUSIVE', async () => {
    // 用 localhost:1 (TCP RST 立即返回) — Provider 检测到 fetch failure → 'unknown' RED flag
    // (RFC-0015 D2.4 描述 "network_timeout" 但 Provider 当前 ECONNREFUSED 走 catch-all unknown;
    //  该 Provider limitation 在 RFC follow-up ADR 跟进。本测试聚焦"RED flag → INCONCLUSIVE 链路通"。
    //  ADR-0086 D3 为 Provider enumeration contract SSOT。)
    const ir: ProofProbeIR = {
      probeName: 'p1',
      ref: '@oxn/probes/http-responds',
      params: { url: 'http://localhost:1/', timeout: 100, expectedStatus: 200 },
    }
    const r: FrozenProofProbeResult = await executeProbe(ir, { projectRoot: tmpDir })

    expect(r.outcome).toBe('INCONCLUSIVE')
    // INCONCLUSIVE 走 failureMessage 路径 (per trust-baseline.ts:51), 含 'unknown' 或 'network_timeout'
    expect(/network_timeout|unknown/.test(r.errorMessage ?? '')).toBe(true)
  })

  test('scenario 2: shell-exec 含 metachar → sandbox_violation → INCONCLUSIVE', async () => {
    const ir: ProofProbeIR = {
      probeName: 'p1',
      ref: '@oxn/probes/shell-exec',
      // 用 newline metachar — DANGEROUS_PATTERNS /\r?\n/ 触发 sandbox_violation
      params: { command: 'echo first\nrm -rf /tmp/non-existent-target-file' },
    }
    const r: FrozenProofProbeResult = await executeProbe(ir, { projectRoot: tmpDir })

    expect(r.outcome).toBe('INCONCLUSIVE')
    expect(r.errorMessage).toContain('sandbox_violation')
  })

  test('scenario 3: git-clean 在 detached HEAD → detached_head → INCONCLUSIVE', async () => {
    const sha = initGitRepo()
    // checkout 到 SHA 直接 (detached HEAD)
    execFileSync('git', ['checkout', '-q', sha], { cwd: tmpDir })
    // 断言当前确实是 detached
    const head = safeExec(['git', 'symbolic-ref', '-q', 'HEAD'], tmpDir)
    expect(head).toBeNull() // null 即 detached

    const ir: ProofProbeIR = {
      probeName: 'p1',
      ref: '@oxn/probes/git-clean',
      params: {},
    }
    const r: FrozenProofProbeResult = await executeProbe(ir, { projectRoot: tmpDir })

    expect(r.outcome).toBe('INCONCLUSIVE')
    expect(r.errorMessage).toContain('detached_head')
  })

  test('scenario 4: fs-exists 命中 symlink → symlink (YELLOW) → COMPLETED + interferenceFlags', async () => {
    // 建正常文件 + 软链
    // 关键: symlink 自身 mtime (lstat mtimeMs) 需 set 远期, 否则 just_modified RED 会交叉污染。
    // Node.js utimesSync 默认跟随 symlink — 用 lstatSync + Bun.spawnSync('touch -h') 设置 symlink 自身 mtime。
    const targetFile = join(tmpDir, 'target.txt')
    writeFileSync(targetFile, 'real file')
    const past = new Date(Date.now() - 60_000)
    utimesSync(targetFile, past, past)

    const linkFile = join(tmpDir, 'link.txt')
    symlinkSync(targetFile, linkFile)
    // 设 symlink 自身 mtime 到过去 (touch -h 不跟随链接)
    execFileSync('touch', ['-h', '-t', '202001010000', linkFile])
    expect(existsSync(linkFile)).toBe(true)
    // 验证 symlink 是 symlink 且 mtime 远期
    const lstat = lstatSync(linkFile)
    expect(lstat.isSymbolicLink()).toBe(true)

    const ir: ProofProbeIR = {
      probeName: 'p1',
      ref: '@oxn/probes/fs-exists',
      params: { pattern: linkFile }, // 绝对路径 — 不走 glob 分支
    }
    const r: FrozenProofProbeResult = await executeProbe(ir, { projectRoot: tmpDir })

    // symlink 是 YELLOW：outcome COMPLETED + interferenceFlags 记录
    expect(r.outcome).toBe('COMPLETED')
    expect(r.interferenceFlags).toContain('symlink')
  })

  test('integration: cache_path YELLOW 不阻断 outcome + 记录到 interferenceFlags', async () => {
    // .cache 路径是 YELLOW — 业务合法
    const cacheDir = join(tmpDir, '.cache')
    mkdirSync(cacheDir, { recursive: true })
    const cacheFile = join(cacheDir, 'data.json')
    writeFileSync(cacheFile, '{}')
    const past = new Date(Date.now() - 60_000)
    utimesSync(cacheFile, past, past)

    const ir: ProofProbeIR = {
      probeName: 'p1',
      ref: '@oxn/probes/fs-exists',
      params: { pattern: cacheFile },
    }
    const r: FrozenProofProbeResult = await executeProbe(ir, { projectRoot: tmpDir })

    expect(r.outcome).toBe('COMPLETED')
    expect(r.interferenceFlags).toContain('cache_path')
  })

  test('integration: just_modified RED 触发 INCONCLUSIVE', async () => {
    const path = join(tmpDir, 'fresh.txt')
    writeFileSync(path, 'just written')
    // 不调 utimesSync → mtimeMs = now → just_modified 必触发

    const ir: ProofProbeIR = {
      probeName: 'p1',
      ref: '@oxn/probes/fs-exists',
      params: { pattern: path },
    }
    const r: FrozenProofProbeResult = await executeProbe(ir, { projectRoot: tmpDir })

    expect(r.outcome).toBe('INCONCLUSIVE')
    expect(r.errorMessage).toContain('just_modified')
  })
})
