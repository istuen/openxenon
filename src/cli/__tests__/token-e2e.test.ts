// =============================================================================
// token-e2e.test.ts — v0.2.2
//
// 黑盒 E2E：验证 `oxn token ingest` CLI 的输入校验与持久化。
//
// 覆盖：
//   1. 正常摄入 → ok: true, JSONL 文件存在
//   2. --input-json 不是有效 JSON → OXN_TOKEN_JSON_INVALID, exit 1
//   3. --input-json 是数组 → OXN_TOKEN_JSON_INVALID, exit 1
//   4. Schema 字段缺失 → IAPError (INGEST_SCHEMA_INVALID), exit 1
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-token-e2e-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function initProject(): Promise<void> {
  const r = await runCli(['init'])
  if (r.exitCode !== 0) {
    throw new Error(`init failed: ${r.stderr || r.stdout}`)
  }
}

const VALID_INPUT = JSON.stringify({
  schemaVersion: 1,
  source: 'manual',
  sessionID: 'test-session-1',
  workRef: 'test-work',
  modelID: 'claude-sonnet-4',
  providerID: 'anthropic',
  timestamp: 1718500000000,
  tokens: { input: 1200, output: 800 },
  cost: 0.03,
})

describe('oxn token ingest', () => {
  test('Case 1: 正常摄入 → ok: true, JSONL 文件存在', async () => {
    await initProject()
    const r = await runCli(['token', 'ingest', '--json', '--input-json', VALID_INPUT])

    expect(r.exitCode).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(true)
    expect(parsed.data.recorded).toBe(1)

    const expectedPath = join(tmpDir, '.openxenon', 'insights', 'tokens', 'test-work.jsonl')
    expect(existsSync(expectedPath)).toBe(true)
    const content = readFileSync(expectedPath, 'utf-8').trim()
    expect(content).toContain('test-session-1')
  })

  test('Case 2: --input-json 不是有效 JSON → OXN_TOKEN_JSON_INVALID, exit 1', async () => {
    await initProject()
    const r = await runCli(['token', 'ingest', '--json', '--input-json', '{bad json}'])

    expect(r.exitCode).toBe(1)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('OXN_TOKEN_JSON_INVALID')
  })

  test('Case 3: --input-json 是数组 → OXN_TOKEN_JSON_INVALID, exit 1', async () => {
    await initProject()
    const r = await runCli(['token', 'ingest', '--json', '--input-json', '[]'])

    expect(r.exitCode).toBe(1)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('OXN_TOKEN_JSON_INVALID')
  })

  test('Case 4: Schema 字段缺失 → IAPError, exit 1', async () => {
    await initProject()
    const minimal = JSON.stringify({ source: 'manual' })
    const r = await runCli(['token', 'ingest', '--json', '--input-json', minimal])

    expect(r.exitCode).toBe(1)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('IAP_PROOF_INGEST_SCHEMA_INVALID')
  })
})
