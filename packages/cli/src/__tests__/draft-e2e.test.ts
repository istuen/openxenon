/**
 * `oxn draft` CLI E2E 测试 (v0.6.2)
 *
 * 黑盒：跑 `bun <cliPath> draft <subcommand> ...`，断言 exit code + JSON 输出。
 * 覆盖：create / list / archive / discard 全流程
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
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

// ───────── create ─────────

describe('oxn draft create', () => {
  test('空白 name → 写空白文件 + exit 0', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'my-design', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
    expect(body.data.name).toBe('my-design')
    expect(body.data.prefix).toBe(null)
    expect(body.data.filename).toBe('my-design.md')
    const fp = join(env.tmpDir, '.openxenon', 'drafts', 'my-design.md')
    expect(existsSync(fp)).toBe(true)
  })

  test('--prefix design → 文件名 design-<name>.md', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'grilling', '--prefix', 'design', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.prefix).toBe('design')
    expect(body.data.filename).toBe('design-grilling.md')
  })

  test('--prefix 非法值 → exit 1 + OXN_DRAFT_INVALID_PREFIX', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'foo', '--prefix', 'invalid', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_INVALID_PREFIX')
  })

  test('name 含斜杠 → exit 1 + OXN_DRAFT_INVALID_NAME', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'foo/bar', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_INVALID_NAME')
  })

  test('已存在同名 → exit 1 + OXN_DRAFT_ALREADY_EXISTS', async () => {
    await env.initProject()
    const r1 = await env.runCli(['draft', 'create', 'dup', '--json'])
    expect(r1.exitCode).toBe(0)
    const r2 = await env.runCli(['draft', 'create', 'dup', '--json'])
    expect(r2.exitCode).toBe(1)
    const body = JSON.parse(r2.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_ALREADY_EXISTS')
  })
})

// ───────── list ─────────

describe('oxn draft list', () => {
  test('空 drafts 目录 → 0 个', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'list', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
    expect(body.data.count).toBe(0)
  })

  test('创建 3 个后 list → 3 个，按 mtime 降序', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'a', '--json'])
    await new Promise((r) => setTimeout(r, 5))
    await env.runCli(['draft', 'create', 'b', '--prefix', 'report', '--json'])
    await new Promise((r) => setTimeout(r, 5))
    await env.runCli(['draft', 'create', 'c', '--prefix', 'design', '--json'])

    const r = await env.runCli(['draft', 'list', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.count).toBe(3)
    expect(body.data.drafts[0].name).toBe('design-c')
    expect(body.data.drafts[1].name).toBe('report-b')
    expect(body.data.drafts[2].name).toBe('a')
  })

  test('--include-archived 同时显示归档', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'active', '--json'])
    await env.runCli(['draft', 'create', 'to-archive', '--json'])
    await env.runCli(['draft', 'archive', 'to-archive', '--json'])

    const r1 = await env.runCli(['draft', 'list', '--json'])
    expect(JSON.parse(r1.stdout).data.count).toBe(1)

    const r2 = await env.runCli(['draft', 'list', '--include-archived', '--json'])
    const body = JSON.parse(r2.stdout)
    expect(body.data.count).toBe(2)
    const archived = body.data.drafts.find((d: { archived: boolean }) => d.archived)
    expect(archived.name).toBe('to-archive')
  })
})

// ───────── archive ─────────

describe('oxn draft archive', () => {
  test('存在文件 → 移到 .archived/ + exit 0', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'archive-me', '--json'])
    const r = await env.runCli(['draft', 'archive', 'archive-me', '--json'])
    expect(r.exitCode).toBe(0)
    const archivedPath = join(env.tmpDir, '.openxenon', 'drafts', '.archived', 'archive-me.md')
    expect(existsSync(archivedPath)).toBe(true)
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'archive-me.md'))).toBe(false)
  })

  test('不存在 → exit 1 + OXN_DRAFT_NOT_FOUND', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'archive', 'ghost', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_NOT_FOUND')
  })
})

// ───────── discard ─────────

describe('oxn draft discard', () => {
  test('无 --force → exit 1 + OXN_DRAFT_DISCARD_FORCE_REQUIRED', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'safe', '--json'])
    const r = await env.runCli(['draft', 'discard', 'safe', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_DISCARD_FORCE_REQUIRED')
    // 文件仍在
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'safe.md'))).toBe(true)
  })

  test('--force + 存在 → 删除 + exit 0', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'trash', '--json'])
    const r = await env.runCli(['draft', 'discard', 'trash', '--force', '--json'])
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'trash.md'))).toBe(false)
  })

  test('--force + 不存在 → exit 1 + OXN_DRAFT_NOT_FOUND', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'discard', 'ghost', '--force', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_NOT_FOUND')
  })

  test('--force + archived 文件也能删', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'inactive', '--json'])
    await env.runCli(['draft', 'archive', 'inactive', '--json'])
    const r = await env.runCli(['draft', 'discard', 'inactive', '--force', '--json'])
    expect(r.exitCode).toBe(0)
    const archivedPath = join(env.tmpDir, '.openxenon', 'drafts', '.archived', 'inactive.md')
    expect(existsSync(archivedPath)).toBe(false)
  })
})

// ───────── 完整生命周期 ─────────

describe('oxn draft 完整生命周期', () => {
  test('create → list → archive → list (含 archived) → discard → list (空)', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'lifecycle', '--json'])
    await env.runCli(['draft', 'create', 'aux', '--prefix', 'report', '--json'])

    const r1 = await env.runCli(['draft', 'list', '--json'])
    expect(JSON.parse(r1.stdout).data.count).toBe(2)

    await env.runCli(['draft', 'archive', 'lifecycle', '--json'])
    const r2 = await env.runCli(['draft', 'list', '--include-archived', '--json'])
    expect(JSON.parse(r2.stdout).data.count).toBe(2)
    const r2NoArch = await env.runCli(['draft', 'list', '--json'])
    expect(JSON.parse(r2NoArch.stdout).data.count).toBe(1)

    await env.runCli(['draft', 'discard', 'lifecycle', '--force', '--json'])
    await env.runCli(['draft', 'discard', 'aux', '--force', '--json'])
    const r3 = await env.runCli(['draft', 'list', '--include-archived', '--json'])
    expect(JSON.parse(r3.stdout).data.count).toBe(0)
  })
})
