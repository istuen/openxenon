// =============================================================================
// work-status-birth-cert-e2e.test.ts — PR-14a
//
// 覆盖 work status 补 planLock 字段：
//   1. happy path：validate+lock 后 status 显示 planLock.present=true + lockedAt + allHash
//   2. validate 后未 lock：planLock.present=false，status 仍 ok
//   3. .work 缺失：status 报 OXN_WORK_NOT_FOUND（message 含 .work birth cert missing）
//   4. .work 存在 + .run/state.json 缺失：status 返回 data.workspace=null + planLock
//      元数据 + note（"work validated but not yet run"）
//   5. .work schema 损坏：status 报 OXN_WORK_NOT_FOUND（message 含 schema error details）
//   6. status 字段名与 context.run.lockHealth 不冲突（planLock vs lockHealth 各自独立）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-status-'))
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
  description = "PR-14a test domain"
  term { "X": "x" }
  invariant { "i" }
}
`

const BLUEPRINT = `blueprint "LifecycleBP" {
  version = 1
  slot "alpha" { observe = ["fs-match"] }
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
    goal = "PR-14a";
    constraints = ["c1"];
    loop_policy { max_iterations = 4; }
  }
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
  part "alpha" { skill_context = "x" }
}
`,
    )
  }
}

describe('work status 补 planLock（PR-14a）', () => {
  test('1. happy path：validate+lock 后 status 显示 planLock={present:true,lockedAt,allHash}', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    const lk = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(lk.ok).toBe(true)
    await runCli(['work', 'run', 'demo', '--json'])

    const r = JSON.parse((await runCli(['work', 'status', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.planLock).toBeDefined()
    expect(r.data.planLock.present).toBe(true)
    expect(r.data.planLock.lockedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(r.data.planLock.allHash).toMatch(/^[0-9a-f]{64}$/)
  })

  test('2. validate 后未 lock：planLock.present=false，status 仍 ok', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    // 不 lock，直接 run 会失败（缺 planLock），改用 status
    const r = JSON.parse((await runCli(['work', 'status', 'demo', '--json'])).stdout)
    // .work 存在但 .run/state.json 缺失 → 走"work validated but not yet run" 分支
    expect(r.ok).toBe(true)
    expect(r.data.workspace).toBe(null)
    expect(r.data.planLock.present).toBe(false)
    expect(r.data.planLock.lockedAt).toBe(null)
    expect(r.data.note).toContain('validated but not yet run')
  })

  test('3. .work 缺失：status 报 OXN_WORK_NOT_FOUND', async () => {
    await initProject()
    // 不调用 validate，所以没有 .work
    const r = JSON.parse((await runCli(['work', 'status', 'nonexistent', '--json'])).stdout)
    // v1.1 fix-p2-robustness output-data-overload: error 不再被外层 data 包装
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_NOT_FOUND')
    expect(r.error.message).toContain('.work birth cert')
  })

  test('4. .work 存在 + .run/state.json 缺失：workspace=null + planLock 镜像', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])
    // 故意不 run，.run/state.json 不存在

    const r = JSON.parse((await runCli(['work', 'status', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.workspace).toBe(null)
    expect(r.data.planLock.present).toBe(true) // .work 里有 planLock
    expect(r.data.planLock.lockedAt).toBeDefined()
    expect(r.data.note).toContain('validated but not yet run')
  })

  test('5. .work schema 损坏：status 报 OXN_WORK_NOT_FOUND（message 含 schema 详情）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])

    // 损坏 .work：写非法 JSON
    const workPath = join(tmpDir, '.openxenon', 'works', 'demo', '.work')
    writeFileSync(workPath, '{ "not": "a birth cert" }', 'utf-8')

    const r = JSON.parse((await runCli(['work', 'status', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_NOT_FOUND')
    expect(r.error.message).toContain('.work birth cert missing or invalid')
    expect(r.error.message).toContain('schema-mismatch')
  })

  test('6. status.planLock 与 context.lockHealth 字段名独立（语义不混淆）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])
    await runCli(['work', 'run', 'demo', '--json'])

    const statusResp = JSON.parse((await runCli(['work', 'status', 'demo', '--json'])).stdout)
    expect(statusResp.data.planLock).toBeDefined()
    expect(statusResp.data.lockHealth).toBeUndefined() // status 不用 lockHealth

    const ctxResp = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    expect(ctxResp.data.lockHealth).toBeDefined()
    expect(ctxResp.data.planLock).toBeUndefined() // context 不用 planLock
  })
})
