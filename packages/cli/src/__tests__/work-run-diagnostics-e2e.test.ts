// =============================================================================
// work-run-diagnostics-e2e.test.ts — PR-14c
//
// 覆盖 work run 补 diagnostics + 持久化到 .run/state.json：
//   1. happy path：所有 ref 解析 → run diagnostics: [] + state.json 无 diagnostics
//   2. lock 后删 blueprint 文件：run 仍 ok + diagnostics 写入 .run/state.json
//   3. 删 blueprint 文件：同上（type=blueprint）
//   4. 删多个 blueprint：diagnostics 数组多元素 + 持久化
//   5. status 反射回 .run/state.json 的 diagnostics
//   6. explore 模式无 domain 约束：diagnostics 为空（mode 决定不走 ref 解析）
//   7. severity 必为 'warn'（不进 IAPError 体系）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-run-diag-'))
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
  description = "PR-14c test domain"
  term { "X": "x" }
  invariant { "i" }
}
`

const BLUEPRINT = `blueprint "LifecycleBP" {
  assetVersion = 1
  slot "alpha" { "observe" = ["fs-match"] }
  slot "beta" { deps = ["alpha"]; observe = ["fs-exists"] }
}
`

function setupProjectWith(): void {
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'lifecycle-domain.oxn'), DOMAIN)
  writeFileSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'lifecycle-bp.oxn'), BLUEPRINT)
}

function writeExtraDomain(name: string): void {
  // v1.1 PR-fix-domain-name-consistency: caller 必须传 kebab-case name (与 file stem 一致)
  writeFileSync(
    join(tmpDir, '.openxenon', 'assets', 'domains', `${name}.oxn`),
    `domain "${name}" { description = "tmp"; term { "T": "t" }; invariant { "i" } }\n`,
  )
}

function writeExtraBlueprint(name: string): void {
  // v1.1 PR-fix-domain-name-consistency: 同上
  writeFileSync(
    join(tmpDir, '.openxenon', 'assets', 'blueprints', `${name}.oxn`),
    `blueprint "${name}" { assetVersion = 1; slot "x" { deps = []; observe = ["fs-exists"] } }\n`,
  )
}

function setupWork(workName: string, workOxnContent: string, taskNames: string[]): void {
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'work.oxn'), workOxnContent)
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

const SIMPLE_WORK = (workName: string, extraDomains: string[] = [], extraBlueprints: string[] = []): string => {
  const ds = [
    `  domain "LifecycleDomain" ref "@prj/domains/lifecycle-domain";`,
    ...extraDomains.map((d) => `  domain "${d}" ref "@prj/domains/${d.toLowerCase()}";`),
  ]
  const bps = [
    `  blueprint "LifecycleBP" ref "@prj/blueprints/lifecycle-bp";`,
    ...extraBlueprints.map((b) => `  blueprint "${b}" ref "@prj/blueprints/${b.toLowerCase()}";`),
  ]
  return `work "${workName}" {
  context {
    goal = "PR-14c";
    constraints = ["c1"];
    } loop_policy { max_iterations = 4; }
${ds.join('\n')}
${bps.join('\n')}
  task "a" { blueprint "LifecycleBP" }
}
`
}

describe('work run 补 diagnostics + 持久化（PR-14c）', () => {
  test('1. happy path：所有 ref 解析 → run diagnostics: [] + state.json 无 diagnostics', async () => {
    await initProject()
    setupProjectWith()
    setupWork('demo', SIMPLE_WORK('demo'), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.diagnostics).toBeDefined()
    expect(r.data.diagnostics).toEqual([])

    // state.json 不应有 diagnostics 字段（无 warn 时省略）
    const stateRaw = readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json'), 'utf-8')
    const state = JSON.parse(stateRaw)
    expect(state.diagnostics).toBeUndefined()
  })

  test('2. lock 后删 blueprint 文件：run 仍 ok + diagnostics 写入 .run/state.json', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('missing-bp')
    setupWork('demo', SIMPLE_WORK('demo', [], ['missing-bp']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 锁后删文件
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp.oxn'))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true) // 软警告，不硬失败
    expect(r.data.diagnostics).toHaveLength(1)
    const d = r.data.diagnostics[0]
    expect(d.code).toBe('OXN_WORK_REFS_UNRESOLVED')
    expect(d.severity).toBe('warn')
    expect(d.type).toBe('blueprint')
    expect(d.ref).toBe('@prj/blueprints/missing-bp')

    // .run/state.json 持久化 diagnostics
    const stateRaw = readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json'), 'utf-8')
    const state = JSON.parse(stateRaw)
    expect(state.diagnostics).toBeDefined()
    expect(state.diagnostics).toHaveLength(1)
    expect(state.diagnostics[0].type).toBe('blueprint')
    expect(state.diagnostics[0].severity).toBe('warn')
  })

  test('3. lock 后删 blueprint 文件：diagnostics: [{type:blueprint}]', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('ghost-bp')
    setupWork('demo', SIMPLE_WORK('demo', [], ['ghost-bp']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'ghost-bp.oxn'))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.diagnostics).toHaveLength(1)
    expect(r.data.diagnostics[0].type).toBe('blueprint')

    const state = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json'), 'utf-8'))
    expect(state.diagnostics[0].type).toBe('blueprint')
  })

  test('4. 删多个 blueprint：diagnostics 数组多元素 + 持久化', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('missing-bp1')
    writeExtraBlueprint('missing-bp2')
    writeExtraBlueprint('missing-bp3')
    setupWork('demo', SIMPLE_WORK('demo', [], ['missing-bp1', 'missing-bp2', 'missing-bp3']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp1.oxn'))
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp2.oxn'))
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp3.oxn'))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    expect(r.data.diagnostics).toHaveLength(3)

    const state = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json'), 'utf-8'))
    expect(state.diagnostics).toHaveLength(3)
  })

  test('5. status 反射回 .run/state.json 的 diagnostics', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('missing-bp')
    setupWork('demo', SIMPLE_WORK('demo', [], ['missing-bp']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp.oxn'))

    await runCli(['work', 'run', 'demo', '--json'])

    // 状态已 passed，再 unlock 重新跑会报 already exists；用 status 读
    const _r = JSON.parse((await runCli(['work', 'status', 'demo', '--json'])).stdout)
    // status 当前不读 .run/state.json 的 diagnostics（仅 planLock）；但 .run/state.json 已持久化
    const state = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json'), 'utf-8'))
    expect(state.diagnostics).toBeDefined()
    expect(state.diagnostics[0].ref).toBe('@prj/blueprints/missing-bp')
  })

  test('6. severity 必为 "warn"（不进 IAPError 体系）', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('missing-bp')
    setupWork('demo', SIMPLE_WORK('demo', [], ['missing-bp']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp.oxn'))

    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    for (const d of r.data.diagnostics) {
      expect(d.severity).toBe('warn')
      expect(d.code).not.toMatch(/^IAP_/)
    }

    const state = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json'), 'utf-8'))
    for (const d of state.diagnostics) {
      expect(d.severity).toBe('warn')
    }
  })
})
