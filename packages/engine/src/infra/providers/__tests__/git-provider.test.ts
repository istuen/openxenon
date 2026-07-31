// =============================================================================
// GitProvider tests (RFC-0015 D2.3)
//
// ADR-0086 §D2 trust-baseline 12-flag 接线契约验证（git 子集）：
//   - detached_head: executeGitStatusClean stdout 含 'HEAD detached' 或 'detached'
//   - shallow_clone: .git/shallow 文件存在
//   - unknown: catch-all (其他异常路径；本次用非 git 目录模拟)
//
// 参考 file-provider.test.ts 范式:
//   - mkdtemp tmpDir 模式
//   - beforeEach 初始化 git repo
//   - 5 case: 正常 repo / detached HEAD / shallow clone / unknown / 边界
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { GitProvider } from '../git-provider'

// ───────── Setup ─────────

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-git-provider-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

/** Safe exec — return null if non-zero exit (don't throw) */
function gitExec(args: string[], cwd: string): string | null {
  try {
    return execFileSync('git', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] }).toString()
  } catch {
    return null
  }
}

/** Init a minimal git repo with 1 commit on main branch */
function initGitRepoWithCommit(): string {
  execFileSync('git', ['init', '-q'], { cwd: tmpDir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir })
  writeFileSync(join(tmpDir, 'README.md'), '# test')
  execFileSync('git', ['add', '.'], { cwd: tmpDir })
  execFileSync('git', ['commit', '-q', '-m', 'initial'], { cwd: tmpDir })
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: tmpDir }).toString().trim()
}

/** Detect detached HEAD without throwing (git symbolic-ref exits 1 on detached) */
function isDetachedHead(): boolean {
  const out = gitExec(['symbolic-ref', '-q', 'HEAD'], tmpDir)
  return out === null || out.trim() === ''
}

describe('GitProvider', () => {
  const makeProvider = (projectRoot: string) => new GitProvider({ projectRoot })

  test('case 1: 普通 git repo (on refs/heads/main) → flags: []', async () => {
    initGitRepoWithCommit()
    const provider = makeProvider(tmpDir)
    const r = await provider.ioStat({ path: 'git://' })
    expect(r.result.exists).toBe(true)
    expect(isDetachedHead()).toBe(false)
    // 普通分支 + 无 .git/shallow → flags: []
    expect(r.interference.flags).not.toContain('detached_head')
    expect(r.interference.flags).not.toContain('shallow_clone')
  })

  test('case 2: detached HEAD → flags 包含 detached_head', async () => {
    const sha = initGitRepoWithCommit()
    // checkout SHA directly → detached HEAD (symbolic-ref HEAD exits 1)
    execFileSync('git', ['checkout', '-q', sha], { cwd: tmpDir })
    expect(isDetachedHead()).toBe(true)

    const provider = makeProvider(tmpDir)
    const r = await provider.ioStat({ path: 'git://' })
    expect(r.interference.flags).toContain('detached_head')
  })

  test('case 3: shallow clone (.git/shallow 存在 + SHA 有效) → flags 包含 shallow_clone', async () => {
    const sha = initGitRepoWithCommit()
    // 写入合法 shallow 行 (现存 commit SHA 即可)
    writeFileSync(join(tmpDir, '.git', 'shallow'), `${sha}\n`)
    expect(existsSync(join(tmpDir, '.git', 'shallow'))).toBe(true)

    const provider = makeProvider(tmpDir)
    const r = await provider.ioStat({ path: 'git://' })
    expect(r.interference.flags).toContain('shallow_clone')
  })

  test('case 4: 非 git 目录（git 命令失败） → flags: [unknown]', async () => {
    // tmpDir is empty, no .git → git status fails → executeGitStatusClean returns ok=false
    const provider = makeProvider(tmpDir)
    const r = await provider.ioStat({ path: 'git://' })
    expect(r.result.exists).toBe(false)
    expect(r.interference.flags).toEqual(['unknown'])
  })

  test('case 5: ioRead 查询分支 (git://<branch>) 返 text 字段', async () => {
    initGitRepoWithCommit()
    const provider = makeProvider(tmpDir)
    // 默认分支 — 用 git symbolic-ref HEAD 找出 (init 后 HEAD 通常指向 refs/heads/main 或 master)
    const head = gitExec(['symbolic-ref', '--short', 'HEAD'], tmpDir)?.trim() ?? 'main'
    const r = await provider.ioRead({ path: `git://${head}` })
    expect(['true', 'false']).toContain(r.result.text)
    // 正常分支查询 → flags: []
    expect(r.interference.flags).toEqual([])
  })

  test('case 6: ioExec 合并可行性（合法 work:target） → 返 exitCode', async () => {
    initGitRepoWithCommit()
    execFileSync('git', ['checkout', '-q', '-b', 'feature'], { cwd: tmpDir })
    writeFileSync(join(tmpDir, 'feature.md'), 'x')
    execFileSync('git', ['add', '.'], { cwd: tmpDir })
    execFileSync('git', ['commit', '-q', '-m', 'feat'], { cwd: tmpDir })

    const head = gitExec(['symbolic-ref', '--short', 'HEAD'], tmpDir) ?? ''
    const baseBranch = gitExec(['branch', '--list', 'main'], tmpDir)?.includes('main') ? 'main' : 'master'

    const provider = makeProvider(tmpDir)
    const r = await provider.ioExec({ command: `feature:${baseBranch}` })
    expect([0, 1]).toContain(r.result.exitCode)
    // 不带 detached/shallow 干扰 → flags: []
    expect(r.interference.flags).toEqual([])
    // 防止 lint 抱怨 head 未用
    expect(head).toBeTruthy()
  })
})
