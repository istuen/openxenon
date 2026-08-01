// =============================================================================
// oxn-runtime-version.test.ts — RFC-0015 D6.4 一等公民 probe 验证
//
// 6 case: match / mismatch / skipped-no-expected / skipped-no-config / null runtime / empty oxnVersion
// D6.4: handler 不读 engine version (由 ProbeRunner 注入 context.engineVersion)
//   测试 fixture 注入 "0.6.2-alpha.0" 模拟真实 engine version
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeOxnRuntimeVersion, type ProbeContext } from '../oxn-runtime-version'

let tmpDir: string
const ENGINE_VERSION = '0.6.2-alpha.0'

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-rtv-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function writeConfig(config: object | null): void {
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  if (config !== null) {
    writeFileSync(join(tmpDir, '.openxenon/config.json'), JSON.stringify(config))
  }
}

describe('oxn-runtime-version (RFC-0015 D6.4; context.engineVersion 注入)', () => {
  test('case 1: expected 与 engine 一致 → passed=true', async () => {
    writeConfig({ runtime: { oxnVersion: ENGINE_VERSION } })
    const ctx: ProbeContext = { projectRoot: tmpDir, engineVersion: ENGINE_VERSION }
    const r = await executeOxnRuntimeVersion({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.skipped).toBe(false)
    expect(r.actual).toBe(ENGINE_VERSION)
    expect(r.expected).toBe(ENGINE_VERSION)
  })

  test('case 2: expected 与 engine 不一致 → passed=false, 含 expected/actual', async () => {
    writeConfig({ runtime: { oxnVersion: '0.5.0' } })
    const ctx: ProbeContext = { projectRoot: tmpDir, engineVersion: ENGINE_VERSION }
    const r = await executeOxnRuntimeVersion({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.mismatch).toBeDefined()
    expect(r.mismatch?.expected).toBe('0.5.0')
    expect(r.actual).toBe(ENGINE_VERSION)
  })

  test('case 3: 未配置 expected → skipped=true, passed=true', async () => {
    writeConfig({ runtime: {} })
    const ctx: ProbeContext = { projectRoot: tmpDir, engineVersion: ENGINE_VERSION }
    const r = await executeOxnRuntimeVersion({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.skipped).toBe(true)
    expect(r.expected).toBeNull()
    expect(r.actual).toBe(ENGINE_VERSION)
  })

  test('case 4: config 不存在 → skipped=true', async () => {
    const ctx: ProbeContext = { projectRoot: tmpDir, engineVersion: ENGINE_VERSION }
    const r = await executeOxnRuntimeVersion({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.skipped).toBe(true)
    expect(r.expected).toBeNull()
  })

  test('case 5: config.runtime 字段是 null → skipped=true (兼容)', async () => {
    writeConfig({ runtime: null })
    const ctx: ProbeContext = { projectRoot: tmpDir, engineVersion: ENGINE_VERSION }
    const r = await executeOxnRuntimeVersion({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.skipped).toBe(true)
  })

  test('case 6: config.runtime.oxnVersion 是空字符串 → 视为未配置', async () => {
    writeConfig({ runtime: { oxnVersion: '' } })
    const ctx: ProbeContext = { projectRoot: tmpDir, engineVersion: ENGINE_VERSION }
    const r = await executeOxnRuntimeVersion({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.skipped).toBe(true)
  })

  test('case 7: engineVersion 未注入 → passed=false (ProbeRunner 配置错误信号)', async () => {
    writeConfig({ runtime: { oxnVersion: ENGINE_VERSION } })
    const ctx: ProbeContext = { projectRoot: tmpDir } // no engineVersion
    const r = await executeOxnRuntimeVersion({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.actual).toBeNull()
  })
})
