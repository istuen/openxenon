import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-config-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}

describe('config-loader module', () => {
  test('loadOxnRc returns null when .oxnrc is absent', async () => {
    const { loadOxnRc } = await import('../commands/config-loader')
    const r = loadOxnRc(tmpDir)
    expect(r.config).toBeNull()
    expect(r.warning).toBeUndefined()
  })

  test('loadOxnRc parses a valid .oxnrc with leaderMode', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), JSON.stringify({ version: 1, leaderMode: 'mvp' }))
    const { loadOxnRc } = await import('../commands/config-loader')
    const r = loadOxnRc(tmpDir)
    expect(r.warning).toBeUndefined()
    expect(r.config?.leaderMode).toBe('mvp')
  })

  test('loadOxnRc returns warning on invalid JSON', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), '{ this is not json')
    const { loadOxnRc } = await import('../commands/config-loader')
    const r = loadOxnRc(tmpDir)
    expect(r.config).toBeNull()
    expect(r.warning).toContain('invalid JSON')
  })

  test('loadOxnRc returns warning on unsupported version', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), JSON.stringify({ version: 99 }))
    const { loadOxnRc } = await import('../commands/config-loader')
    const r = loadOxnRc(tmpDir)
    expect(r.config).toBeNull()
    expect(r.warning).toContain('unsupported version')
  })

  test('loadOxnRc returns warning on invalid leaderMode value', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), JSON.stringify({ version: 1, leaderMode: 'banana' }))
    const { loadOxnRc } = await import('../commands/config-loader')
    const r = loadOxnRc(tmpDir)
    expect(r.config).toBeNull()
    expect(r.warning).toContain('invalid leaderMode')
  })

  test('resolveLeaderMode priority: cli > env > project > default', async () => {
    const { resolveLeaderMode } = await import('../commands/config-loader')
    expect(resolveLeaderMode({}).mode).toBe('reference')
    expect(resolveLeaderMode({ projectConfig: { version: 1, leaderMode: 'mvp' } }).mode).toBe('mvp')
    expect(resolveLeaderMode({ envValue: 'mvp' }).mode).toBe('mvp')
    expect(resolveLeaderMode({ envValue: 'mvp', projectConfig: { version: 1, leaderMode: 'reference' } }).mode).toBe(
      'mvp',
    )
    expect(resolveLeaderMode({ cliFlag: 'reference', envValue: 'mvp' }).mode).toBe('reference')
    expect(resolveLeaderMode({ cliFlag: 'mvp', envValue: 'reference' }).mode).toBe('mvp')
  })

  test('normalizeLeaderMode accepts only reference | mvp', async () => {
    const { normalizeLeaderMode } = await import('../commands/config-loader')
    expect(normalizeLeaderMode('reference')).toBe('reference')
    expect(normalizeLeaderMode('MVP')).toBe('mvp')
    expect(normalizeLeaderMode('foo')).toBeNull()
    expect(normalizeLeaderMode('')).toBeNull()
    expect(normalizeLeaderMode(undefined)).toBeNull()
  })
})

describe('oxn config CLI', () => {
  test('config show on empty project defaults to reference', async () => {
    const { stdout, exitCode } = await runCli(['config', 'show', '--json'])
    expect(exitCode).toBe(0)
    const r = JSON.parse(stdout)
    expect(r.ok).toBe(true)
    expect(r.data.leaderMode).toBe('reference')
    expect(r.data.source).toBe('default')
  })

  test('config set leaderMode mvp writes .oxnrc', async () => {
    const { stdout, exitCode } = await runCli(['config', 'set', '--key', 'leaderMode', '--value', 'mvp', '--json'])
    expect(exitCode).toBe(0)
    const r = JSON.parse(stdout)
    expect(r.ok).toBe(true)
    expect(r.data.value).toBe('mvp')
    const onDisk = JSON.parse(readFileSync(join(tmpDir, '.oxnrc'), 'utf-8'))
    expect(onDisk).toEqual({ version: 1, leaderMode: 'mvp' })
  })

  test('config set with invalid value returns OXN_CONFIG_VALUE_INVALID', async () => {
    const { stdout, exitCode } = await runCli(['config', 'set', '--key', 'leaderMode', '--value', 'banana', '--json'])
    // v1.0 (Phase 3): outputError 设置 process.exitCode = 1 (subcommand 报错正确退出码)
    expect(exitCode).toBe(1)
    const r = JSON.parse(stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_CONFIG_VALUE_INVALID')
  })

  test('config set with unsupported key returns OXN_CONFIG_KEY_UNSUPPORTED', async () => {
    const { stdout, exitCode } = await runCli(['config', 'set', '--key', 'bogusKey', '--value', 'x', '--json'])
    // v1.0 (Phase 3): outputError 设置 process.exitCode = 1
    expect(exitCode).toBe(1)
    const r = JSON.parse(stdout)
    expect(r.ok).toBe(false)
    expect(r.error.code).toBe('OXN_CONFIG_KEY_UNSUPPORTED')
  })

  test('config show reflects .oxnrc project source', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), JSON.stringify({ version: 1, leaderMode: 'mvp' }))
    const { stdout, exitCode } = await runCli(['config', 'show', '--json'])
    expect(exitCode).toBe(0)
    const r = JSON.parse(stdout)
    expect(r.data.leaderMode).toBe('mvp')
    expect(r.data.source).toBe('project')
  })
})

describe('leader routing via .oxnrc', () => {
  test('config show reports the resolved leader mode and source', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), JSON.stringify({ version: 1, leaderMode: 'mvp' }))
    const { stdout, exitCode } = await runCli(['config', 'show', '--json'])
    expect(exitCode).toBe(0)
    const r = JSON.parse(stdout)
    expect(r.data.leaderMode).toBe('mvp')
    expect(r.data.source).toBe('project')
  })

  test('OXN_LEADER_MODE env beats .oxnrc', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), JSON.stringify({ version: 1, leaderMode: 'reference' }))
    const proc = Bun.spawn(['bun', CLI_PATH, 'config', 'show', '--json'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1', OXN_LEADER_MODE: 'mvp' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const stdout = await new Response(proc.stdout).text()
    const exitCode = await proc.exited
    expect(exitCode).toBe(0)
    const r = JSON.parse(stdout)
    expect(r.data.leaderMode).toBe('mvp')
    expect(r.data.source).toBe('env')
  })

  test('--leader-mode CLI flag beats env and .oxnrc', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), JSON.stringify({ version: 1, leaderMode: 'reference' }))
    const proc = Bun.spawn(['bun', CLI_PATH, 'config', 'show', '--json'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1', OXN_LEADER_MODE: 'reference' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    // We can't pass --leader-mode to config show; we have to put it before
    // any subcommand. The leader resolution still happens in the same way,
    // so we use `oxn --leader-mode=mvp config show --json` to verify the
    // CLI flag takes precedence over env.
    const proc2 = Bun.spawn(['bun', CLI_PATH, '--leader-mode=mvp', 'config', 'show', '--json'], {
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1', OXN_LEADER_MODE: 'reference' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    void proc
    const stdout = await new Response(proc2.stdout).text()
    const exitCode = await proc2.exited
    expect(exitCode).toBe(0)
    const r = JSON.parse(stdout)
    expect(r.data.leaderMode).toBe('mvp')
    expect(r.data.source).toBe('cli')
  })

  test('mvp mode surfaces a warning on broken .oxnrc but still falls through', async () => {
    writeFileSync(join(tmpDir, '.oxnrc'), '{ broken')
    const { stdout, exitCode } = await runCli(['config', 'show', '--json'])
    expect(exitCode).toBe(0)
    const r = JSON.parse(stdout)
    expect(r.data.warning).toContain('invalid JSON')
    expect(r.data.leaderMode).toBe('reference')
    expect(r.data.source).toBe('default')
  })
})
