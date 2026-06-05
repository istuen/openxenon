import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-work-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
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

const SIMPLE_BLUEPRINT = `// Minimal blueprint with 2 slots for fast e2e
blueprint "tiny" {
  version = 1
  description = "tiny test blueprint"
  slot "alpha" { }
  slot "beta" { }
}
`

const SINGLE_SLOT_BLUEPRINT = `// Single slot blueprint for NV-1 / NV-2 tests
blueprint "single" {
  version = 1
  description = "single slot"
  slot "alpha" { }
}
`

describe('oxn work end-to-end (v0.1 hard-switch + naming alignment)', () => {
  test('full work create -> add-task -> run -> submit -> status -> frozen flow', async () => {
    // init
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    // Set up a blueprint for work create to consume
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)

    // work create (with --blueprint renders work.oxn with task blocks)
    const createResult = JSON.parse((await runCli(['work', 'create', 'tiny', '--blueprint', 'tiny', '--json'])).stdout)
    expect(createResult.ok).toBe(true)
    expect(createResult.data.workName).toBe('tiny')
    expect(createResult.data.files.work).toContain('tiny/work.oxn')
    const workFile = join(tmpDir, '.openxenon', 'works', 'tiny', 'work.oxn')
    expect(existsSync(workFile)).toBe(true)
    const workContent = readFileSync(workFile, 'utf-8')
    expect(workContent).toContain('work "tiny"')
    expect(workContent).toContain('blueprint "tiny"')
    expect(workContent).toContain('task "alpha"')

    // v0.1-final: work run 校验 task.oxn 存在 — 必须先创建
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha', 'task.oxn'),
      `task "alpha" {
  blueprint "tiny"
  part "build" {
    skill_context = "alpha test"
  }
}
`,
    )
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'beta'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'beta', 'task.oxn'),
      `task "beta" {
  blueprint "tiny"
  part "test" {
    skill_context = "beta test"
  }
}
`,
    )

    // work run
    const runResult = JSON.parse((await runCli(['work', 'run', 'tiny', '--json'])).stdout)
    expect(runResult.ok).toBe(true)
    expect(runResult.data.workName).toBe('tiny')
    expect(runResult.data.overallStatus).toBe('running')
    expect(runResult.data.parts.length).toBe(2)
    expect(runResult.data.parts[0].partName).toBe('alpha')
    expect(runResult.data.parts[0].status).toBe('running')
    expect(runResult.data.tasks.length).toBe(2)
    expect(runResult.data.tasks[0].taskName).toBe('alpha')
    expect(runResult.data.tasks[0].status).toBe('running')
    // 新命名范式
    const workStatePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'work-state.json')
    expect(existsSync(workStatePath)).toBe(true)
    const workTracePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'work-trace.jsonl')
    expect(existsSync(workTracePath)).toBe(true)
    // 旧名应该不存在
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'tiny', 'state.json'))).toBe(false)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'tiny', 'workspace.json'))).toBe(false)

    // work status (initial)
    const initialStatus = JSON.parse((await runCli(['work', 'status', 'tiny', '--json'])).stdout)
    expect(initialStatus.ok).toBe(true)
    expect(initialStatus.data.workName).toBe('tiny')
    expect(initialStatus.data.workspace.taskCount).toBe(2)
    expect(initialStatus.data.tasks.length).toBe(2)
    expect(initialStatus.data.tasks[0].taskName).toBe('alpha')
    const taskStatePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha', 'task-state.json')
    expect(existsSync(taskStatePath)).toBe(true)
    // 旧名应该不存在
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha', 'state.json'))).toBe(false)

    // work submit (v0.1: --task 必填，<name> positional)
    const submit1 = JSON.parse((await runCli(['work', 'submit', 'tiny', '--task', 'alpha', '--json'])).stdout)
    expect(submit1.ok).toBe(true)
    expect(submit1.data.taskStatus).toBe('passed')
    expect(submit1.data.completedParts).toEqual(['build'])
    expect(submit1.data.taskFrozen).toContain('tasks/alpha/task-frozen.json')

    // 验证 alpha task-frozen.json（新名）
    const taskFrozenPath = join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha', 'task-frozen.json')
    expect(existsSync(taskFrozenPath)).toBe(true)
    const taskFrozen = JSON.parse(readFileSync(taskFrozenPath, 'utf-8'))
    expect(taskFrozen.taskName).toBe('alpha')
    expect(taskFrozen.trace).toEqual(['build'])

    // task-trace.jsonl 验证
    const taskTracePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha', 'task-trace.jsonl')
    expect(existsSync(taskTracePath)).toBe(true)

    // 完成 beta
    const submit2 = JSON.parse((await runCli(['work', 'submit', 'tiny', '--task', 'beta', '--json'])).stdout)
    expect(submit2.ok).toBe(true)
    expect(submit2.data.taskStatus).toBe('passed')
    // 整个 work 完成了 → work-frozen.json 也应该生成
    expect(submit2.data.workFrozen).toContain('tiny/work-frozen.json')
    const workFrozenPath = join(tmpDir, '.openxenon', 'works', 'tiny', 'work-frozen.json')
    expect(existsSync(workFrozenPath)).toBe(true)

    // work status (after pass)
    const status = JSON.parse((await runCli(['work', 'status', 'tiny', '--json'])).stdout)
    expect(status.ok).toBe(true)
    expect(status.data.workName).toBe('tiny')
    expect(status.data.workspace.status).toBe('passed')
    expect(status.data.tasks.length).toBe(2)
    expect(status.data.tasks.every((t: { status: string }) => t.status === 'passed')).toBe(true)
  })

  test('work create with --blueprint generates work.oxn with inline task blocks', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)
    await runCli(['work', 'create', 'tiny', '--blueprint', 'tiny', '--json'])
    const workDir = join(tmpDir, '.openxenon', 'works', 'tiny')
    expect(existsSync(join(workDir, 'work.oxn'))).toBe(true)
  })

  test('v0.1 work.oxn with use_blueprint + task parses through run', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    mkdirSync(join(tmpDir, '.openxenon', 'works', 'refstyle'), { recursive: true })
    const refStyleWork = `work "refstyle" {
  blueprint "std" ref "@prj/blueprints/std";

  task "alpha" {
    blueprint "std"
    part "slot-name" {
      skill_context = "TODO: AI 执行指令"
    }
  }
}
`
    const workFile = join(tmpDir, '.openxenon', 'works', 'refstyle', 'work.oxn')
    writeFileSync(workFile, refStyleWork)
    const taskDir = join(tmpDir, '.openxenon', 'works', 'refstyle', 'tasks', 'alpha')
    mkdirSync(taskDir, { recursive: true })
    writeFileSync(
      join(taskDir, 'task.oxn'),
      `task "alpha" {
  blueprint "std"
  part "build" {
    skill_context = "alpha test"
  }
}
`,
    )
    const runResult = JSON.parse((await runCli(['work', 'run', 'refstyle', '--json'])).stdout)
    expect(runResult.ok).toBe(true)
    expect(runResult.data.workName).toBe('refstyle')
    expect(runResult.data.parts[0].partName).toBe('alpha')
  })

  test('--run-probes runs a probe and persists it into partExecutions', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    mkdirSync(join(tmpDir, '.openxenon', 'works', 'probework'), { recursive: true })
    const probeWork = `work "probework" {
  blueprint "std" ref "@prj/blueprints/std";

  task "alpha" {
    blueprint "std"
    part "slot-name" {
      skill_context = "probe test"
    }
  }
}
`
    const workFile = join(tmpDir, '.openxenon', 'works', 'probework', 'work.oxn')
    writeFileSync(workFile, probeWork)
    const taskDir = join(tmpDir, '.openxenon', 'works', 'probework', 'tasks', 'alpha')
    mkdirSync(taskDir, { recursive: true })
    writeFileSync(
      join(taskDir, 'task.oxn'),
      `task "alpha" {
  blueprint "std"
  part "build" {
    skill_context = "probe test"
  }
}
`,
    )
    await runCli(['work', 'run', 'probework', '--json'])
    const submitResult = JSON.parse(
      (await runCli(['work', 'submit', 'probework', '--task', 'alpha', '--run-probes', '--json'])).stdout,
    )
    expect(submitResult.ok).toBe(true)
    // 新名 task-state.json
    const taskState = JSON.parse(
      readFileSync(join(tmpDir, '.openxenon', 'works', 'probework', 'tasks', 'alpha', 'task-state.json'), 'utf-8'),
    )
    const partExec = (taskState.partExecutions ?? []).find((e: { partName: string }) => e.partName === 'build')
    expect(partExec).toBeDefined()
    expect(partExec.status).toBe('passed')
  })

  test('work add-task creates task.oxn under work tasks dir', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)
    await runCli(['work', 'create', 'tiny', '--blueprint', 'tiny', '--json'])
    const addTask = JSON.parse(
      (await runCli(['work', 'add-task', 'tiny', '--task', 'gamma', '--blueprint', 'tiny', '--json'])).stdout,
    )
    expect(addTask.ok).toBe(true)
    expect(addTask.data.taskName).toBe('gamma')
    expect(addTask.data.path).toContain('tasks/gamma/task.oxn')
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'gamma', 'task.oxn'))).toBe(true)
  })

  test('work context returns task-isolated injected domains', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    // Domain
    mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'domains', 'dsl-context.oxn'),
      `domain "DSLContext" {
  description = "OXN DSL 限界上下文"
  term { "Grammar": "Langium 语法定义" }
  ban { "ParserImpl" }
  invariant { "oxn.langium 是 DSL 的唯一权威来源" }
}
`,
    )

    // Blueprint
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)

    // Work
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'explore-dsl'), { recursive: true })
    const workFile = join(tmpDir, '.openxenon', 'works', 'explore-dsl', 'work.oxn')
    writeFileSync(
      workFile,
      `work "explore-dsl" {
  context {
    goal = "探索 OXN DSL 语法";
    loop_policy { max_iterations = 3 }
  }
  domain "DSLContext" ref "@prj/domains/dsl-context";
  blueprint "tiny" ref "@prj/blueprints/tiny";
  task "explore" {
    domain "DSLContext"
    blueprint "tiny"
    deps = []
    part "alpha" { skill_context = "explore" }
  }
}
`,
    )

    // task.oxn with explicit domain
    const taskDir = join(tmpDir, '.openxenon', 'works', 'explore-dsl', 'tasks', 'explore')
    mkdirSync(taskDir, { recursive: true })
    writeFileSync(
      join(taskDir, 'task.oxn'),
      `task "explore" {
  blueprint "tiny"
  domain "DSLContext"
  part "alpha" { skill_context = "explore" }
}
`,
    )

    const ctx = JSON.parse((await runCli(['work', 'context', 'explore-dsl', '--task', 'explore', '--json'])).stdout)
    expect(ctx.ok).toBe(true)
    expect(ctx.data.injectedDomains.length).toBe(1)
    expect(ctx.data.injectedDomains[0].name).toBe('DSLContext')
    expect(ctx.data.allowedLanguage.banned).toContain('ParserImpl')
    expect(ctx.data.isolationNotice).toContain('不可见')
  })

  // ---------------------------------------------------------------------------
  // 新增测试：NV-1 / NV-2 守卫
  // ---------------------------------------------------------------------------

  test('NV-1: add-task is rejected after work run is called', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'single.oxn'), SINGLE_SLOT_BLUEPRINT)
    await runCli(['work', 'create', 'single', '--blueprint', 'single', '--json'])
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha', 'task.oxn'),
      `task "alpha" {
  blueprint "single"
  part "build" { skill_context = "test" }
}
`,
    )
    await runCli(['work', 'run', 'single', '--json'])

    // 此时 work-state.json 已存在 → add-task 应被 NV-1 守卫拒绝
    const addTask = JSON.parse(
      (await runCli(['work', 'add-task', 'single', '--task', 'gamma', '--blueprint', 'single', '--json'])).stdout,
    )
    expect(addTask.ok).toBe(false)
    expect(addTask.error.code).toBe('OXN_WORK_ALREADY_RUNNING')
  })

  test('NV-1: edit-task is rejected after work run is called', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'single.oxn'), SINGLE_SLOT_BLUEPRINT)
    await runCli(['work', 'create', 'single', '--blueprint', 'single', '--json'])
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha', 'task.oxn'),
      `task "alpha" {
  blueprint "single"
  context { objective = "test" }
  part "build" { skill_context = "test" }
}
`,
    )
    await runCli(['work', 'run', 'single', '--json'])

    const editTask = JSON.parse(
      (await runCli(['work', 'edit-task', 'single', '--task', 'alpha', '--objective', 'changed', '--json'])).stdout,
    )
    expect(editTask.ok).toBe(false)
    expect(editTask.error.code).toBe('OXN_WORK_ALREADY_RUNNING')
  })

  test('NV-1: delete-task is rejected after work run is called', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'single.oxn'), SINGLE_SLOT_BLUEPRINT)
    await runCli(['work', 'create', 'single', '--blueprint', 'single', '--json'])
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha', 'task.oxn'),
      `task "alpha" {
  blueprint "single"
  part "build" { skill_context = "test" }
}
`,
    )
    await runCli(['work', 'run', 'single', '--json'])

    const deleteTask = JSON.parse(
      (await runCli(['work', 'delete-task', 'single', '--task', 'alpha', '--force', '--json'])).stdout,
    )
    expect(deleteTask.ok).toBe(false)
    expect(deleteTask.error.code).toBe('OXN_WORK_ALREADY_RUNNING')
  })

  test('NV-2: submit is rejected before work run is called', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'single.oxn'), SINGLE_SLOT_BLUEPRINT)
    await runCli(['work', 'create', 'single', '--blueprint', 'single', '--json'])
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'works', 'single', 'tasks', 'alpha', 'task.oxn'),
      `task "alpha" {
  blueprint "single"
  part "build" { skill_context = "test" }
}
`,
    )

    // work-state.json 不存在 → submit 应被 NV-2 守卫拒绝
    const submit = JSON.parse((await runCli(['work', 'submit', 'tiny', '--task', 'alpha', '--json'])).stdout)
    expect(submit.ok).toBe(false)
    expect(submit.error.code).toBe('OXN_WORK_NOT_STARTED')
  })
})
