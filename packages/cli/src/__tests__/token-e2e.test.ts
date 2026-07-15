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
import { existsSync, readFileSync } from 'fs'
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
    await env.initProject()
    const r = await env.runCli(['token', 'ingest', '--json', '--input-json', VALID_INPUT])

    expect(r.exitCode).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(true)
    expect(parsed.data.recorded).toBe(1)

    const expectedPath = join(env.tmpDir, '.openxenon', 'insights', 'tokens', 'test-work.jsonl')
    expect(existsSync(expectedPath)).toBe(true)
    const content = readFileSync(expectedPath, 'utf-8').trim()
    expect(content).toContain('test-session-1')
  })

  test('Case 2: --input-json 不是有效 JSON → OXN_TOKEN_JSON_INVALID, exit 1', async () => {
    await env.initProject()
    const r = await env.runCli(['token', 'ingest', '--json', '--input-json', '{bad json}'])

    expect(r.exitCode).toBe(1)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('OXN_TOKEN_JSON_INVALID')
  })

  test('Case 3: --input-json 是数组 → OXN_TOKEN_JSON_INVALID, exit 1', async () => {
    await env.initProject()
    const r = await env.runCli(['token', 'ingest', '--json', '--input-json', '[]'])

    expect(r.exitCode).toBe(1)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('OXN_TOKEN_JSON_INVALID')
  })

  test('Case 4: Schema 字段缺失 → IAPError, exit 1', async () => {
    await env.initProject()
    const minimal = JSON.stringify({ source: 'manual' })
    const r = await env.runCli(['token', 'ingest', '--json', '--input-json', minimal])

    expect(r.exitCode).toBe(1)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('IAP_PROOF_INGEST_SCHEMA_INVALID')
  })
})
