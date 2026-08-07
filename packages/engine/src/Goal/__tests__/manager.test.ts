import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createGoal, listGoals, showGoal, createWorkFromGoal, archiveGoal } from '../manager'

let tmpDir: string

function setup(): void {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-goal-mgr-'))
  const poolDir = join(tmpDir, 'dev', 'pool')
  require('node:fs').mkdirSync(poolDir, { recursive: true })
  writeFileSync(join(poolDir, 'README.md'), '# pool readme')
}

function teardown(): void {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
}

describe('createGoal', () => {
  beforeEach(setup)
  afterEach(teardown)

  test('1. 创建 Goal 落 dev/pool/<slug>.md + 完整 frontmatter', () => {
    const r = createGoal({
      projectRoot: tmpDir,
      slug: 'demo-goal',
      theme: 'Goal demo',
      priority: 'high',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.slug).toBe('demo-goal')
    expect(r.branch).toBe('feat/goal-demo-goal')
    const filePath = join(tmpDir, 'dev', 'pool', 'demo-goal.md')
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, 'utf-8')
    expect(content).toContain('id: demo-goal')
    expect(content).toContain('theme: Goal demo')
    expect(content).toContain('priority: high')
    expect(content).toContain('status: planned')
    expect(content).toContain('branch: feat/goal-demo-goal')
    expect(content).toContain('source: direct')
  })

  test('2. bad slug → OXN_GOAL_SLUG_INVALID', () => {
    const r = createGoal({ projectRoot: tmpDir, slug: 'Bad_Slug!', theme: 't' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_GOAL_SLUG_INVALID')
  })

  test('3. 重复 slug → OXN_GOAL_EXISTS', () => {
    createGoal({ projectRoot: tmpDir, slug: 'dup', theme: 't' })
    const r = createGoal({ projectRoot: tmpDir, slug: 'dup', theme: 't2' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_GOAL_EXISTS')
  })
})

describe('listGoals', () => {
  beforeEach(setup)
  afterEach(teardown)

  test('4. 列出所有 Goal（按 priority 排序）', () => {
    createGoal({ projectRoot: tmpDir, slug: 'medium-one', theme: 'M', priority: 'medium' })
    createGoal({ projectRoot: tmpDir, slug: 'critical-one', theme: 'C', priority: 'critical' })
    createGoal({ projectRoot: tmpDir, slug: 'high-one', theme: 'H', priority: 'high' })

    const r = listGoals({ projectRoot: tmpDir })
    expect(r.ok).toBe(true)
    expect(r.goals.map((g) => g.slug)).toEqual(['critical-one', 'high-one', 'medium-one'])
  })

  test('5. 空 pool → goals: []', () => {
    const r = listGoals({ projectRoot: tmpDir })
    expect(r.ok).toBe(true)
    expect(r.goals).toEqual([])
    expect(r.total).toBe(0)
  })

  test('6. README.md 跳过', () => {
    const r = listGoals({ projectRoot: tmpDir })
    expect(r.goals.find((g) => g.slug === 'README')).toBeUndefined()
  })
})

describe('showGoal', () => {
  beforeEach(setup)
  afterEach(teardown)

  test('7. 显示完整 Goal content + body', () => {
    createGoal({ projectRoot: tmpDir, slug: 'show-me', theme: 'Show Me' })
    const r = showGoal({ projectRoot: tmpDir, slug: 'show-me' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.goal.slug).toBe('show-me')
    expect(r.goal.theme).toBe('Show Me')
    expect(r.body).toContain('# Goal: Show Me')
  })

  test('8. 不存在 → OXN_GOAL_NOT_FOUND', () => {
    const r = showGoal({ projectRoot: tmpDir, slug: 'nope' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_GOAL_NOT_FOUND')
  })
})

describe('createWorkFromGoal (D5+ stub)', () => {
  beforeEach(setup)
  afterEach(teardown)

  test('9. 返回建议 Work frontmatter，不创建', () => {
    const r = createWorkFromGoal({ projectRoot: tmpDir, slug: 'tbd' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.slug).toBe('tbd')
    expect(r.proposedWorkId).toBe('tbd-work')
    expect(r.proposedWorkPath).toContain('.openxenon/works/')
    expect(r.note).toContain('D5+ stub')
  })
})

describe('archiveGoal', () => {
  beforeEach(setup)
  afterEach(teardown)

  test('10. archive 移到 .archived/dev/pool/<slug>.md', () => {
    createGoal({ projectRoot: tmpDir, slug: 'to-arch', theme: 'T' })
    const r = archiveGoal({ projectRoot: tmpDir, slug: 'to-arch' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const archivePath = join(tmpDir, '.openxenon', '.archived', 'dev', 'pool', 'to-arch.md')
    expect(existsSync(archivePath)).toBe(true)
    expect(existsSync(join(tmpDir, 'dev', 'pool', 'to-arch.md'))).toBe(false)
  })
})
