import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-leader-'))
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

describe('unified leader (single entry) e2e', () => {
  test('full leader new -> run -> submit -> status -> frozen flow', async () => {
    // init
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    // Set up a blueprint for leader new to consume
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)

    // leader new
    const newResult = JSON.parse((await runCli(['leader', 'new', '--name', 'tiny', '--json'])).stdout)
    expect(newResult.ok).toBe(true)
    expect(newResult.data.workName).toBe('tiny')
    expect(newResult.data.files.work).toContain('tiny/work.oxn')
    const workFile = join(tmpDir, '.openxenon', 'works', 'tiny', 'work.oxn')
    expect(existsSync(workFile)).toBe(true)
    const workContent = readFileSync(workFile, 'utf-8')
    expect(workContent).toContain('work "tiny"')
    expect(workContent).toContain('part "alpha" align "Alpha"')
    expect(workContent).toContain('part "beta" align "Beta"')

    // leader run
    const runResult = JSON.parse((await runCli(['leader', 'run', '--work-file', workFile, '--json'])).stdout)
    expect(runResult.ok).toBe(true)
    expect(runResult.data.workName).toBe('tiny')
    expect(runResult.data.overallStatus).toBe('running')
    expect(runResult.data.parts.length).toBe(2)
    expect(runResult.data.parts[0].partName).toBe('alpha')
    expect(runResult.data.parts[0].status).toBe('running')
    const statePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'state.json')
    expect(existsSync(statePath)).toBe(true)
    const tracePath = join(tmpDir, '.openxenon', 'works', 'tiny', 'work-trace.jsonl')
    expect(existsSync(tracePath)).toBe(true)

    // leader submit (advances past alpha)
    const submit1 = JSON.parse((await runCli(['leader', 'submit', '--work-name', 'tiny', '--json'])).stdout)
    expect(submit1.ok).toBe(true)
    expect(submit1.data.overallStatus).toBe('running')
    expect(submit1.data.parts.find((p: { partName: string }) => p.partName === 'alpha').status).toBe('passed')
    expect(submit1.data.parts.find((p: { partName: string }) => p.partName === 'beta').status).toBe('running')
    expect(submit1.data.skillContext.currentFocus).toBe('beta')

    // leader submit (advances past beta, work should pass)
    const submit2 = JSON.parse((await runCli(['leader', 'submit', '--work-name', 'tiny', '--json'])).stdout)
    expect(submit2.ok).toBe(true)
    expect(submit2.data.overallStatus).toBe('passed')
    expect(submit2.data.parts.every((p: { status: string }) => p.status === 'passed')).toBe(true)
    expect(submit2.data.frozen).not.toBeNull()
    const frozenPath = join(tmpDir, '.openxenon', 'works', 'tiny', 'frozen.json')
    expect(existsSync(frozenPath)).toBe(true)
    const frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(frozen.workName).toBe('tiny')
    expect(frozen.trace).toEqual(['alpha', 'beta'])

    // leader status (after pass)
    const status = JSON.parse((await runCli(['leader', 'status', '--work-name', 'tiny', '--json'])).stdout)
    expect(status.ok).toBe(true)
    expect(status.data.workName).toBe('tiny')
    expect(status.data.overallStatus).toBe('passed')
    // SkillReport.parts[] — each part carries the status field
    expect(status.data.parts.every((p: { status: string }) => p.status === 'passed')).toBe(true)
    const partNames = status.data.parts.map((p: { partName: string }) => p.partName)
    expect(partNames).toEqual(['alpha', 'beta'])
  })

  test('unified mode generates work.oxn with inline Part bodies (no parts.oxn file)', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)
    await runCli(['leader', 'new', '--name', 'tiny', '--json'])
    const workDir = join(tmpDir, '.openxenon', 'works', 'tiny')
    expect(existsSync(join(workDir, 'work.oxn'))).toBe(true)
    expect(existsSync(join(workDir, 'parts.oxn'))).toBe(false)
  })

  test('reference-style work.oxn with inline part props + ref parses through run', async () => {
    // Verify that reference-style work.oxn (no skill block, with ref on parts)
    // also works with the unified leader.
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    // Use a reference-style work.oxn directly
    mkdirSync(join(tmpDir, '.openxenon', 'works', 'refstyle'), { recursive: true })
    const refStyleWork = `work "refstyle" ref "@oxn/blueprints/std" {
  part "alpha" align "Alpha" ref "@oxn/parts/alpha" {
    prop "x" = "y"
  }
}

part "alpha" align "Alpha" ref "@oxn/parts/alpha" {
  description = "alpha part"
  observe = ["ShellExec"]
}
`
    const workFile = join(tmpDir, '.openxenon', 'works', 'refstyle', 'work.oxn')
    writeFileSync(workFile, refStyleWork)
    const runResult = JSON.parse((await runCli(['leader', 'run', '--work-file', workFile, '--json'])).stdout)
    expect(runResult.ok).toBe(true)
    expect(runResult.data.workName).toBe('refstyle')
    // Part spec is preserved including the ref field
    expect(runResult.data.parts[0].ref).toBe('@oxn/parts/alpha')
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
    const probeWork = `work "probework" ref "@oxn/blueprints/std" {
  part "alpha" align "Alpha" ref "@oxn/parts/alpha" {
    prop "x" = "y"
  }
}

part "alpha" align "Alpha" ref "@oxn/parts/alpha" {
  description = "alpha part"
  observe = ["ShellExec"]
}
`
    const workFile = join(tmpDir, '.openxenon', 'works', 'probework', 'work.oxn')
    writeFileSync(workFile, probeWork)
    await runCli(['leader', 'run', '--work-file', workFile, '--json'])
    const submitResult = JSON.parse(
      (await runCli(['leader', 'submit', '--work-name', 'probework', '--run-probes', '--json'])).stdout,
    )
    expect(submitResult.ok).toBe(true)
    // The probe should appear in per-part probeResults
    expect(submitResult.data.parts[0].probeResults.length).toBeGreaterThan(0)
    expect(submitResult.data.parts[0].probeResults[0].probe).toBe('part-reachable')
    expect(submitResult.data.parts[0].probeResults[0].passed).toBe(true)

    // state.json should also reflect the probe
    const state = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'works', 'probework', 'state.json'), 'utf-8'))
    const partExec = state.partExecutions.find((e: { partName: string }) => e.partName === 'alpha')
    expect(partExec.probes.length).toBeGreaterThan(0)
    expect(partExec.status).toBe('passed')
  })

  test('reference start/next/list aliases route to the unified leader', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    // leader list returns builtin templates (reference parity)
    const listResult = JSON.parse((await runCli(['leader', 'list', '--json'])).stdout)
    expect(listResult.ok).toBe(true)
    expect(listResult.data.templates.length).toBeGreaterThan(0)

    // leader start (alias) copies a builtin ldr-*.oxn template
    const startResult = JSON.parse(
      (await runCli(['leader', 'start', '--work-name', 'verify-intent-align', '--json'])).stdout,
    )
    expect(startResult.ok).toBe(true)
    expect(existsSync(join(tmpDir, '.openxenon', 'works', 'verify-intent-align', 'work.oxn'))).toBe(true)
  })
})
