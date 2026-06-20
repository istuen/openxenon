// =============================================================================
// work-finalize-e2e.test.ts (T12)
// =============================================================================
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { finalizeWorkDomains } from '../../infra/frozen/work-domains'
import { IAPError } from '../../kernel/index'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-finalize-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(join(tmpDir, '.openxenon', 'works'), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('work finalize (T12)', () => {
  test('全部 PASS → finalize 成功 + work-domains-frozen.json 0o444', async () => {
    const r = await finalizeWorkDomains('my-work', tmpDir, [
      { domain: 'members', invariant: 'check-1', script: 'true' },
      { domain: 'members', invariant: 'check-2', script: 'echo ok' },
    ])

    expect(r.node.overallVerdict).toBe('PASS')
    expect(existsSync(r.frozenPath)).toBe(true)
    expect(statSync(r.frozenPath).mode & 0o777).toBe(0o444)
    const frozen = JSON.parse(readFileSync(r.frozenPath, 'utf-8'))
    expect(frozen.workId).toBe('my-work')
    expect(frozen.domainProofs).toHaveLength(2)
  })

  test('1 FAIL → 抛 IAPError + 不写 frozen + draft 删', async () => {
    const draftPath = join(tmpDir, '.openxenon', 'works', 'fail-w', 'work-domains.draft.json')
    await expect(
      finalizeWorkDomains('fail-w', tmpDir, [
        { domain: 'm', invariant: 'pass', script: 'true' },
        { domain: 'm', invariant: 'fail', script: 'false' },
      ]),
    ).rejects.toThrow(IAPError)
    expect(existsSync(draftPath)).toBe(false)
  })

  test('manual → 抛 IAPError', async () => {
    await expect(
      finalizeWorkDomains('manual-w', tmpDir, [{ domain: 'm', invariant: 'x', manual: 'check docs' }]),
    ).rejects.toThrow(/MANUAL_PENDING/)
  })

  test('1 FAIL + force=true → 成功写 frozen', async () => {
    const r = await finalizeWorkDomains('force-w', tmpDir, [{ domain: 'm', invariant: 'fail', script: 'false' }], true)
    expect(r.node.overallVerdict).toBe('FAIL')
    expect(r.node.hardBlocked).toBe(true)
    expect(existsSync(r.frozenPath)).toBe(true)
  })
})
