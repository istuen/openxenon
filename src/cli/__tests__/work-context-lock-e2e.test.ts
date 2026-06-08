// =============================================================================
// work-context-lock-e2e.test.ts — PR-9
//
// 覆盖 oxn work context 的 lock 边界守卫：
//   1. 缺 .work → OXN_ALIGN_LOCK_NOT_FOUND + 提示先 validate
//   2. .work 存在但 planLock === null → 提示先 lock
//   3. .work planLock 完好 → context 正常返回
//   4. lock 后改 work.oxn → HASH_MISMATCH component=workOxn
//   5. lock 后改 task.oxn → HASH_MISMATCH component=tasks
//   6. --noLockCheck 跳过守卫（仍能读到 stale 计划）
//   7. work 目录被删 → OXN_ALIGN_WORK_REMOVED
//   8. .work schema 不合法 → 详细 errors
//   9. 响应里含 lockHealth 元数据（可选 — PR-9 不加，避免破坏向后兼容）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-context-lock-'))
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

const DOMAIN_A = `domain "DomainA" {
  description = "x"
  term { "X": "x" }
  ban { "Z" }
  invariant { "rule1" }
}
`

const BLUEPRINT_X = `blueprint "BlueprintX" {
  version = 1
  slot "alpha" { observe = ["fs-match"] }
  slot "beta" { deps = ["alpha"]; observe = ["fs-exists"] }
}
`

function setupProject(): void {
  mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon', 'domains', 'domain-a.oxn'), DOMAIN_A)
  writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'blueprint-x.oxn'), BLUEPRINT_X)
}

function setupWork(workName: string, taskNames: string[]): void {
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'works', workName, 'work.oxn'),
    `work "${workName}" {
  context { goal = "test"; constraints = ["c1"]; loop_policy { max_iterations = 3; } }
  domain "DomainA" ref "@prj/domains/domain-a";
  blueprint "BlueprintX" ref "@prj/blueprints/blueprint-x";
${taskNames.map((t) => `  task "${t}" { blueprint "BlueprintX" }`).join('\n')}
}
`,
  )
  for (const t of taskNames) {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', t), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', workName, 'tasks', t, 'task.oxn'),
      `task "${t}" { blueprint "BlueprintX" part "alpha" { skill_context = "do ${t}" } }
`,
    )
  }
}

describe('oxn work context lock 守卫 (PR-9)', () => {
  test('缺 .work → OXN_ALIGN_LOCK_NOT_FOUND + 提示先 validate', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a']) // 没 validate，所以没 .work

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
    expect(r.error.suggestion).toContain('oxn work validate')
  })

  test('.work 存在但 planLock === null → 提示先 lock', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json']) // validate 但不 lock

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
    expect(r.error.suggestion).toContain('oxn work lock')
  })

  test('lock 完好 → context 正常返回', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.workspace).toBe('demo')
  })

  test('lock 后改 work.oxn → HASH_MISMATCH component=workOxn', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const workOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn')
    writeFileSync(workOxnPath, readFileSync(workOxnPath, 'utf-8').replace('"test"', '"updated"'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(r.error.context.component).toBe('workOxn')
    console.error('DBG workOxn:', r.error.code)
  })

  test('lock 后改 task.oxn → HASH_MISMATCH component=tasks', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const taskOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'tasks', 'a', 'task.oxn')
    writeFileSync(taskOxnPath, readFileSync(taskOxnPath, 'utf-8').replace('do a', 'do a MODIFIED'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(r.error.context.component).toBe('tasks')
  })

  test('--noLockCheck 跳过守卫 → context 正常返回（带 stale 计划数据）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 改 work.oxn
    const workOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn')
    writeFileSync(workOxnPath, readFileSync(workOxnPath, 'utf-8').replace('"test"', '"stale"'))

    // 默认守卫会拒；--noLockCheck 跳过
    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--noLockCheck', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.workspace).toBe('demo')
  })

  test('work 目录被删 → OXN_ALIGN_WORK_REMOVED（删 work.oxn 触发）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 删 work.oxn 触发 work-removed 路径
    rmSync(join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_WORK_REMOVED')
  })

  test('--task <t> 同样走 lock 守卫（task-level 也守）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const taskOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'tasks', 'a', 'task.oxn')
    writeFileSync(taskOxnPath, readFileSync(taskOxnPath, 'utf-8').replace('do a', 'do a MODIFIED'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(r.error.context.component).toBe('tasks')
  })

  test('.work schema 不合法 → 详细 errors', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json']) // 先建出 .work

    // 故意破坏 .work
    const workFilePath = join(tmpDir, '.openxenon', 'works', 'demo', '.work')
    writeFileSync(workFilePath, JSON.stringify({ totally: 'wrong' }))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
    expect(r.error.suggestion).toContain('Invalid input')
  })

  test('未 init → OXN_ALIGN_LOCK_NOT_FOUND（PR-9 锁守卫先于 work.oxn 缺失检查）', async () => {
    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
  })
})
