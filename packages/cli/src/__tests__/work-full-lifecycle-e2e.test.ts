// =============================================================================
// work-full-lifecycle-e2e.test.ts — PR-13 + NV-1/NV-2 守卫
//
// 覆盖完整 work 生命周期（V1 布局）：
//   1. happy path：create → add-task → validate → lock → context → run → status
//   2. lock 后 .work.planLock 含 5 字段（4 组件 hash + allHash）
//   3. context 响应含 lockHealth（status=ok + allHash + components）
//   4. 跑过的工作再次 run → OXN_WORK_ALREADY_EXISTS
//   5. 锁后漂移 work.oxn → 下次 lock/verify 报 LOCK_HASH_MISMATCH
//   6. 锁后删 work.oxn → context/run 报 WORK_REMOVED
//   7. unlock → context 报 LOCK_NOT_FOUND
//   8. --unlock-check 跳过守卫 + lockHealth=bypassed
//   9. allHash 联动：1 改 1 → allHash 也变
//   10-13. NV-1 / NV-2 守卫（合并自原 work-e2e.test.ts）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-lifecycle-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

async function runCli(args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  return { stdout, exitCode }
}

async function initProject(): Promise<void> {
  const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  await init.exited
}

const DOMAIN = `domain "LifecycleDomain" {
  description = "PR-13 full-lifecycle test domain"
  term { "X": "term X" }
  invariant { "i" }
}
`

const BLUEPRINT = `blueprint "LifecycleBP" {
  assetVersion = 1
  slot "alpha" { "observe" = ["fs-match"] }
  slot "beta" { deps = ["alpha"]; observe = ["fs-exists"] }
}
`

function setupProject(): void {
  mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon', 'domains', 'lifecycle-domain.oxn'), DOMAIN)
  writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'lifecycle-bp.oxn'), BLUEPRINT)
}

function setupWork(workName: string, taskNames: string[]): void {
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'works', workName, 'work.oxn'),
    `work "${workName}" {
  context {
    goal = "PR-13 lifecycle test";
    constraints = ["c1"];
    } loop_policy { max_iterations = 4; }
  domain "LifecycleDomain" ref "@prj/domains/lifecycle-domain";
  blueprint "LifecycleBP" ref "@prj/blueprints/lifecycle-bp";
${taskNames.map((t) => `  task "${t}" { blueprint "LifecycleBP" }`).join('\n')}
}
`,
  )
  for (const t of taskNames) {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', t), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', workName, 'tasks', t, 'task.oxn'),
      `task "${t}" {
  part "alpha" { skill_context = "do ${t}" }
}
`,
    )
  }
}

// ───────── happy path：完整 8 阶段链路 ─────────

describe('完整 work 生命周期 V1（PR-13）', () => {
  test('1. happy path：work + tasks 写好 → validate → lock → context → run', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])

    // 直接从 setupWork 状态开始（work.oxn + task.oxn 已写）
    // 阶段 1: validate
    const v = JSON.parse((await runCli(['work', 'validate', 'lifecycle', '--json'])).stdout)
    expect(v.ok).toBe(true)
    expect(v.data.valid).toBe(true)
    expect(v.data.workType).toBeUndefined() // v0.7+：workType 字段已删除
    expect(v.data.mode).toBeUndefined() // v0.7+：mode 字段已删除

    // 🆕 Phase B: 产物文件（domains.json 已删；Domain refs 走 Blueprint ## Refs → blueprints.json 含 domainRefs）
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'lifecycle', 'blueprints.json'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'lifecycle', '.work'))).toBe(true)

    // 阶段 2: lock
    const lk = JSON.parse((await runCli(['work', 'lock', 'lifecycle', '--json'])).stdout)
    expect(lk.ok).toBe(true)
    expect(lk.data.lockedAt).toBeDefined()
    expect(lk.data.planLock.workOxnHash).toMatch(/^[0-9a-f]{64}$/)
    expect(lk.data.planLock.allHash).toMatch(/^[0-9a-f]{64}$/)
    expect(Object.keys(lk.data.planLock).sort()).toEqual(
      // 🆕 Phase B: workDomainsHash 已删（3-component hash: workOxn + blueprints(composite) + tasks + allHash）
      ['allHash', 'blueprintsHash', 'tasksHash', 'workOxnHash'].sort(),
    )

    // 阶段 3: context
    const ctx = JSON.parse((await runCli(['work', 'context', 'lifecycle', '--task', 'a', '--json'])).stdout)
    expect(ctx.ok).toBe(true)
    expect(ctx.data.lockHealth.status).toBe('ok')
    expect(ctx.data.lockHealth.allHash).toMatch(/^[0-9a-f]{64}$/)
    expect(ctx.data.isolationNotice).toContain('不可见')

    // 阶段 4: run
    const run = JSON.parse((await runCli(['work', 'run', 'lifecycle', '--json'])).stdout)
    expect(run.ok).toBe(true)
    expect(run.data.tasks.length).toBe(1)
  })

  test('2. .work.planLock 含 5 字段持久化（PR-13 bug fix）', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])

    await runCli(['work', 'validate', 'lifecycle', '--json'])
    await runCli(['work', 'lock', 'lifecycle', '--json'])

    const workFile = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'lifecycle', '.work'), 'utf-8'))
    expect(workFile.planLock).not.toBe(null)
    expect(Object.keys(workFile.planLock).sort()).toEqual(
      // 🆕 Phase B: workDomainsHash 已删（3-component hash）
      ['allHash', 'blueprintsHash', 'lockedAt', 'tasksHash', 'workOxnHash'].sort(),
    )
    // allHash 64-hex
    expect(workFile.planLock.allHash).toMatch(/^[0-9a-f]{64}$/)
  })

  test('3. allHash 联动：1 改 1 → allHash 也变（PR-13 联动保证）', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    const v1 = JSON.parse((await runCli(['work', 'validate', 'lifecycle', '--json'])).stdout)
    expect(v1.ok).toBe(true)
    const lk1 = JSON.parse((await runCli(['work', 'lock', 'lifecycle', '--json'])).stdout)
    expect(lk1.ok).toBe(true)
    const allHash1 = lk1.data.planLock.allHash
    const workOxnHash1 = lk1.data.planLock.workOxnHash

    // 改 work.oxn（换 goal 让 content 真变；trailing \n 会被 normalizeText 折叠）
    const workPath = join(tmpDir, '.openxenon', 'works', 'lifecycle', 'work.oxn')
    const content = readFileSync(workPath, 'utf-8')
    writeFileSync(workPath, content.replace('"PR-13 lifecycle test"', '"PR-13 lifecycle test CHANGED"'))

    // unlock → validate（重算 assets） → lock（重算 hash）
    await runCli(['work', 'unlock', 'lifecycle', '--json'])
    await runCli(['work', 'validate', 'lifecycle', '--json'])
    const lk2 = JSON.parse((await runCli(['work', 'lock', 'lifecycle', '--json'])).stdout)
    expect(lk2.ok).toBe(true)
    const allHash2 = lk2.data.planLock.allHash
    const workOxnHash2 = lk2.data.planLock.workOxnHash

    // workOxnHash 必须变（work.oxn 改了）
    expect(workOxnHash2).not.toBe(workOxnHash1)
    // allHash 必须联动变
    expect(allHash2).not.toBe(allHash1)
  })

  test('4. 跑过的工作再次 run → 允许 re-run（v0.6.1-alpha.5 Phase A.1 修复）', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    await runCli(['work', 'validate', 'lifecycle', '--json'])
    await runCli(['work', 'lock', 'lifecycle', '--json'])
    const r1 = JSON.parse((await runCli(['work', 'run', 'lifecycle', '--json'])).stdout)
    expect(r1.ok).toBe(true)

    // 再次 run 应允许（Phase A.1: 修复了 Round 2+ re-run 报错的问题）
    // 仅当 state.status ∈ {passed, failed, error}（已收口）时才报 OXN_WORK_ALREADY_FINALIZED
    const r2 = JSON.parse((await runCli(['work', 'run', 'lifecycle', '--json'])).stdout)
    expect(r2.ok).toBe(true) // ✅ Phase A.1 修复：re-run 允许
  })

  test('5. 锁后漂移 work.oxn → context 报 LOCK_HASH_MISMATCH', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    await runCli(['work', 'validate', 'lifecycle', '--json'])
    await runCli(['work', 'lock', 'lifecycle', '--json'])

    // 漂移 work.oxn
    const workPath = join(tmpDir, '.openxenon', 'works', 'lifecycle', 'work.oxn')
    writeFileSync(
      workPath,
      'work "lifecycle" {\n  context { goal = "CHANGED"; constraints = ["c1"]; }\n  loop_policy { max_iterations = 4; }\n  domain "LifecycleDomain" ref "@prj/domains/lifecycle-domain";\n  blueprint "LifecycleBP" ref "@prj/blueprints/lifecycle-bp";\n  task "a" {\n    domain "LifecycleDomain"\n    blueprint "LifecycleBP"\n  }\n}\n',
    )

    // context 应报 HASH_MISMATCH
    const ctx = JSON.parse((await runCli(['work', 'context', 'lifecycle', '--task', 'a', '--json'])).stdout)
    expect(ctx.ok).toBe(false)
    expect(ctx.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(ctx.error.context.component).toBe('workOxn')
  })

  test('6. 锁后删 work.oxn → context 报 WORK_REMOVED', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    await runCli(['work', 'validate', 'lifecycle', '--json'])
    await runCli(['work', 'lock', 'lifecycle', '--json'])

    // 删 work.oxn
    rmSync(join(tmpDir, '.openxenon', 'works', 'lifecycle', 'work.oxn'))

    // context 应报 WORK_REMOVED
    const ctx = JSON.parse((await runCli(['work', 'context', 'lifecycle', '--task', 'a', '--json'])).stdout)
    expect(ctx.ok).toBe(false)
    expect(ctx.error.code).toBe('OXN_ALIGN_WORK_REMOVED')
  })

  test('7. unlock → context 报 LOCK_NOT_FOUND', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    await runCli(['work', 'validate', 'lifecycle', '--json'])
    await runCli(['work', 'lock', 'lifecycle', '--json'])
    const unl = JSON.parse((await runCli(['work', 'unlock', 'lifecycle', '--json'])).stdout)
    expect(unl.ok).toBe(true)

    const ctx = JSON.parse((await runCli(['work', 'context', 'lifecycle', '--task', 'a', '--json'])).stdout)
    expect(ctx.ok).toBe(false)
    expect(ctx.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
  })

  test('8. --unlock-check 跳过守卫 + lockHealth=bypassed', async () => {
    // PR-14 修复：citty 把 `no-` 前缀当特殊语法（否定），会剥掉。
    // 改用正向 boolean flag `--unlock-check`（default false）；命名也更贴语义——
    // 用前需先 `oxn work unlock`，让 lockHealth 走 bypassed 路径。
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    await runCli(['work', 'validate', 'lifecycle', '--json'])
    // 故意不 lock
    const ctxRaw = (await runCli(['work', 'context', 'lifecycle', '--task', 'a', '--unlock-check', '--json'])).stdout
    const ctx = JSON.parse(ctxRaw)
    expect(ctx.ok).toBe(true)
    expect(ctx.data.lockHealth.status).toBe('bypassed')
  })

  test('9. run 缺 planLock → LOCK_NOT_FOUND', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    await runCli(['work', 'validate', 'lifecycle', '--json'])
    // 不 lock，直接 run
    const r = JSON.parse((await runCli(['work', 'run', 'lifecycle', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
  })
})

// ───────── NV-1 / NV-2 守卫（合并自原 work-e2e.test.ts）─────────
//
// NV-1：work run 之后不能再 add/edit/delete task
// NV-2：work run 之前不能 submit
//
// 共享 single-slot blueprint + 单 task 'alpha' 的最小工程布局。
// ─────────────────────────────────────────────────────────────

const SINGLE_DOMAIN = `domain "SingleDomain" {
  description = "single domain"
}
`

const SINGLE_SLOT_BLUEPRINT = `blueprint "single" {
  assetVersion = 1
  description = "single slot"
  slot "alpha" { }
}
`

async function setupSingleWorkWithRun(workName: string): Promise<void> {
  await initProject()
  mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon', 'domains', 'single-domain.oxn'), SINGLE_DOMAIN)
  writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'single.oxn'), SINGLE_SLOT_BLUEPRINT)
  await runCli(['work', 'create', workName, '--blueprint', 'single', '--json'])
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'alpha'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'works', workName, 'tasks', 'alpha', 'task.oxn'),
    `task "alpha" {
  blueprint "single"
  part "build" { skill_context = "test" }
}
`,
  )
  // PR-8: validate + lock before run
  await runCli(['work', 'validate', workName, '--json'])
  await runCli(['work', 'lock', workName, '--json'])
  await runCli(['work', 'run', workName, '--json'])
}

describe('NV-1 / NV-2 守卫', () => {
  test('NV-1: add-task is rejected after work run is called', async () => {
    await setupSingleWorkWithRun('single')

    const addTask = JSON.parse(
      (await runCli(['work', 'add-task', 'single', '--task', 'gamma', '--blueprint', 'single', '--json'])).stdout,
    )
    expect(addTask.ok).toBe(false)
    expect(addTask.error.code).toBe('OXN_WORK_ALREADY_RUNNING')
  })

  test('NV-1: edit-task is rejected after work run is called', async () => {
    await setupSingleWorkWithRun('single')

    const editTask = JSON.parse(
      (await runCli(['work', 'edit-task', 'single', '--task', 'alpha', '--objective', 'changed', '--json'])).stdout,
    )
    expect(editTask.ok).toBe(false)
    expect(editTask.error.code).toBe('OXN_WORK_ALREADY_RUNNING')
  })

  test('NV-1: delete-task is rejected after work run is called', async () => {
    await setupSingleWorkWithRun('single')

    const deleteTask = JSON.parse(
      (await runCli(['work', 'delete-task', 'single', '--task', 'alpha', '--force', '--json'])).stdout,
    )
    expect(deleteTask.ok).toBe(false)
    expect(deleteTask.error.code).toBe('OXN_WORK_ALREADY_RUNNING')
  })

  test('NV-2: submit is rejected before work run is called', async () => {
    // 不调 setupSingleWorkWithRun — 故意只 create + write task.oxn，不 run
    await initProject()
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'single.oxn'), SINGLE_SLOT_BLUEPRINT)
    await runCli(['work', 'create', 'single', '--blueprint', 'single', '--json'])
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha', 'task.oxn'),
      `task "alpha" {
  blueprint "single"
  part "build" { skill_context = "test" }
}
`,
    )

    const submit = JSON.parse((await runCli(['work', 'submit', 'single', '--task', 'alpha', '--json'])).stdout)
    expect(submit.ok).toBe(false)
    expect(submit.error.code).toBe('OXN_WORK_NOT_STARTED')
  })
})
