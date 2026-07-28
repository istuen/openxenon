// =============================================================================
// work-ideal-data-flow-e2e.test.ts — v0.6.1 P4/P5/P7 新增 validator 黑盒 E2E 覆盖
//
// RFC v0.7.3-ideal-data-flow-rfc §4 P4/P5/P7 + ADR-0061 §D3/D4/D6
//   - P4 (D3): Task probe vs Blueprint slot.observe[] hard-check
//   - P5 (D4): Workflow slot DAG vs Task.deps DAG 闭包 hard-check
//   - P7 (D6): Work ## Refs legacy kind: domain 软警告
//
// Strategy: 黑盒跑 `bun <cliPath> ...`，用真实 .md fixture，断言 exit code + JSON 内容。
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { setupCliEnv, type CliEnv } from './helpers/run-cli'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let env: CliEnv

beforeEach(() => {
  env = setupCliEnv(CLI_PATH)
})

afterEach(() => {
  env.cleanup()
})

// ───────── Helper: 写最小可工作的 work fixture ─────────

interface SetupOpts {
  taskDeps?: string[] // task ## Tasks 下的 deps: [...]
  taskProbes?: string[] // task part 下的 - probe: @oxn/probes/<name>
  taskBoundary?: string // task ## Tasks 下的 boundary: <name>
  legacyDomainRef?: { name: string; ref: string } | null // ## Refs 下的 legacy kind: domain
}

async function setupWorkFixture(opts: SetupOpts = {}): Promise<void> {
  const { taskDeps = [], taskProbes = [], taskBoundary = 'dev', legacyDomainRef = null } = opts

  await env.initProject()

  // 复制项目根目录的 .openxenon/assets/blueprints + assets/domains + assets/stack
  // 让 E2E 跑真实 oxn-blueprint + 真实 domains + 真实 stack
  const realAssets = join(env.tmpDir, '..', '..', '..', '..', '.openxenon', 'assets')
  // 上面这一招不对路径不可靠；改用绝对路径 cwd 推断
  // 由于 env.tmpDir 在 /tmp/oxn-cli-e2e-<ts>-<rand> 下，而 cwd 是项目根
  // 直接从 process.cwd() 取项目根 → .openxenon/assets
  const projectRoot = process.cwd()
  const assetsRoot = join(projectRoot, '.openxenon', 'assets')
  const targetAssetsRoot = join(env.tmpDir, '.openxenon', 'assets')
  cpDirSync(assetsRoot, targetAssetsRoot)

  // work.md
  const workDir = join(env.tmpDir, '.openxenon', 'works', 'p457-fixture')
  mkdirSync(workDir, { recursive: true })

  // 双段格式：## Use 走 per-work-blueprints-merger 路径（modern Blueprint ref）
  //           ## Refs 走 work-refs 路径（P7 legacy domain 检测）
  const useSection = `### oxn-blueprint\n- kind: blueprint\n- ref: "@prj/blueprints/oxn-blueprint"\n`

  const refsSection = legacyDomainRef
    ? `### oxn-blueprint\n- kind: blueprint\n- ref: "@prj/blueprints/oxn-blueprint"\n\n### ${legacyDomainRef.name}\n- kind: domain\n- ref: "${legacyDomainRef.ref}"\n`
    : ''

  const taskProbeLines = taskProbes.map((p) => `  - probe: ${p}`).join('\n')

  const depsLine = taskDeps.length > 0 ? `- deps: [${taskDeps.join(', ')}]\n` : '- deps: []\n'

  const sections = [`## Context\n\n### main\n- goal: e2e\n- constraints: []\n`, `## Use\n\n${useSection}\n`]
  if (refsSection) sections.push(`## Refs\n\n${refsSection}\n`)
  sections.push(
    `## Tasks\n\n### step1\n- blueprint: oxn-blueprint\n- domain: oxn-engine-domain\n- boundary: ${taskBoundary}\n` +
      `${depsLine}` +
      `- part: implement\n` +
      `  - skill_context: |\n      placeholder\n` +
      `${taskProbeLines}\n`,
  )

  const workMd =
    `---\nentity: work\nversion: 0.7.0\nname: p457-fixture\n---\n` + `# Work: p457-fixture\n\n` + sections.join('')

  writeFileSync(join(workDir, 'work.md'), workMd)

  // task.md (with same task name)
  const taskDir = join(workDir, 'tasks', 'step1')
  mkdirSync(taskDir, { recursive: true })
  const taskProbeBlock = taskProbes.map((p) => `  - probe: ${p}`).join('\n')
  const taskMd =
    `---\nentity: task\nversion: 0.3.0\nname: step1\n---\n` +
    `# Task: step1\n\n## Parts\n\n### implement\n- skill_context: |\n    placeholder\n` +
    `${taskProbeBlock ? `${taskProbeBlock}\n` : ''}` +
    `## Refs\n- blueprint: oxn-blueprint\n- boundary: ${taskBoundary}\n- domain: oxn-engine-domain\n`
  writeFileSync(join(taskDir, 'task.md'), taskMd)
}

// 递归复制目录（src → dst）
import { cpSync, existsSync as _exists } from 'fs'
function cpDirSync(src: string, dst: string): void {
  if (!_exists(src)) return
  cpSync(src, dst, { recursive: true })
}

// ───────── P4 (D3): probe boundary check ─────────

describe('P4 (D3) — probe vs Blueprint slot observe[] hard-check', () => {
  test('合法 probe（在 slot.observe[]）→ validate 成功', async () => {
    // oxn-blueprint slot 'design' observe=['lint-check', 'ts-compiles']
    await setupWorkFixture({ taskProbes: ['@oxn/probes/lint-check'] })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
    expect(body.data.valid).toBe(true)
  })

  test('越界 probe（不在 slot.observe[]）→ exit 1 + code IAP_INTENT_PROBE_OUT_OF_BOUNDARY', async () => {
    // 'forbidden-probe' 不在 design slot.observe[] 中
    await setupWorkFixture({ taskProbes: ['@oxn/probes/forbidden-probe'] })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('IAP_INTENT_PROBE_OUT_OF_BOUNDARY')
    expect(body.error.context.violations).toHaveLength(1)
    expect(body.error.context.violations[0]).toMatchObject({
      taskName: 'step1',
      boundary: 'dev',
      probeName: 'forbidden-probe',
      allowedObserved: ['lint-check', 'ts-compiles'],
    })
  })

  test('无 probe → validate 成功（probe 检查为空跳过）', async () => {
    await setupWorkFixture({ taskProbes: [] })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
  })
})

// ───────── P5 (D4): DAG closure check + escape hatch ─────────

describe('P5 (D4) — Workflow.slot DAG vs Task.deps DAG closure', () => {
  test('合法 dep（同 slot 内 task 互依）→ validate 成功', async () => {
    // dev slot 的 deps=[]，deps=[] 表示在 dev phase 内（自己依赖自己允许）
    await setupWorkFixture({
      taskBoundary: 'dev',
      taskDeps: [], // 同 slot 边界，无外部依赖
    })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(0)
    expect(JSON.parse(r.stdout).ok).toBe(true)
  })

  test('越界 dep（引用 dev 的下游 slot）→ exit 1 + code IAP_INTENT_TASK_DAG_VIOLATES_SLOT', async () => {
    // dev 边界，deps=['doc'] — doc 是 dev 的下游（不在祖先闭包）
    await setupWorkFixture({
      taskBoundary: 'dev',
      taskDeps: ['doc'],
    })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('IAP_INTENT_TASK_DAG_VIOLATES_SLOT')
    expect(body.error.context.violations).toHaveLength(1)
    expect(body.error.context.violations[0]).toMatchObject({
      taskName: 'step1',
      boundary: 'dev',
      depName: 'doc',
      depResolvedSlot: 'doc',
      reason: 'dep_slot_not_in_task_slot_closure',
    })
  })

  test('越界 dep（unknown 名）→ exit 1 + dep_unknown', async () => {
    await setupWorkFixture({
      taskBoundary: 'dev',
      taskDeps: ['nonexistent-task-name'],
    })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('IAP_INTENT_TASK_DAG_VIOLATES_SLOT')
    expect(body.error.context.violations[0]?.reason).toBe('dep_unknown')
  })

  test('escape hatch: --skip-workflow-dag-check 跳过 DAG check → validate 成功', async () => {
    await setupWorkFixture({
      taskBoundary: 'dev',
      taskDeps: ['doc'], // 正常情况会触发 violation
    })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--skip-workflow-dag-check', '--json'])
    expect(r.exitCode).toBe(0)
    expect(JSON.parse(r.stdout).ok).toBe(true)
  })
})

// ───────── P7 (D6): legacy kind: domain warn ─────────

describe('P7 (D6) — Work ## Refs legacy kind: domain soft warning', () => {
  test('无 legacy ref → validate 成功 + 无 warning', async () => {
    await setupWorkFixture({ legacyDomainRef: null })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
    expect(body.data.warnings).toEqual([])
    expect(body.data.legacyDomainRefs).toBeUndefined()
  })

  test('legacy kind: domain → ok=true + warning OXN_WORK_LEGACY_DOMAIN_REF（不阻断）', async () => {
    await setupWorkFixture({
      legacyDomainRef: { name: 'LegacyProbe', ref: '@prj/domains/LegacyProbe' },
    })
    const r = await env.runCli(['work', 'validate', 'p457-fixture', '--json'])
    expect(r.exitCode).toBe(0) // 软警告不阻断
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
    expect(body.data.warnings).toHaveLength(1)
    expect(body.data.warnings[0]).toContain('OXN_WORK_LEGACY_DOMAIN_REF')
    expect(body.data.warnings[0]).toContain('LegacyProbe')
    expect(body.data.warnings[0]).toContain('@prj/domains/LegacyProbe')
    // 结构化字段也暴露
    expect(body.data.legacyDomainRefs).toHaveLength(1)
    expect(body.data.legacyDomainRefs[0]).toMatchObject({
      refName: 'LegacyProbe',
      ref: '@prj/domains/LegacyProbe',
    })
  })

  test('legacy ref 不阻断后续 lock 流程', async () => {
    await setupWorkFixture({
      legacyDomainRef: { name: 'LegacyProbe', ref: '@prj/domains/LegacyProbe' },
    })
    const lockR = await env.runCli(['work', 'lock', 'p457-fixture'])
    // lock 走的是不同路径，不依赖 validate.ok，但应该仍然成功（warning 不影响）
    // 因为 lock 跳过 validate 重检，只读 .work
    // 验证 lock 返回的输出不含 OXN_WORK_LEGACY_DOMAIN_REF 错误
    expect(lockR.exitCode).toBe(0)
  })
})

// ───────── P6 (D5): stack tools in context ─────────

describe('P6 (D5) — Stack.tools runtime injection to context', () => {
  test('oxn work context --context-mode full 输出含 ## Stack Tools 段', async () => {
    await setupWorkFixture({})
    // 先 validate（让 blueprintIR 写入）
    await env.runCli(['work', 'validate', 'p457-fixture'])
    const r = await env.runCli(['work', 'context', 'p457-fixture', '--task', 'step1', '--context-mode', 'full'])
    // 不论 lock 与否，context 应输出；可能因 lock-not-found 退出非 0
    // 我们只关心 human 输出中是否有 Stack Tools 段
    const allOut = r.stdout + r.stderr
    // 由于 work-context-builder 自身不依赖 lock（lockCheck=false on work.context 时由 CLI 处理）
    // 但我们的 CLI 在 work context 里仍然校验 planLock，可能导致 OXN_ALIGN_LOCK_NOT_FOUND
    // 这里我们检查 stderr/stdout 任一是否含 "Stack Tools"
    // 由于 step1 task boundary=design 在 oxn-blueprint 中，stackRefs 应被加载
    // 但 task-level context 是否注入 stackTools 取决于 boundary 域加载路径
    // 简化：先 lock 一次，再 context
    if (!existsSync(join(env.tmpDir, '.openxenon', 'works', 'p457-fixture', '.work.planLock'))) {
      await env.runCli(['work', 'lock', 'p457-fixture'])
    }
    const r2 = await env.runCli(['work', 'context', 'p457-fixture', '--task', 'step1', '--context-mode', 'full'])
    expect(r2.exitCode).toBe(0)
    expect(r2.stdout).toContain('## Stack Tools (7)')
  })
})
