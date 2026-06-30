// =============================================================================
// work-run-lock-e2e.test.ts — PR-8
//
// 覆盖 oxn work run 的 lock 边界守卫：
//   1. 缺 .work → OXN_ALIGN_LOCK_NOT_FOUND + 提示先 validate
//   2. .work 存在但 planLock === null → OXN_ALIGN_LOCK_NOT_FOUND + 提示先 lock
//   3. .work planLock 完好 → run 正常通过
//   4. lock 后改 work.oxn → run 抛 IAP_ALIGN_LOCK_HASH_MISMATCH (component=workOxn)
//   5. lock 后改 task.oxn → run 抛 IAP_ALIGN_LOCK_HASH_MISMATCH (component=tasks)
//   6. lock 后改 domains.json → run 抛 IAP_ALIGN_LOCK_HASH_MISMATCH (component=workDomains)
//   7. work 目录被删 → run 抛 IAP_ALIGN_WORK_REMOVED
//   8. unlock → 改 → re-validate → re-lock → run 恢复正常
//   9. 未 init → OXN_NO_PROJECT
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-run-lock-'))
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

// ───────── 失败：缺 .work / planLock=null ─────────

describe('oxn work run lock 守卫 (PR-8)', () => {
  test('缺 .work → OXN_ALIGN_LOCK_NOT_FOUND + 提示 validate', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a']) // 没 validate，所以没 .work

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false) // 协议层 fail（outputError 路径）
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
    expect(r.error.suggestion).toContain('oxn work validate')
  })

  test('.work 存在但 planLock === null → 提示先 lock', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    // validate 但不 lock
    await runCli(['work', 'validate', 'demo', '--json'])

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
  })

  // ───────── 成功：lock 完好 ─────────

  test('lock 完好 → run 正常通过', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.workName).toBe('demo')
    expect(r.data.overallStatus).toBe('running')
  })

  // ───────── 失败：lock 后被改 ─────────

  test('lock 后改 work.oxn → HASH_MISMATCH component=workOxn', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 改 work.oxn
    const workOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn')
    const content = readFileSync(workOxnPath, 'utf-8')
    writeFileSync(workOxnPath, content.replace('"test"', '"updated"'))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(r.error.context.component).toBe('workOxn')
    expect(r.error.context.expected).toBeDefined()
    expect(r.error.context.actual).toBeDefined()
    expect(r.error.context.expected).not.toBe(r.error.context.actual)
  })

  test('lock 后改 task.oxn → HASH_MISMATCH component=tasks', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 改 task.oxn
    const taskOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'tasks', 'a', 'task.oxn')
    writeFileSync(taskOxnPath, readFileSync(taskOxnPath, 'utf-8').replace('do a', 'do a MODIFIED'))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(r.error.context.component).toBe('tasks')
  })

  test('lock 后改 domains.json → HASH_MISMATCH component=workDomains', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 改 domains.json
    const domainsJsonPath = join(tmpDir, '.openxenon', 'works', 'demo', 'domains.json')
    const dom = JSON.parse(readFileSync(domainsJsonPath, 'utf-8'))
    dom.domains[0].description = 'TAMPERED'
    writeFileSync(domainsJsonPath, JSON.stringify(dom, null, 2))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(r.error.context.component).toBe('workDomains')
  })

  test('lock 后改 blueprints.json → HASH_MISMATCH component=blueprints', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const bpJsonPath = join(tmpDir, '.openxenon', 'works', 'demo', 'blueprints.json')
    const bp = JSON.parse(readFileSync(bpJsonPath, 'utf-8'))
    bp.blueprints[0].version = 999
    writeFileSync(bpJsonPath, JSON.stringify(bp, null, 2))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_HASH_MISMATCH')
    expect(r.error.context.component).toBe('blueprints')
  })

  test('work 目录被删 → OXN_ALIGN_WORK_REMOVED（删 work.oxn 触发 work-removed）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 删 work.oxn（保留 .work）→ verifyPlanLock 报 work-removed
    rmSync(join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn'))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.error.code).toBe('OXN_ALIGN_WORK_REMOVED')
  })

  // ───────── unlock → 改 → re-lock → run 恢复 ─────────

  test('unlock → 改 → re-validate → re-lock → run 恢复', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // unlock + 改
    await runCli(['work', 'unlock', 'demo', '--json'])
    const workOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn')
    const content = readFileSync(workOxnPath, 'utf-8')
    writeFileSync(workOxnPath, content.replace('"test"', '"updated"'))

    // re-validate + re-lock
    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // run 正常通过
    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.overallStatus).toBe('running')
  })

  // ───────── error 守卫 ─────────

  test('未 init → OXN_ALIGN_LOCK_NOT_FOUND（PR-8 锁守卫先于 work.oxn 缺失检查）', async () => {
    // PR-8 重排：lock 守卫先于 work.oxn 检查。.work 不存在时，run 报 ALIGN_LOCK_NOT_FOUND。
    // （语义："你连 planLock 都没建" 比 "work.oxn 缺失" 更根本）
    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
  })
})
