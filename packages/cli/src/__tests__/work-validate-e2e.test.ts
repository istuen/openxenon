// =============================================================================
// work-validate-e2e.test.ts — PR-6
//
// 覆盖：
//   1. happy path：validate 成功后落 3 个产物（domains.json + blueprints.json + .work）
//   2. .work 包含 assets.domains / assets.blueprints（fileHash 64-hex）
//   3. 失败 path：domain ref 找不到 → 不写任何产物 + 报告
//   4. 失败 path：blueprint ref 找不到 → 同上
//   5. 失败 path：task.oxn 缺失 → 同上
//   6. lock 后 validate 拒绝覆盖
//   7. 重复 validate 幂等（idempotent）
//   8. 未 init 的项目 → OXN_NO_PROJECT
//   9. 不存在的 work → OXN_WORK_NOT_FOUND
//   10. v0.7+：无 --type 参数（mode 概念已删除）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, existsSync as exists, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-validate-'))
})

afterEach(() => {
  if (exists(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
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
  description = "test domain A"
  term { "X": "x"; "Y": "y" }
  ban { "Z" }
  invariant { "rule1" }
}
`

const DOMAIN_B = `domain "DomainB" {
  description = "test domain B"
  term { "P": "p" }
  ban { "Q" }
  invariant { "rule2" }
}
`

const BLUEPRINT_X = `blueprint "BlueprintX" {
  assetVersion = 1
  slot "alpha" { "observe" = ["fs-match"] }
  slot "beta" { deps = ["alpha"]; observe = ["fs-exists"] }
}
`

const SIMPLE_TASK_OXN = (taskName: string) => `task "${taskName}" {
  blueprint "BlueprintX"
  part "alpha" { skill_context = "do ${taskName}" }
}
`

function setupProject(): void {
  // Phase B: 资产写在 assets/ 目录（primary path）
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'), { recursive: true })
  writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'domain-a.oxn'), DOMAIN_A)
  writeFileSync(join(tmpDir, '.openxenon', 'assets', 'domains', 'domain-b.oxn'), DOMAIN_B)
  writeFileSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'blueprint-x.oxn'), BLUEPRINT_X)
}

function setupWork(workName: string, taskNames: string[]): void {
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'works', workName, 'work.oxn'),
    `work "${workName}" {
  context {
    goal = "test goal";
    constraints = ["c1", "c2"];
    } loop_policy { max_iterations = 4; }
  domain "DomainA" ref "@prj/domains/domain-a";
  domain "DomainB" ref "@prj/domains/domain-b";
  blueprint "BlueprintX" ref "@prj/blueprints/blueprint-x";
${taskNames.map((t) => `  task "${t}" { blueprint "BlueprintX" }`).join('\n')}
}
`,
  )
  for (const t of taskNames) {
    mkdirSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', t), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'works', workName, 'tasks', t, 'task.oxn'), SIMPLE_TASK_OXN(t))
  }
}

// ───────── happy path ─────────

describe('oxn work validate (PR-6)', () => {
  test('happy path：validate 成功后落 3 个产物', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a', 'b'])

    const r = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.valid).toBe(true)
    expect(r.data.assetCounts).toEqual({ blueprints: 1, tasks: 2 })

    // Phase B: 2 个产物文件（domains.json 已删除）
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'blueprints.json'))).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'))).toBe(true)
  })

  test('.work 含 assets.blueprints（fileHash 64-hex）+ goal + constraints', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    await runCli(['work', 'validate', 'demo', '--json'])
    const cert = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'), 'utf-8'))
    expect(cert.kind).toBe('work-birth-cert')
    expect(cert.workName).toBe('demo')
    expect(cert.goal).toBe('test goal')
    expect(cert.constraints).toEqual(['c1', 'c2'])
    expect(cert.maxIterations).toBe(4)
    // Phase B: BirthCert V2 — no assets.domains (domains resolved via blueprint refs)
    expect(cert.assets.blueprints).toHaveLength(1)
    expect(cert.assets.blueprints[0].version).toBe(1)
    expect(cert.planLock).toBe(null)
  })

  test('v0.7+：--type 参数已移除（不再接受）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    // citty 对 unknown arg 默认忽略（不报错）；关键是不再映射 mode
    const r = JSON.parse((await runCli(['work', 'validate', 'demo', '--type', 'task', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.mode).toBeUndefined() // 字段已删除
    expect(r.data.workType).toBeUndefined() // 字段已删除
  })

  // ───────── 失败 path ─────────

  test('blueprint ref 找不到 → 不写产物 + OXN_WORK_REFS_UNRESOLVED', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])
    rmSync(join(tmpDir, '.openxenon', 'assets', 'blueprints', 'blueprint-x.oxn'))

    const r = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.code).toBe('OXN_WORK_REFS_UNRESOLVED')
    expect(r.data.valid).toBe(false)
    const unresolved = r.data.unresolved as Array<{ kind: string; name: string; reason: string }>
    expect(unresolved.some((u) => u.kind === 'blueprint' && u.name === 'BlueprintX')).toBe(true)
    expect(r.data.note).toContain('no artifacts written')

    // 验证：产物都不应被写
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', 'blueprints.json'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'))).toBe(false)
  })

  test('task.oxn 缺失 → 列入 unresolved', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a', 'b'])
    // 删 task b 的 task.oxn
    rmSync(join(tmpDir, '.openxenon', 'works', 'demo', 'tasks', 'b', 'task.oxn'))

    const r = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.code).toBe('OXN_WORK_REFS_UNRESOLVED')
    const unresolved = r.data.unresolved as Array<{ kind: string; name: string }>
    expect(unresolved.some((u) => u.name === 'b')).toBe(true)
  })

  // ───────── lock 守卫 ─────────

  test('lock 后 validate 拒绝覆盖 .work（但允许重写 blueprints.json）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    // 第一次 validate
    await runCli(['work', 'validate', 'demo', '--json'])

    // 手动 lock（PR-7 还没做，直接改 .work 模拟 lock 态）
    const workFilePath = join(tmpDir, '.openxenon', 'works', 'demo', '.work')
    const cert = JSON.parse(readFileSync(workFilePath, 'utf-8'))
    cert.planLock = {
      lockedAt: '2026-06-08T00:00:00.000Z',
      workOxnHash: '0'.repeat(64),
      blueprintsHash: '0'.repeat(64),
      tasksHash: '0'.repeat(64),
    }
    writeFileSync(workFilePath, JSON.stringify(cert, null, 2))

    // 改 work.oxn 触发重写需求
    const workOxnPath = join(tmpDir, '.openxenon', 'works', 'demo', 'work.oxn')
    const workOxnContent = readFileSync(workOxnPath, 'utf-8')
    writeFileSync(workOxnPath, workOxnContent.replace('test goal', 'UPDATED goal'))

    // 第二次 validate
    const r = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(true)
    expect(r.data.code).toBe('OXN_WORK_LOCKED')
    expect((r.data.warnings as string[]).some((w) => w.includes('locked'))).toBe(true)
  })

  // ───────── idempotent ─────────

  test('重复 validate 是幂等的（blueprint 数量稳定、fileHash 不变）', async () => {
    await initProject()
    setupProject()
    setupWork('demo', ['a'])

    const r1 = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    const cert1 = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'), 'utf-8'))

    const r2 = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    const cert2 = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'demo', '.work'), 'utf-8'))

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    // 资产数量稳定
    expect(cert1.assets.blueprints.length).toBe(cert2.assets.blueprints.length)
    // fileHash 不变（同内容）
    expect(cert1.assets.blueprints[0].fileHash).toBe(cert2.assets.blueprints[0].fileHash)
    // createdAt 保留（同一次 lock 前的 validate 不重置）
    expect(cert1.createdAt).toBe(cert2.createdAt)
  })

  // ───────── 错误守卫 ─────────

  test('未 init → OXN_NO_PROJECT', async () => {
    const r = JSON.parse((await runCli(['work', 'validate', 'demo', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_NO_PROJECT')
  })

  test('work 不存在 → OXN_WORK_NOT_FOUND', async () => {
    await initProject()
    const r = JSON.parse((await runCli(['work', 'validate', 'ghost', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_WORK_NOT_FOUND')
  })

  test('work.oxn 无 Work 声明 → OXN_NO_WORK', async () => {
    await initProject()
    setupProject()
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'no-decl'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'works', 'no-decl', 'work.oxn'), '// just a comment\n')
    const r = JSON.parse((await runCli(['work', 'validate', 'no-decl', '--json'])).stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_NO_WORK')
  })
})
