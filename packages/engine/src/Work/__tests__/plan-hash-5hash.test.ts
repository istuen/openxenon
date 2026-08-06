// =============================================================================
// plan-hash-5hash.test.ts — v0.7+ PlanLock 5-hash 扩展单元测试
//
// 来源：design-blueprint-context-template Draft（2026-08-06 grilling）
//       oxn-work-domain inv-32/33/34
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { hashWorkPlan, listTaskContextFiles, probePlanPresence } from '../plan-hash'

let tmpDir: string
let workName: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `plan-hash-5hash-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  workName = 'test-work'
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('hashWorkPlan 5-hash 扩展', () => {
  test('workContextHash 计算 works/<w>/context.md', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'context.md'), 'work context content')
    const r = hashWorkPlan(tmpDir, workName)
    expect(r.workContextHash).not.toBe(null)
    expect(r.workContextHash).toMatch(/^[0-9a-f]{64}$/)
  })

  test('taskContextsHash 计算 tasks/*/context.md 组合', () => {
    const taskA = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a')
    mkdirSync(taskA, { recursive: true })
    writeFileSync(join(taskA, 'task.md'), 'A')
    writeFileSync(join(taskA, 'context.md'), 'A context')

    const taskB = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'b')
    mkdirSync(taskB, { recursive: true })
    writeFileSync(join(taskB, 'task.md'), 'B')
    writeFileSync(join(taskB, 'context.md'), 'B context')

    const r = hashWorkPlan(tmpDir, workName)
    expect(r.taskContextsHash).not.toBe(null)
    expect(r.taskContextsHash).toMatch(/^[0-9a-f]{64}$/)
  })

  test('workContextHash + taskContextsHash 与原 3-hash 解耦', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.md'), 'work')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'context.md'), 'context')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'blueprints.json'), '{}')

    const taskA = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a')
    mkdirSync(taskA, { recursive: true })
    writeFileSync(join(taskA, 'task.md'), 'task a')
    writeFileSync(join(taskA, 'context.md'), 'task a context')

    const r1 = hashWorkPlan(tmpDir, workName)

    // 改 task context.md → taskContextsHash 变；workContextHash 不变
    writeFileSync(join(taskA, 'context.md'), 'task a context modified')
    const r2 = hashWorkPlan(tmpDir, workName)

    expect(r1.workContextHash).toBe(r2.workContextHash)
    expect(r1.taskContextsHash).not.toBe(r2.taskContextsHash)
    expect(r1.allHash).not.toBe(r2.allHash)
  })

  test('missing 数组包含 context.md 与 tasks/<t>/context.md', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.md'), 'work')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'blueprints.json'), '{}')
    const r = hashWorkPlan(tmpDir, workName)
    expect(r.missing).toContain('context.md')
  })

  test('全 5 组件存在 → missing=[] 且 allHash 不为 null', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.md'), 'work')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'context.md'), 'context')
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'blueprints.json'), '{}')

    const taskA = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a')
    mkdirSync(taskA, { recursive: true })
    writeFileSync(join(taskA, 'task.md'), 'task a')
    writeFileSync(join(taskA, 'context.md'), 'task a context')

    const r = hashWorkPlan(tmpDir, workName)
    expect(r.missing).toEqual([])
    expect(r.allHash).not.toBe(null)
  })
})

describe('listTaskContextFiles', () => {
  test('列出 tasks/<t>/context.md（跳过无 context.md 的目录）', () => {
    const taskA = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a')
    mkdirSync(taskA, { recursive: true })
    writeFileSync(join(taskA, 'task.md'), 'A')
    writeFileSync(join(taskA, 'context.md'), 'A context')

    const taskB = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'b')
    mkdirSync(taskB, { recursive: true })
    writeFileSync(join(taskB, 'task.md'), 'B') // 没有 context.md

    const r = listTaskContextFiles(tmpDir, workName)
    expect(r).toHaveLength(1)
    expect(r[0]?.taskName).toBe('a')
  })

  test('按 task 名排序', () => {
    for (const name of ['z', 'a', 'm']) {
      const dir = join(tmpDir, '.openxenon', 'works', workName, 'tasks', name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'context.md'), name)
    }
    const r = listTaskContextFiles(tmpDir, workName)
    expect(r.map((t) => t.taskName)).toEqual(['a', 'm', 'z'])
  })
})

describe('probePlanPresence (5-hash 扩展)', () => {
  test('workContext + taskContext 字段存在', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'context.md'), 'context')

    const taskA = join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'a')
    mkdirSync(taskA, { recursive: true })
    writeFileSync(join(taskA, 'task.md'), 'A')
    writeFileSync(join(taskA, 'context.md'), 'A context')

    const r = probePlanPresence(tmpDir, workName)
    expect(r.workContext).toBe(true)
    expect(r.tasks).toEqual([{ taskName: 'a', hasMd: true, hasContextMd: true }])
  })
})
