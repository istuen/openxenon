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
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', '..', 'index.ts')

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
  writeFileSync(join(tmpDir, '.openxenon', 'domains', 'lifecycle-domain.md'), DOMAIN)
  writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'lifecycle-bp.md'), BLUEPRINT)
}

function setupWork(workName: string, taskNames: string[]): void {
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'works', workName, 'work.md'),
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
      join(tmpDir, '.openxenon', 'works', workName, 'tasks', t, 'task.md'),
      `task "${t}" {
  part "alpha" { skill_context = "do ${t}" }
}
`,
    )
  }
}

describe('完整 work 生命周期 V1（PR-13）', () => {
  test('8. RFC-0033 D2：lockHealth 字段已退役，context 不再校验锁状态', async () => {
    // 旧行为：--unlock-check 跳过守卫 + lockHealth=bypassed
    // 新行为（RFC-0033 D2）：PlanLock 整体退役，lockHealth 字段写死为 {status:'disabled'}；context 不再拒绝 stale read
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    await runCli(['work', 'run', 'lifecycle', '--validate-only', '--json'])
    // 不 lock，context 仍能读
    const ctxRaw = (await runCli(['work', 'context', 'lifecycle', '--task', 'a', '--json'])).stdout
    const ctx = JSON.parse(ctxRaw)
    expect(ctx.ok).toBe(true)
    expect(ctx.data.lockHealth.status).toBe('disabled')
  })

  test('9. RFC-0033 D2：PlanLock 已删，run 不再要求 lock', async () => {
    await initProject()
    setupProject()
    setupWork('lifecycle', ['a'])
    // 不调 validate/lock，直接 run；预期 ok=true（PlanLock 退役后无锁守卫）
    const r = JSON.parse((await runCli(['work', 'run', 'lifecycle', '--json'])).stdout)
    expect(r.ok).toBe(true)
  })
})

describe('NV-1 / NV-2 守卫', () => {
  test('NV-2: submit is rejected before work run is called', async () => {
    await initProject()
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'blueprints', 'single.md'),
      `blueprint "single" {
  assetVersion = 1
  description = "single slot"
  slot "alpha" { }
}
`,
    )
    await runCli(['work', 'create', 'single', '--blueprint', 'single', '--json'])
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha', 'task.md'),
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
