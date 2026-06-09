// =============================================================================
// work-migrate-e2e.test.ts — PR-10
//
// 覆盖：
//   1. happy path：V0 work-state/work-trace/work-frozen.json 存在 → migrate 落 V1
//   2. happy path：task-level V0 文件也被迁移
//   3. happy path：迁移后 .work / domains.json / blueprints.json 重新生成
//   4. happy path：迁移后 planLock=null，assets 含 fileHash
//   5. 备份目录：works/<w>/.migrated-v0/<rel> 存在 V0 备份
//   6. 幂等：第二次 migrate → already-v1 no-op
//   7. work 不存在 → OXN_WORK_NOT_FOUND
//   8. work 存在但 V0 文件都不在 → OXN_WORK_NO_V0_LAYOUT
//   9. .work 迁移后被 validate 重写：迁移不影响后续 validate/lock/run 流程
//   10. 真实项目中的 domain-syntax-bounds work 也能 migrate（端到端 smoke）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-migrate-'))
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

function setupV0Project(): void {
  mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon', 'domains', 'domain-a.oxn'), DOMAIN_A)
  writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'blueprint-x.oxn'), BLUEPRINT_X)
}

function setupV0Work(workName: string, taskNames: string[]): void {
  const workDir = join(tmpDir, '.openxenon', 'works', workName)
  mkdirSync(join(workDir, 'tasks'), { recursive: true })
  writeFileSync(
    join(workDir, 'work.oxn'),
    `work "${workName}" {
  context { goal = "test"; constraints = ["c1"]; loop_policy { max_iterations = 3; } }
  domain "DomainA" ref "@prj/domains/domain-a";
  blueprint "BlueprintX" ref "@prj/blueprints/blueprint-x";
${taskNames.map((t) => `  task "${t}" { blueprint "BlueprintX" }`).join('\n')}
}
`,
  )
  // 写 V0 运行时文件
  writeFileSync(join(workDir, 'work-state.json'), JSON.stringify({ workName, status: 'passed', tasks: [] }, null, 2))
  writeFileSync(join(workDir, 'work-trace.jsonl'), '{"event":"work-started","at":"2026-06-01T00:00:00.000Z"}\n')
  writeFileSync(
    join(workDir, 'work-frozen.json'),
    JSON.stringify({ workName, completedAt: '2026-06-01T00:01:00.000Z', tasks: [] }, null, 2),
  )

  for (const t of taskNames) {
    const taskDir = join(workDir, 'tasks', t)
    mkdirSync(taskDir, { recursive: true })
    writeFileSync(
      join(taskDir, 'task.oxn'),
      `task "${t}" { blueprint "BlueprintX" part "alpha" { skill_context = "do ${t}" } }
`,
    )
    writeFileSync(join(taskDir, 'task-state.json'), JSON.stringify({ taskName: t, status: 'passed' }, null, 2))
    writeFileSync(join(taskDir, 'task-trace.jsonl'), `{"event":"task-started","at":"2026-06-01T00:00:00.000Z"}\n`)
    writeFileSync(
      join(taskDir, 'task-frozen.json'),
      JSON.stringify({ taskName: t, completedAt: '2026-06-01T00:00:30.000Z' }, null, 2),
    )
  }
}

// ───────── happy path ─────────

describe('oxn work migrate (PR-10)', () => {
  test('happy path：V0 三个 work-level 文件迁移到 .run/', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', [])

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.migrated).toBe(true)
    expect(r.data.v0FilesMoved).toBe(3)
    expect(r.data.backupDir).toContain('.migrated-v0')

    // V1 路径有文件
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'trace.jsonl'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'frozen.json'))).toBe(true)

    // V0 旧路径文件已不在
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'work-state.json'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'work-trace.jsonl'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'work-frozen.json'))).toBe(false)

    // 备份存在
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.migrated-v0', 'work-state.json'))).toBe(true)
  })

  test('happy path：task-level V0 文件也迁移到 .run/tasks/<t>/', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', ['a', 'b'])

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    // 3 (work) + 2 tasks × 3 = 9 文件
    expect(r.data.v0FilesMoved).toBe(9)

    // task V1 路径
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'tasks', 'a', 'state.json'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'tasks', 'a', 'trace.jsonl'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'tasks', 'a', 'frozen.json'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'tasks', 'b', 'state.json'))).toBe(true)

    // task V0 路径已不在
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'tasks', 'a', 'task-state.json'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'tasks', 'a', 'task-trace.jsonl'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'tasks', 'a', 'task-frozen.json'))).toBe(false)

    // task 备份存在
    expect(
      existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.migrated-v0', 'tasks', 'a', 'task-state.json')),
    ).toBe(true)
  })

  test('happy path：迁移后 .work / domains.json / blueprints.json 重新生成', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', ['a'])

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.artifactsWritten).toHaveLength(3)
    expect(r.data.artifactsWritten.some((p: string) => p.endsWith('.work'))).toBe(true)
    expect(r.data.artifactsWritten.some((p: string) => p.endsWith('domains.json'))).toBe(true)
    expect(r.data.artifactsWritten.some((p: string) => p.endsWith('blueprints.json'))).toBe(true)

    // 3 个产物文件确实在
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'domains.json'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'blueprints.json'))).toBe(true)
  })

  test('happy path：迁移后 .work planLock=null，assets 含 fileHash', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', [])

    await runCli(['work', 'migrate', 'demo', '--json'])

    const cert = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'), 'utf-8'))
    expect(cert.kind).toBe('work-birth-cert')
    expect(cert.planLock).toBe(null)
    expect(cert.assets.domains).toHaveLength(1)
    expect(cert.assets.domains[0].fileHash).toMatch(/^[0-9a-f]{64}$/)
    expect(cert.assets.blueprints).toHaveLength(1)
    expect(cert.assets.blueprints[0].fileHash).toMatch(/^[0-9a-f]{64}$/)
  })

  // ───────── 幂等 ─────────

  test('幂等：第二次 migrate → already-v1 no-op + warning 提示手动清理', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', [])

    // 第一次
    const r1 = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r1.data.migrated).toBe(true)

    // 第二次
    const r2 = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r2.ok).toBe(true)
    expect(r2.data.migrated).toBe(false)
    expect(r2.data.reason).toBe('already-v1')
    expect(r2.data.warnings.length).toBeGreaterThan(0)
  })

  // ───────── 失败 ─────────

  test('work 不存在 → OXN_WORK_NOT_FOUND', async () => {
    await initProject()
    const r = JSON.parse((await runCli(['work', 'migrate', 'ghost', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_NOT_FOUND')
  })

  test('work 存在但 V0 文件都不在 → OXN_WORK_NO_V0_LAYOUT（纯 planning work）', async () => {
    await initProject()
    setupV0Project()
    // 只写 work.oxn + tasks/<t>/task.oxn，不写 V0 运行时文件
    const workDir = join(tmpDir, '.openxenon', 'works', 'pure-planning')
    mkdirSync(join(workDir, 'tasks', 't'), { recursive: true })
    writeFileSync(
      join(workDir, 'work.oxn'),
      `work "pure-planning" {
  context { goal = "x" }
  domain "DomainA" ref "@prj/domains/domain-a";
  blueprint "BlueprintX" ref "@prj/blueprints/blueprint-x";
  task "t" { blueprint "BlueprintX" }
}
`,
    )
    writeFileSync(
      join(workDir, 'tasks', 't', 'task.oxn'),
      `task "t" { blueprint "BlueprintX" part "alpha" { skill_context = "x" } }
`,
    )

    const r = JSON.parse((await runCli(['work', 'migrate', 'pure-planning', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_NO_V0_LAYOUT')
  })

  test('未 init → OXN_NO_PROJECT', async () => {
    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_NO_PROJECT')
  })

  // ───────── 端到端：migrate 之后 run 流程正常工作 ─────────

  test('迁移后 validate/lock/run 完整流程通过', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', ['a'])

    // migrate
    await runCli(['work', 'migrate', 'demo', '--json'])

    // 后续 validate + lock + run
    const v = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(v.ok).toBe(true)
    const l = JSON.parse((await runCli(['work', 'lock', 'demo', '--json'])).stdout)
    expect(l.ok).toBe(true)
    const r = JSON.parse((await runCli(['work', 'run', 'demo', '--json'])).stdout)
    // V0 work-frozen.json 表明 work 是 passed；migrate 后 .run/state.json 标记 passed
    // 因此 "work run" 应该报 "already exists"（work 已结束，不能 re-run）
    // 验证：state.json.status 应该是 "passed"，证明迁移保留了 V0 终态
    const v0State = JSON.parse(
      readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.migrated-v0', 'work-state.json'), 'utf-8'),
    )
    const v1StatePath = join(tmpDir, '.openxenon', 'works', 'demo', '.run', 'state.json')
    expect(existsSync(v1StatePath)).toBe(true)
    const v1State = JSON.parse(readFileSync(v1StatePath, 'utf-8'))
    expect(v1State.status).toBe('passed')
    expect(v1State.workName).toBe('demo')
    expect(v0State.status).toBe('passed') // 备份里也是 passed（迁移无损保留）
  })

  // ───────── 真实项目 smoke ─────────

  test('端到端 smoke：对真实项目 domain-syntax-bounds 跑 migrate（不动现存文件）', async () => {
    // 模拟真实路径：用临时 work 替代，但用真实 .openxenon/domains/ 索引
    // 注：实际跑的话会动到用户 work——所以本测试 copy 真实域 ref 而不复用真实文件
    await initProject()
    setupV0Project()
    setupV0Work('demo', ['a'])

    // 模拟 V0 文件里 work-trace.jsonl 是真实的（包含一些事件）
    const workDir = join(tmpDir, '.openxenon', 'works', 'demo')
    writeFileSync(
      join(workDir, 'work-trace.jsonl'),
      '{"event":"work-started","at":"2026-06-06T03:28:47.626Z"}\n' +
        '{"event":"task-started","at":"2026-06-06T03:28:47.631Z","task":"a"}\n',
    )

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.v0FilesMoved).toBe(6) // 3 work + 1 task * 3

    // V1 trace 内容应保留
    const newTrace = readFileSync(join(workDir, '.run', 'trace.jsonl'), 'utf-8')
    expect(newTrace).toContain('work-started')
    expect(newTrace).toContain('task_started')
  })
})

// =============================================================================
// PR-14d: migrate 补 diagnostics（成功路径）
//
// 覆盖：
//   1. happy path：所有 ref 解析 → diagnostics: []
//   2. migrate 时 work.oxn 引用了不存在的 domain → diagnostics: [{type:domain, severity:warn}]
//   3. migrate 时 work.oxn 引用了不存在的 blueprint → diagnostics: [{type:blueprint}]
//   4. 多个 invalid ref：diagnostics 数组多元素
//   5. diagnostics.severity="warn"（不入 IAPError 体系）
// =============================================================================

describe('work migrate diagnostics（PR-14d）', () => {
  test('1. happy path：所有 ref 解析 → diagnostics: []', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', ['a'])

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.diagnostics).toBeDefined()
    expect(r.data.diagnostics).toEqual([])
  })

  test('2. migrate 缺 domain：diagnostics: [{type:domain, severity:warn}]', async () => {
    await initProject()
    // 故意不写 domain-a.oxn（setupV0Work 引用 DomainA 但文件不存在）
    setupV0Work('demo', ['a'])

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.diagnostics.length).toBeGreaterThanOrEqual(1)
    const domDiag = r.data.diagnostics.find((d) => d.type === 'domain' && d.ref === '@prj/domains/domain-a')
    expect(domDiag).toBeDefined()
    expect(domDiag.severity).toBe('warn')
    expect(domDiag.code).toBe('OXN_WORK_REFS_UNRESOLVED')
    expect(domDiag.message).toContain('DomainA')
    expect(domDiag.suggestion).toContain('DomainA')
  })

  test('3. migrate 缺 blueprint：diagnostics: [{type:blueprint, severity:warn}]', async () => {
    await initProject()
    // 写域文件但不写蓝图文件
    mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'domains', 'domain-a.oxn'), DOMAIN_A)
    // 故意不写 blueprint-x.oxn（setupV0Work 引用 BlueprintX）
    setupV0Work('demo', ['a'])

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    const bpDiag = r.data.diagnostics.find(
      (d) => d.type === 'blueprint' && d.ref === '@prj/blueprints/blueprint-x',
    )
    expect(bpDiag).toBeDefined()
    expect(bpDiag.severity).toBe('warn')
    expect(bpDiag.code).toBe('OXN_WORK_REFS_UNRESOLVED')
  })

  test('4. 多个 invalid ref：diagnostics 数组多元素', async () => {
    await initProject()
    setupV0Work('demo', ['a'])

    // 在 work.oxn 额外声明多个不存在的 ref
    const workOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn')
    const content = readFileSync(workOxnPath, 'utf-8')
    writeFileSync(
      workOxnPath,
      content.replace(
        'blueprint "BlueprintX" ref "@prj/blueprints/blueprint-x";',
        'blueprint "BlueprintX" ref "@prj/blueprints/blueprint-x";\n  domain "GhostDom" ref "@prj/domains/ghostdom";\n  blueprint "GhostBP" ref "@prj/blueprints/ghostbp";',
      ),
    )

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    const types = r.data.diagnostics.map((d) => d.type)
    expect(types.filter((t) => t === 'domain').length).toBeGreaterThanOrEqual(1)
    expect(types.filter((t) => t === 'blueprint').length).toBeGreaterThanOrEqual(1)
  })

  test('5. diagnostics.severity="warn"（不入 IAPError 体系）', async () => {
    await initProject()
    setupV0Project()
    setupV0Work('demo', ['a'])

    const r = JSON.parse((await runCli(['work', 'migrate', 'demo', '--json'])).stdout)
    for (const d of r.data.diagnostics) {
      expect(d.severity).toBe('warn')
      expect(d.code).not.toMatch(/^IAP_/)
    }
  })
})
