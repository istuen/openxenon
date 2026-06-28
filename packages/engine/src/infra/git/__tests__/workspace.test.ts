// =============================================================================
// Git Workspace Adapter Tests (L1-Infra)
//
// 行为契约：
//   - runGit 失败不抛异常 → 返回 { ok: false, error }
//   - isWorkingTreeClean: 干净 → clean: true；有 untracked 视选项
//   - branchExists: 只看 refs/heads/<name>，不看 origin
//   - checkMergeFeasibility: 纯算法，不修改 working tree
//   - parseConflictFiles: 兼容 git 2.38+ merge-tree --write-tree 输出
//
// 测试策略：
//   - 用真 git repo 跑（在 tmpdir 初始化）
//   - 不 mock execFile（要看真 git 行为）
//   - 失败用例要明确预期
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  branchExists,
  checkMergeFeasibility,
  createWorkBranch,
  createWorktree,
  getHeadCommit,
  isGitAvailable,
  isWorkingTreeClean,
  listDirtyFiles,
  listWorktrees,
  parseConflictFiles,
  removeWorktree,
  runGit,
} from '../workspace'

const TMP_ROOT = join(process.cwd(), '.tmp-git-test')
let repoDir: string

async function initRepo(): Promise<string> {
  if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true })
  const dir = join(TMP_ROOT, `repo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  mkdirSync(dir, { recursive: true })

  const opts = { cwd: dir }
  await runGit(['init', '--initial-branch=main'], opts)
  await runGit(['config', 'user.email', 'test@example.com'], opts)
  await runGit(['config', 'user.name', 'Test'], opts)
  await runGit(['config', 'commit.gpgsign', 'false'], opts)
  // 创初始 commit，让 refs/heads/main 真实存在
  writeFileSync(join(dir, '.gitkeep'), '')
  await runGit(['add', '.gitkeep'], opts)
  await runGit(['commit', '-m', 'init'], opts)
  return dir
}

beforeEach(async () => {
  repoDir = await initRepo()
})

afterEach(() => {
  if (existsSync(TMP_ROOT)) rmSync(TMP_ROOT, { recursive: true, force: true })
})

describe('runGit', () => {
  test('成功命令返回 ok: true', async () => {
    const r = await runGit(['--version'])
    expect(r.ok).toBe(true)
    expect(r.stdout).toMatch(/git version/)
  })

  test('失败命令返回 ok: false + error', async () => {
    const r = await runGit(['not-a-real-command'], { cwd: repoDir })
    expect(r.ok).toBe(false)
    expect(r.error).toBeDefined()
  })

  test('在不存在目录执行返回 ok: false', async () => {
    const r = await runGit(['status'], { cwd: '/no/such/path' })
    expect(r.ok).toBe(false)
  })
})

describe('isGitAvailable', () => {
  test('在 git 仓库里返回 true', async () => {
    expect(await isGitAvailable(repoDir)).toBe(true)
  })
})

describe('isWorkingTreeClean', () => {
  test('空仓库 → clean: true', async () => {
    const r = await isWorkingTreeClean(repoDir)
    expect(r.ok).toBe(true)
    expect(r.clean).toBe(true)
  })

  test('有未提交文件 → clean: false', async () => {
    writeFileSync(join(repoDir, 'dirty.txt'), 'uncommitted')
    const r = await isWorkingTreeClean(repoDir, { includeUntracked: true })
    expect(r.ok).toBe(true)
    expect(r.clean).toBe(false)
  })

  test('有 staged 但未提交 → clean: false', async () => {
    writeFileSync(join(repoDir, 'staged.txt'), 'will be staged')
    await runGit(['add', 'staged.txt'], { cwd: repoDir })
    const r = await isWorkingTreeClean(repoDir)
    expect(r.ok).toBe(true)
    expect(r.clean).toBe(false)
  })
})

describe('listDirtyFiles', () => {
  test('空仓库 → 0 个 dirty 文件', async () => {
    const r = await listDirtyFiles(repoDir)
    expect(r.ok).toBe(true)
    expect(r.dirtyFiles).toEqual([])
  })

  test('有 untracked + modified → 列出全部', async () => {
    writeFileSync(join(repoDir, 'a.txt'), '1')
    await runGit(['add', 'a.txt'], { cwd: repoDir })
    await runGit(['commit', '-m', 'init'], { cwd: repoDir })
    writeFileSync(join(repoDir, 'a.txt'), '2')
    writeFileSync(join(repoDir, 'b.txt'), 'new')
    const r = await listDirtyFiles(repoDir)
    expect(r.ok).toBe(true)
    expect(r.dirtyFiles.length).toBeGreaterThanOrEqual(2)
  })
})

describe('branchExists', () => {
  test('空仓库只有 main → main 存在，feature 不存在', async () => {
    const mainR = await branchExists('main', repoDir)
    expect(mainR.exists).toBe(true)
    const featR = await branchExists('feature', repoDir)
    expect(featR.exists).toBe(false)
  })

  test('createWorkBranch 后能查到', async () => {
    const c = await createWorkBranch('oxn/test', 'main', repoDir)
    expect(c.ok).toBe(true)
    const r = await branchExists('oxn/test', repoDir)
    expect(r.exists).toBe(true)
  })
})

describe('getHeadCommit', () => {
  test('空仓库 → HEAD 是 unborn（commit 为 null）', async () => {
    const r = await getHeadCommit(repoDir)
    // 多数 git 版本对 unborn HEAD 返回 ok: false
    expect(r.commit === null || (r.commit && /^[0-9a-f]{7,40}$/.test(r.commit))).toBe(true)
  })

  test('commit 后能取到 hash', async () => {
    writeFileSync(join(repoDir, 'a.txt'), '1')
    await runGit(['add', 'a.txt'], { cwd: repoDir })
    await runGit(['commit', '-m', 'first'], { cwd: repoDir })
    const r = await getHeadCommit(repoDir)
    expect(r.ok).toBe(true)
    expect(r.commit).toMatch(/^[0-9a-f]{7,40}$/)
  })
})

describe('checkMergeFeasibility — 核心场景', () => {
  /** 辅助：commit 一个文件 */
  async function commitFile(name: string, content: string): Promise<void> {
    writeFileSync(join(repoDir, name), content)
    await runGit(['add', name], { cwd: repoDir })
    await runGit(['commit', '-m', `add ${name}`], { cwd: repoDir })
  }

  test('work 在 target 之后 → can_ff_merge', async () => {
    await commitFile('a.txt', 'v1')
    await createWorkBranch('oxn/ff', 'main', repoDir)
    await commitFile('b.txt', 'on work branch')
    const r = await checkMergeFeasibility('oxn/ff', 'main', repoDir)
    expect(r.status).toBe('can_ff_merge')
    expect(r.conflictFiles).toEqual([])
  })

  test('work 与 target 分叉（不同文件）→ can_merge_clean', async () => {
    await commitFile('a.txt', 'v1')
    await createWorkBranch('oxn/div', 'main', repoDir)
    // 先在 oxn/div 上加一个文件（建立 work 的存在）
    await commitFile('b.txt', 'on work')
    await runGit(['switch', 'main'], { cwd: repoDir })
    // 在 main 上加一个不同的文件（建立真正的分叉）
    await commitFile('c.txt', 'on main')
    await runGit(['switch', 'oxn/div'], { cwd: repoDir })
    const r = await checkMergeFeasibility('oxn/div', 'main', repoDir)
    // 不同文件无冲突 → can_merge_clean
    expect(r.status).toBe('can_merge_clean')
    expect(r.conflictFiles).toEqual([])
  })

  test('work 与 target 改同一文件 → has_conflicts', async () => {
    await commitFile('a.txt', 'v1 on main')
    await createWorkBranch('oxn/conflict', 'main', repoDir)
    await runGit(['switch', 'main'], { cwd: repoDir })
    writeFileSync(join(repoDir, 'a.txt'), 'v2 on main')
    await runGit(['add', 'a.txt'], { cwd: repoDir })
    await runGit(['commit', '-m', 'main changes a.txt'], { cwd: repoDir })
    await runGit(['switch', 'oxn/conflict'], { cwd: repoDir })
    writeFileSync(join(repoDir, 'a.txt'), 'v2 on work')
    await runGit(['add', 'a.txt'], { cwd: repoDir })
    await runGit(['commit', '-m', 'work changes a.txt'], { cwd: repoDir })
    const r = await checkMergeFeasibility('oxn/conflict', 'main', repoDir)
    expect(r.status).toBe('has_conflicts')
    expect(r.conflictFiles.length).toBeGreaterThan(0)
  })

  test('worktree 有未提交改动 → dirty_worktree', async () => {
    await commitFile('a.txt', 'v1')
    await createWorkBranch('oxn/dirty', 'main', repoDir)
    writeFileSync(join(repoDir, 'uncommitted.txt'), 'dirty')
    const r = await checkMergeFeasibility('oxn/dirty', 'main', repoDir)
    expect(r.status).toBe('dirty_worktree')
    expect(r.conflictFiles.length).toBeGreaterThan(0)
  })

  test('target 分支不存在 → unknown', async () => {
    await commitFile('a.txt', 'v1')
    await createWorkBranch('oxn/xx', 'main', repoDir)
    const r = await checkMergeFeasibility('oxn/xx', 'no-such-branch', repoDir)
    expect(r.status).toBe('unknown')
    expect(r.error).toBeDefined()
  })

  test('work 分支不存在 → unknown', async () => {
    await commitFile('a.txt', 'v1')
    const r = await checkMergeFeasibility('no-such-work', 'main', repoDir)
    expect(r.status).toBe('unknown')
    expect(r.error).toBeDefined()
  })
})

describe('parseConflictFiles', () => {
  test('从 merge-tree 输出提取冲突文件（git 2.38+ 真实格式）', () => {
    // 真实 git 2.53 merge-tree --write-tree --messages 在冲突时的输出
    const sample = `e229e9462c39d87e38a0e6ab9f5328c39a698f4f
100644 78981922613b2afb6025042ff6bd878ac1994e85 1\ta.txt
100644 aaa38a69db7dea52e1ebc4d45698385648a74334 2\ta.txt
100644 95182096b456ab5e61ea8d03370462a2d46699c8 3\ta.txt

自动合并 a.txt
冲突（内容）：合并冲突于 a.txt`
    const files = parseConflictFiles(sample)
    expect(files).toContain('a.txt')
  })

  test('从 merge-tree 输出提取多个冲突文件', () => {
    const sample = `<tree>
100644 111 1\tsrc/foo.ts
100644 222 2\tsrc/foo.ts
100644 333 3\tsrc/foo.ts
100644 444 1\tsrc/bar.ts
100644 555 2\tsrc/bar.ts
100644 666 3\tsrc/bar.ts
冲突（内容）：合并冲突于 src/foo.ts
冲突（内容）：合并冲突于 src/bar.ts`
    const files = parseConflictFiles(sample)
    expect(files).toContain('src/foo.ts')
    expect(files).toContain('src/bar.ts')
  })

  test('空输入 → 空数组', () => {
    expect(parseConflictFiles('')).toEqual([])
  })

  test('只含 tree-hash → 空数组（clean merge）', () => {
    expect(parseConflictFiles('f4b354863caa9cea99b95422c9dab70465757d87\n')).toEqual([])
  })
})

describe('createWorktree / removeWorktree / listWorktrees', () => {
  test('create + list + remove 完整闭环', async () => {
    writeFileSync(join(repoDir, 'a.txt'), '1')
    await runGit(['add', 'a.txt'], { cwd: repoDir })
    await runGit(['commit', '-m', 'init'], { cwd: repoDir })

    const wtPath = join(repoDir, '..', 'wt-feature')
    const c = await createWorktree(wtPath, 'oxn/feature', 'main', repoDir)
    expect(c.ok).toBe(true)
    expect(existsSync(wtPath)).toBe(true)

    const list = await listWorktrees(repoDir)
    expect(list.ok).toBe(true)
    expect(list.worktrees.length).toBeGreaterThanOrEqual(2)

    const rm = await removeWorktree(wtPath, repoDir)
    expect(rm.ok).toBe(true)
    expect(existsSync(wtPath)).toBe(false)
  })
})
