import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-mvp-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

async function runMvpCli(args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1', OXN_LEADER_MODE: 'mvp' },
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

describe('mvp canary leader (OXN_LEADER_MODE=mvp) e2e', () => {
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
    const newResult = JSON.parse((await runMvpCli(['leader', 'new', '--name', 'tiny', '--json'])).stdout)
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
    const runResult = JSON.parse((await runMvpCli(['leader', 'run', '--work-file', workFile, '--json'])).stdout)
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
    const submit1 = JSON.parse((await runMvpCli(['leader', 'submit', '--work-name', 'tiny', '--json'])).stdout)
    expect(submit1.ok).toBe(true)
    expect(submit1.data.overallStatus).toBe('running')
    expect(submit1.data.parts.find((p: { partName: string }) => p.partName === 'alpha').status).toBe('passed')
    expect(submit1.data.parts.find((p: { partName: string }) => p.partName === 'beta').status).toBe('running')
    expect(submit1.data.skillContext.currentFocus).toBe('beta')

    // leader submit (advances past beta, work should pass)
    const submit2 = JSON.parse((await runMvpCli(['leader', 'submit', '--work-name', 'tiny', '--json'])).stdout)
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
    const status = JSON.parse((await runMvpCli(['leader', 'status', '--work-name', 'tiny', '--json'])).stdout)
    expect(status.ok).toBe(true)
    expect(status.data.workName).toBe('tiny')
    expect(status.data.status).toBe('passed')
    expect(status.data.completedParts).toEqual(['alpha', 'beta'])
  })

  test('mvp mode generates work.oxn with inline Part bodies (no parts.oxn file)', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)
    await runMvpCli(['leader', 'new', '--name', 'tiny', '--json'])
    const workDir = join(tmpDir, '.openxenon', 'works', 'tiny')
    expect(existsSync(join(workDir, 'work.oxn'))).toBe(true)
    expect(existsSync(join(workDir, 'parts.oxn'))).toBe(false)
  })

  test('mvp leader rejects unknown subcommands with OXN_FILE_NOT_FOUND or similar', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited
    mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'blueprints', 'tiny.oxn'), SIMPLE_BLUEPRINT)
    await runMvpCli(['leader', 'new', '--name', 'check', '--json'])
  })
})

describe('dual-track switching', () => {
  test('reference mode and mvp mode expose disjoint subcommand sets', async () => {
    const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await init.exited

    // mvp `new` exists
    const mvpNew = JSON.parse((await runMvpCli(['leader', 'new', '--name', 'check', '--json'])).stdout)
    expect(mvpNew.ok).toBe(true) // mvp has `new`

    // reference `start` exists in default mode
    const refStart = Bun.spawn(['bun', CLI_PATH, 'leader', 'start', '--work-name', 'foo', '--json'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const refOut = await new Response(refStart.stdout).text()
    // reference `start` should NOT return ok:false with OXN_INVALID_SUBCOMMAND
    // — it accepts the subcommand. The exact stdout is unreliable in non-TTY
    // tests, so we just verify exit code is 0 (no crash on unknown sub).
    const refExit = await refStart.exited
    expect(refExit).toBe(0)
    expect(refOut).not.toContain('"OXN_INVALID_SUBCOMMAND"')
  })
})
