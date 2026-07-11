// =============================================================================
// work-context-diagnostics-e2e.test.ts — PR-14b
//
// 覆盖 work context 补 diagnostics 软警告（不硬失败）：
//
// 场景模型（PR-14b 核心）：
//   - work 已 validate + lock 成功（.work 存在，planLock 完好）
//   - 然后 domain / blueprint 文件被外部删除
//   - 此时 context 应 soft warn（data.diagnostics 列出缺失项），不硬失败
//
// 覆盖：
//   1. happy path：所有 ref 解析 → diagnostics: []
//   2. lock 后删 domain 文件：context 仍 ok + diagnostics: [{type:domain, severity:warn}]
//   3. lock 后删 blueprint 文件：同上（type=blueprint）
//   4. lock 后删多个 ref：diagnostics 数组多元素
//   5. lock 守卫优先于 diagnostics（planLock 缺失时硬失败，不暴露 diagnostics）
//   6. work-level context（不带 --task）也含 diagnostics
//   7. diagnostics.severity="warn" 不是 "error"（不属 IAPError 体系）
//   8. @oxn/ scope ref → diagnostics message 含 "no builtin registry"
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-ctx-diag-'))
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
  description = "PR-14b test domain"
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

// 写一个"被外部删除"的域/蓝图文件 —— 用于在 lock 后删除模拟"声明还在但文件不在"
function writeExtraDomain(name: string): void {
  // v1.1 PR-fix-domain-name-consistency: caller 必须传 kebab-case name (或与 file stem 一致的 name)。
  // 文件名严格等于 name,保证 parseDomainSlim NAME_FILE_MISMATCH 软检测通过。
  writeFileSync(
    join(tmpDir, '.openxenon', 'assets', 'domains', `${name}.oxn`),
    `domain "${name}" { description = "tmp"; term { "T": "t" }; invariant { "i" } }\n`,
  )
}

function writeExtraBlueprint(name: string): void {
  // v1.1 PR-fix-domain-name-consistency: 同 writeExtraDomain, caller 传 kebab-case
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
    goal = "PR-14b";
    constraints = ["c1"];
    } loop_policy { max_iterations = 4; }
${ds.join('\n')}
${bps.join('\n')}
  task "a" { blueprint "LifecycleBP" }
}
`
}

describe('work context 补 diagnostics 软警告（PR-14b）', () => {
  test('1. happy path：所有 ref 解析 → diagnostics: []', async () => {
    await initProject()
    setupProjectWith()
    setupWork('demo', SIMPLE_WORK('demo'), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.diagnostics).toBeDefined()
    expect(r.data.diagnostics).toEqual([])
  })

  test('2. lock 后删 domain 文件：context 仍 ok + diagnostics 为空（domain refs 走 Blueprint ## Refs）', async () => {
    await initProject()
    setupProjectWith()
    writeExtraDomain('missing-dom') // v1.1: 用 kebab-case 保证 name↔file 一致 (PR-fix-domain-name-consistency)
    setupWork('demo', SIMPLE_WORK('demo', ['missing-dom']), ['a'])

    const v = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(v.ok).toBe(true)
    await runCli(['work', 'lock', 'demo', '--json'])

    // 模拟"锁后文件被删"
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'missing-dom.oxn'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    expect(r.ok).toBe(true) // 软警告，不硬失败
    // Phase B: domain refs 不再被直接诊断（通过 Blueprint ## Refs 解析）
    expect(r.data.diagnostics).toEqual([])
  })

  test('3. lock 后删 blueprint 文件：diagnostics: [{type:blueprint, severity:warn}]', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('ghost-bp') // v1.1: kebab-case 保证 name↔file 一致
    setupWork('demo', SIMPLE_WORK('demo', [], ['ghost-bp']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 锁后删文件
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'ghost-bp.oxn'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.diagnostics).toHaveLength(1)
    const d = r.data.diagnostics[0]
    expect(d.type).toBe('blueprint')
    expect(d.ref).toBe('@prj/blueprints/ghost-bp')
    expect(d.message).toContain('ghost-bp')
  })

  test('4. lock 后删多个 ref：diagnostics 数组多元素', async () => {
    await initProject()
    setupProjectWith()
    writeExtraDomain('missing-dom1')
    writeExtraDomain('missing-dom2')
    writeExtraBlueprint('missing-bp1')
    setupWork('demo', SIMPLE_WORK('demo', ['missing-dom1', 'missing-dom2'], ['missing-bp1']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    // 删 3 个文件（Phase B: domain refs 不再被直接诊断，只有 blueprint 产生 diagnostics）
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'missing-dom1.oxn'))
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'missing-dom2.oxn'))
    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp1.oxn'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    expect(r.ok).toBe(true)
    // Phase B: only blueprint deletion produces diagnostics (domain refs resolved via blueprint refs)
    expect(r.data.diagnostics).toHaveLength(1)
    expect(r.data.diagnostics[0].type).toBe('blueprint')
  })

  test('5. lock 守卫优先于 diagnostics（planLock 缺失时硬失败）', async () => {
    await initProject()
    setupProjectWith()
    setupWork('demo', SIMPLE_WORK('demo'), ['a'])

    // 仅 validate，不 lock
    await runCli(['work', 'validate', 'demo', '--json'])

    // 故意不 lock
    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    // 锁守卫拦截：planLock 缺失报 NOT_FOUND，diagnostics 不暴露
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_ALIGN_LOCK_NOT_FOUND')
    expect(r.diagnostics).toBeUndefined()
  })

  test('6. work-level context（不带 --task）也含 diagnostics', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('missing-bp')
    setupWork('demo', SIMPLE_WORK('demo', [], ['missing-bp']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp.oxn'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.level).toBe('work')
    expect(r.data.diagnostics).toHaveLength(1)
    expect(r.data.diagnostics[0].type).toBe('blueprint')
  })

  test('7. diagnostics.severity="warn" 不是 "error"（不属 IAPError 体系）', async () => {
    await initProject()
    setupProjectWith()
    writeExtraBlueprint('missing-bp')
    setupWork('demo', SIMPLE_WORK('demo', [], ['missing-bp']), ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    await runCli(['work', 'lock', 'demo', '--json'])

    unlinkSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'missing-bp.oxn'))

    const r = JSON.parse((await runCli(['work', 'context', 'demo', '--task', 'a', '--json'])).stdout)
    const d = r.data.diagnostics[0]
    expect(d.severity).toBe('warn')
    expect(d.code).not.toMatch(/^IAP_/) // 不进 IAPError 字典命名空间
  })
})
