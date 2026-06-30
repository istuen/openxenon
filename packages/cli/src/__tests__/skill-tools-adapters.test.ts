// =============================================================================
// skill-tools-adapters.test.ts — v0.1.3
//
// 覆盖 v0.1.3 多 AI 助手 Skill 分发（adapters 抽象）：
//   1.  oxn init 默认 → 3 套目录全建（.opencode/ + .claude/ + .agents/）
//   2.  oxn init --tools opencode → 只建 .opencode/
//   3.  oxn init --without-tools claude → 跳过 .claude/
//   4.  oxn init --tools bad-id    → 报错 OXN_INVALID_TOOL
//   5.  config.tools.enabled 持久化后 init 收敛到白名单
//   6.  oxn install-skill (v0.1.3 保留)
//   7.  oxn config show 输出含 tools 行
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string
let savedHome: string | undefined

interface CliResult {
  stdout: string
  stderr: string
  exitCode: number
}

async function runCli(args: string[], cwd: string = tmpDir): Promise<CliResult> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1', HOME: tmpDir },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}

function parseJsonOrNull(s: string): any {
  try {
    return JSON.parse(s.trim())
  } catch {
    return null
  }
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-tools-'))
  savedHome = process.env.HOME
  process.env.HOME = tmpDir
})

afterEach(() => {
  if (savedHome !== undefined) process.env.HOME = savedHome
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('oxn init --tools (v0.1.3 多 AI 助手分发)', () => {
  test('1. 默认 init → 3 套目录全建', async () => {
    const r = await runCli(['init', '--json'])
    expect(r.exitCode).toBe(0)
    for (const id of ['opencode', 'claude', 'agents']) {
      const dir = join(tmpDir, `.${id}`, 'skills')
      expect(existsSync(dir)).toBe(true)
    }
    const json = parseJsonOrNull(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.tools.sort()).toEqual(['agents', 'claude', 'opencode'])
  })

  test('2. init --tools opencode → 只建 .opencode/', async () => {
    const r = await runCli(['init', '--tools', 'opencode', '--json'])
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(tmpDir, '.opencode', 'skills'))).toBe(true)
    expect(existsSync(join(tmpDir, '.claude', 'skills'))).toBe(false)
    expect(existsSync(join(tmpDir, '.agents', 'skills'))).toBe(false)
  })

  test('3. init --without-tools claude → 跳过 .claude/', async () => {
    const r = await runCli(['init', '--without-tools', 'claude', '--json'])
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(tmpDir, '.opencode', 'skills'))).toBe(true)
    expect(existsSync(join(tmpDir, '.claude', 'skills'))).toBe(false)
    expect(existsSync(join(tmpDir, '.agents', 'skills'))).toBe(true)
  })

  test('4. init --tools bad-id → 报错 OXN_INVALID_TOOL', async () => {
    const r = await runCli(['init', '--tools', 'vscode', '--json'])
    expect(r.exitCode).toBe(1)
    const json = parseJsonOrNull(r.stdout)
    expect(json).not.toBeNull()
    expect(json.ok).toBe(false)
    expect(json.error.code).toBe('OXN_INVALID_TOOL')
  })

  test('5. config.tools.enabled 持久化后 init 收敛到白名单', async () => {
    // 第一次：--tools opencode,claude 写入 config
    const r1 = await runCli(['init', '--tools', 'opencode,claude', '--json'])
    expect(r1.exitCode).toBe(0)
    const cfg = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'config.json'), 'utf-8'))
    expect(cfg.tools.enabled.sort()).toEqual(['claude', 'opencode'])

    // 第二次：无 CLI flag，config 持久化生效
    const r2 = await runCli(['init', '--json'])
    expect(r2.exitCode).toBe(0)
    expect(existsSync(join(tmpDir, '.opencode', 'skills'))).toBe(true)
    expect(existsSync(join(tmpDir, '.claude', 'skills'))).toBe(true)
    expect(existsSync(join(tmpDir, '.agents', 'skills'))).toBe(false)
  })

  test('5b. --reset-tools 清空 config.tools，恢复默认', async () => {
    const r1 = await runCli(['init', '--tools', 'opencode', '--json'])
    expect(r1.exitCode).toBe(0)
    const r2 = await runCli(['init', '--reset-tools', '--json'])
    expect(r2.exitCode).toBe(0)
    const cfg = JSON.parse(readFileSync(join(tmpDir, '.openxenon', 'config.json'), 'utf-8'))
    expect(cfg.tools).toBeUndefined()
    expect(existsSync(join(tmpDir, '.agents', 'skills'))).toBe(true)
  })

  test('5c. --tools 可重复 / 逗号分隔都合法', async () => {
    const r = await runCli(['init', '--tools', 'opencode', '--tools', 'claude', '--json'])
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(tmpDir, '.opencode', 'skills'))).toBe(true)
    expect(existsSync(join(tmpDir, '.claude', 'skills'))).toBe(true)
    expect(existsSync(join(tmpDir, '.agents', 'skills'))).toBe(false)
  })
})

describe('oxn install-skill (v0.1.3 保留，向下兼容)', () => {
  test('6. install-skill --skill oxn-cli 仍可调用（v0.1.3 兼容：默认装到 ~/.opencode/skills/）', async () => {
    await runCli(['init', '--json'])
    const r = await runCli(['install-skill', '--skill', 'oxn-cli', '--force', '--json'])
    expect(r.exitCode).toBe(0)
  })
})

describe('oxn config show (v0.1.3 tools 行)', () => {
  test('9. config show 输出含 tools 行（默认）', async () => {
    await runCli(['init', '--json'])
    const r = await runCli(['config', 'show'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('opencode, claude, agents (default)')
    expect(r.stdout).toContain('Skill tools:')
  })

  test('9b. config show 输出含 tools 行（显式白名单）', async () => {
    await runCli(['init', '--tools', 'opencode', '--json'])
    const r = await runCli(['config', 'show'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('enabled: opencode')
    expect(r.stdout).toContain('Skill tools:')
  })
})

describe('Skill 资产完整性（v0.1.3 跨目录一致）', () => {
  test('三个工具目录下的 SKILL.md frontmatter 完全一致', async () => {
    const r = await runCli(['init', '--json'])
    expect(r.exitCode).toBe(0)
    const opencode = readFileSync(join(tmpDir, '.opencode', 'skills', 'oxn-cli', 'SKILL.md'), 'utf-8')
    const claude = readFileSync(join(tmpDir, '.claude', 'skills', 'oxn-cli', 'SKILL.md'), 'utf-8')
    const agents = readFileSync(join(tmpDir, '.agents', 'skills', 'oxn-cli', 'SKILL.md'), 'utf-8')
    expect(opencode).toBe(claude)
    expect(opencode).toBe(agents)
  })
})
