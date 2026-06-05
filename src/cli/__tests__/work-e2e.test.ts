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

describe('oxn work end-to-end (v0.1 hard-switch)', () => {
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
    const createResult = JSON.parse(
      (await runCli(['work', 'create', '--work-id', 'tiny', '--blueprint', 'tiny', '--json'])).stdout,
    )
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
    const runResult = JSON.parse((await runCli(['work', 'run', '--work-file', workFile, '--json'])).stdout)
    expect(runResult.ok).toBe(true)
    expect(runResult.data.workName).toBe('tiny')
    expect(runResult.data.overallStatus).toBe('running')
    expect(runResult.data.parts.length).toBe(2)
    expect(runResult.data.parts[0].partName).toBe('alpha')
    expect(runResult.data.parts[0].status).toBe('running')
    expect(runResult.data.tasks.length).toBe(2)
    expect(runResult.data.tasks[0].taskName).toBe('alpha')
    expect(runResult.data.tasks[0].status).toBe('running')
    const statePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'state.json')
    expect(existsSync(statePath)).toBe(true)
    const tracePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'work-trace.jsonl')
    expect(existsSync(tracePath)).toBe(true)

    // work status (initial)
    const initialStatus = JSON.parse((await runCli(['work', 'status', '--work-name', 'tiny', '--json'])).stdout)
    expect(initialStatus.ok).toBe(true)
    expect(initialStatus.data.workName).toBe('tiny')
    expect(initialStatus.data.workspace.taskCount).toBe(2)
    expect(initialStatus.data.tasks.length).toBe(2)
    expect(initialStatus.data.tasks[0].taskName).toBe('alpha')
    const taskStatePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha', 'state.json')
    expect(existsSync(taskStatePath)).toBe(true)

    // work submit (v0.1: --task 必填)
    const submit1 = JSON.parse(
      (await runCli(['work', 'submit', '--work-name', 'tiny', '--task', 'alpha', '--json'])).stdout,
    )
    expect(submit1.ok).toBe(true)
    expect(submit1.data.taskStatus).toBe('passed')
    expect(submit1.data.completedParts).toEqual(['build'])
    expect(submit1.data.frozen).toContain('tasks/alpha/frozen.json')

    // 验证 alpha frozen.json
    const frozenPath = join(tmpDir, '.openxenon', 'works', 'tiny', 'tasks', 'alpha', 'frozen.json')
    expect(existsSync(frozenPath)).toBe(true)
    const frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(frozen.taskName).toBe('alpha')
    expect(frozen.trace).toEqual(['build'])

    // 完成 beta
    const submit2 = JSON.parse(
      (await runCli(['work', 'submit', '--work-name', 'tiny', '--task', 'beta', '--json'])).stdout,
    )
    expect(submit2.ok).toBe(true)
    expect(submit2.data.taskStatus).toBe('passed')

    // work status (after pass)
    const status = JSON.parse((await runCli(['work', 'status', '--work-name', 'tiny', '--json'])).stdout)
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
    await runCli(['work', 'create', '--work-id', 'tiny', '--blueprint', 'tiny', '--json'])
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
    const runResult = JSON.parse((await runCli(['work', 'run', '--work-file', workFile, '--json'])).stdout)
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
    await runCli(['work', 'run', '--work-file', workFile, '--json'])
    const submitResult = JSON.parse(
      (await runCli(['work', 'submit', '--work-name', 'probework', '--task', 'alpha', '--run-probes', '--json']))
        .stdout,
    )
    expect(submitResult.ok).toBe(true)
    const taskState = JSON.parse(
      readFileSync(join(tmpDir, '.openxenon', 'works', 'probework', 'tasks', 'alpha', 'state.json'), 'utf-8'),
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
    await runCli(['work', 'create', '--work-id', 'tiny', '--blueprint', 'tiny', '--json'])
    const addTask = JSON.parse(
      (
        await runCli([
          'work',
          'add-task',
          '--work',
          'tiny',
          '--task-name',
          'gamma',
          '--blueprint',
          'tiny',
          '--json',
        ])
      ).stdout,
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

    const ctx = JSON.parse(
      (await runCli(['work', 'context', '--work', 'explore-dsl', '--task', 'explore', '--json'])).stdout,
    )
    expect(ctx.ok).toBe(true)
    expect(ctx.data.injectedDomains.length).toBe(1)
    expect(ctx.data.injectedDomains[0].name).toBe('DSLContext')
    expect(ctx.data.allowedLanguage.banned).toContain('ParserImpl')
    expect(ctx.data.isolationNotice).toContain('不可见')
  })
})
