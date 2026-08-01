// =============================================================================
// boundary-guard.test.ts — RFC-0015 D6.1 一等公民 probe 验证
//
// 5 case: 全 resolve / 1 个 fail refs / 空 works 目录 / 缺 ## Boundaries 段 / 多 work.md
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeBoundaryGuard, type ProbeContext } from '../boundary-guard'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-boundary-guard-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

const validBlueprint = 'oxn-blueprint'
const validDomain = 'oxn-engine-domain'

function makeWork(
  name: string,
  tasks: Array<{ name: string; blueprint: string; domain: string; boundary?: string; deps?: string[] }>,
): void {
  const tasksMd = tasks
    .map((t) => {
      const deps = t.deps && t.deps.length > 0 ? `\n- deps: [${t.deps.join(', ')}]` : ''
      return `### ${t.name}
- blueprint: ${t.blueprint}
- domain: ${t.domain}
- boundary: ${t.boundary ?? 'dev'}${deps}
`
    })
    .join('\n')
  const content = `---\nentity: work\nversion: 0.3.0\nname: ${name}\n---\n\n# Work: ${name}\n\n## Tasks\n\n${tasksMd}\n`
  mkdirSync(join(tmpDir, '.openxenon/works', name), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon/works', name, 'work.md'), content)
}

function makeProject(opts: { withBlueprints?: string[]; withDomains?: string[] } = {}): void {
  // 创建 builtin blueprints 目录 (用于 listBuiltinBlueprints 解析)
  mkdirSync(join(tmpDir, '.openxenon/assets/blueprints'), { recursive: true })
  for (const bp of opts.withBlueprints ?? []) {
    writeFileSync(join(tmpDir, `.openxenon/assets/blueprints/${bp}.md`), '# stub')
  }
  // 创建 builtin domains 目录
  mkdirSync(join(tmpDir, '.openxenon/assets/domains'), { recursive: true })
  for (const dom of opts.withDomains ?? []) {
    writeFileSync(join(tmpDir, `.openxenon/assets/domains/${dom}.md`), '# stub')
  }
}

describe('boundary-guard (RFC-0015 D6.1)', () => {
  test('case 1: 全部 boundary refs resolve → passed=true', async () => {
    makeProject()
    makeWork('w1', [{ name: 'task-a', blueprint: validBlueprint, domain: validDomain }])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.workCount).toBe(1)
    expect(r.taskCount).toBe(1)
    expect(r.failedRefs).toEqual([])
  })

  test('case 2: 1 个 task refs 不存在的 blueprint → failedRefs 含之, passed=false', async () => {
    makeProject()
    makeWork('w1', [
      { name: 'task-a', blueprint: validBlueprint, domain: validDomain },
      { name: 'task-b', blueprint: 'nonexistent-blueprint', domain: validDomain },
    ])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.failedRefs.length).toBeGreaterThanOrEqual(1)
    const bpFail = r.failedRefs.find((f) => f.field === 'blueprint' && f.value === 'nonexistent-blueprint')
    expect(bpFail).toBeDefined()
    expect(bpFail?.task).toBe('task-b')
  })

  test('case 3: 空 works 目录 → passed=true (no work to check)', async () => {
    makeProject()
    mkdirSync(join(tmpDir, '.openxenon/works'), { recursive: true })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.workCount).toBe(0)
  })

  test('case 4: work.md 缺 ## Tasks 段 → passed=true (no task to check)', async () => {
    makeProject()
    const dir = join(tmpDir, '.openxenon/works/w1')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'work.md'),
      '---\nentity: work\nversion: 0.3.0\nname: w1\n---\n\n# Work: w1\n\n## Context\n\n(no tasks section)\n',
    )
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.taskCount).toBe(0)
  })

  test('case 5: 多 work.md (2 个) 都验证通过 → passed=true', async () => {
    makeProject()
    makeWork('w1', [{ name: 'a', blueprint: validBlueprint, domain: validDomain }])
    makeWork('w2', [
      { name: 'b', blueprint: validBlueprint, domain: validDomain },
      { name: 'c', blueprint: validBlueprint, domain: validDomain },
    ])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.workCount).toBe(2)
    expect(r.taskCount).toBe(3)
  })

  test('case 6: deps[] 引用不存在的 task name → failedRefs 含之', async () => {
    makeProject()
    makeWork('w1', [{ name: 'task-a', blueprint: validBlueprint, domain: validDomain, deps: ['nonexistent-task'] }])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(false)
    const depFail = r.failedRefs.find((f) => f.field === 'dep' && f.value === 'nonexistent-task')
    expect(depFail).toBeDefined()
  })

  test('case 7: 缺 boundary 字段 → failedRefs 含之', async () => {
    makeProject()
    // boundary 空字符串 (work-validator 不允许)
    makeWork('w1', [{ name: 'task-a', blueprint: validBlueprint, domain: validDomain, boundary: '' }])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(false)
    const bf = r.failedRefs.find((f) => f.field === 'boundary')
    expect(bf).toBeDefined()
  })

  test('case 8: domain ref builtin oxn-engine-domain (无 .openxenon/assets/domains 副本) → resolve', async () => {
    makeProject({ withDomains: [] }) // 不创建 .md
    makeWork('w1', [{ name: 'task-a', blueprint: validBlueprint, domain: 'oxn-engine-domain' }])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeBoundaryGuard({}, ctx)
    expect(r.passed).toBe(true) // builtin 默认集合含 oxn-engine-domain
  })
})
