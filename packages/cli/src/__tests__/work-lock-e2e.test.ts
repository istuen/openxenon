// =============================================================================
// work-lock-e2e.test.ts — PR-7
//
// 覆盖：
//   1. happy path：validate → lock → .work.planLock 设上，4 组件 hash 64-hex
//   2. lock 之后：未 init → OXN_NO_PROJECT
//   3. lock 之前没 validate → OXN_WORK_LOCK_FAILED（提示先 validate）
//   4. 重复 lock → OXN_WORK_LOCK_FAILED（提示先 unlock）
//   5. unlock：planLock 清空 + updatedAt 刷新 + previousLockedAt 记录
//   6. unlock 之后：planLock === null
//   7. unlock 一个没 lock 的 work → OXN_WORK_UNLOCK_FAILED
//   8. 完整 lifecycle：validate → lock → 修改 work.oxn → unlock → 改 → validate → re-lock → hash 变了
//   9. .work schema 不合法时 lock 失败 + 详细 errors
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-lock-'))
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
  description = "demo A"
  term { "X": "x" }
  ban { "Z" }
  invariant { "rule1" }
}
`

const BLUEPRINT_X = `blueprint "BlueprintX" {
  assetVersion = 1
  slot "alpha" { "observe" = ["fs-match"] }
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
  context { goal = "test"; constraints = ["c1"]; } loop_policy { max_iterations = 3; }

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

const HEX64 = /^[0-9a-f]{64}$/

// ───────── happy path ─────────

describe('oxn work lock / unlock (PR-7)', () => {
  test('happy path：validate → lock → planLock 设上，3 组件 hash 64-hex', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a', 'b'])

    // 先 validate
    const v = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(v.ok).toBe(true)

    // lock
    const r = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.workName).toBe('demo')
    expect(r.data.lockedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const pl = r.data.planLock
    expect(pl.workOxnHash).toMatch(HEX64)
    expect(pl.blueprintsHash).toMatch(HEX64)
    expect(pl.tasksHash).toMatch(HEX64)
    // Phase B: workDomainsHash removed (3-component hash)

    // 验证 .work 真的更新
    const cert = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'), 'utf-8'))
    expect(cert.planLock).not.toBe(null)
    expect(cert.planLock.lockedAt).toBe(r.data.lockedAt)
    expect(cert.planLock.workOxnHash).toBe(pl.workOxnHash)
  })

  // ───────── 失败：未 init / 缺 .work / 重复 lock ─────────

  test('未 init → OXN_NO_PROJECT', async () => {
    const r = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_NO_PROJECT')
  })

  test('lock 内含 validate — 未 validate 直接 lock 也能成功（Phase D）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a']) // 没跑 validate，但 lock 会自动 validate

    const r = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.planLock.allHash).toMatch(HEX64)
  })

  test('重复 lock → OXN_WORK_LOCK_FAILED + 提示先 unlock', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'lock', 'demo', '--json']) // lock 内含 validate

    const r = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_LOCK_FAILED')
    expect(r.error.suggestion).toContain('unlock')
    expect(r.error.context?.lockedAt).toBeDefined()
  })

  // ───────── unlock 路径 ─────────

  test('unlock：planLock 清空 + updatedAt 刷新 + previousLockedAt 记录', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 等 10ms 让 updatedAt 必然不同
    await new Promise((resolve) => setTimeout(resolve, 10))

    const r = JSON.parse((await runCli(['work', 'unlock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.cleared).toBe(true)
    expect(r.data.previousLockedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(r.data.clearedAt).not.toBe(r.data.previousLockedAt)

    // 验证 .work 真的清空
    const cert = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'), 'utf-8'))
    expect(cert.planLock).toBe(null)
  })

  test('unlock 一个没 lock 的 work → OXN_WORK_UNLOCK_FAILED', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json']) // validate 不 lock

    const r = JSON.parse((await runCli(['work', 'unlock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_UNLOCK_FAILED')
    expect(r.error.message).toContain('not locked')
  })

  test('unlock 一个没 validate 的 work → OXN_WORK_UNLOCK_FAILED + 提示先 validate', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a']) // 没 validate，所以没 .work

    const r = JSON.parse((await runCli(['work', 'unlock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_UNLOCK_FAILED')
    expect(r.error.suggestion).toContain('oxn work validate')
  })

  test('unlock 未 init → OXN_NO_PROJECT', async () => {
    const r = JSON.parse((await runCli(['work', 'unlock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_NO_PROJECT')
  })

  // ───────── 完整 lifecycle ─────────

  test('完整 lifecycle：validate → lock → unlock → 改 → validate → re-lock → hash 变了', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    const lock1 = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    const h1 = lock1.data.planLock.workOxnHash

    // unlock
    const u = JSON.parse((await runCli(['work', 'unlock', 'demo', '--json'])).stdout)
    expect(u.ok).toBe(true)

    // 改 work.oxn goal
    const workOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn')
    const content = readFileSync(workOxnPath, 'utf-8')
    writeFileSync(workOxnPath, content.replace('"test"', '"updated goal"'))

    // 重新 validate
    await runCli(['work', 'validate', 'demo', '--json'])

    // 重新 lock
    const lock2 = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(lock2.ok).toBe(true)
    const h2 = lock2.data.planLock.workOxnHash

    // hash 必须变（work.oxn 内容改了）
    expect(h2).not.toBe(h1)
  })

  // ───────── 异常 .work ─────────

  test('.work schema 不合法时 lock 自动修复（Phase D: validate 内含）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json']) // 先建出 .work

    // 故意破坏 .work
    const workFilePath = join(tmpDir, '.openxenon', 'works', 'demo', '.work')
    writeFileSync(workFilePath, JSON.stringify({ totally: 'wrong' }))

    // Phase D: lock 内含 validate → 自动修复 .work → 成功
    const r = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.planLock.allHash).toMatch(HEX64)
  })
})
