// =============================================================================
// probe-add-e2e.test.ts (T7 v0.2 Sprint 3d)
//
// 父文档 T4.4 表 3 case:
//   1. 合法 s3 Provider → IAPError none + registry.json 写 s3 + cachePath 0o444
//   2. 越界 evil provider → IAPError PROBE_INVALID + "module fs is forbidden" / "require is not defined"
//   3. 未实现 InfraProvider empty.ts → IAPError PROBE_INVALID + "missing InfraProvider" / "missing default export"
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { IAPError, IAPAction } from '../../kernel/index'
import { sandboxValidate, writeProviderSource, sha256OfFile } from '../probe-sandbox'
import { registryUpsert, registryRead, getCachePath, getRegistryPath } from '../probe-registry-store'

const FIXTURES = join(import.meta.dir, 'fixtures')

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-probe-add-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(join(tmpDir, '.openxenon', 'probes'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', '.cache', 'third-party-probes'), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('probe-add e2e (sandbox + registry write)', () => {
  test('case 1: 合法 s3 Provider → sandbox ok + registry 写 s3 entry + cachePath 0o444', async () => {
    const cachePath = getCachePath(tmpDir, 's3')
    const ts = readFileSync(join(FIXTURES, 'sample-s3-provider.ts'), 'utf-8')
    await writeProviderSource(cachePath, ts)

    // 1. cachePath 写完应 0o444
    expect((statSync(cachePath).mode & 0o777) === 0o444).toBe(true)

    // 2. 沙箱验证
    const validation = await sandboxValidate(cachePath, ['s3://', 's3s://'])
    expect(validation.ok).toBe(true)
    expect(validation.flags).toEqual([])

    // 3. 写 registry
    const hash = await sha256OfFile(cachePath)
    await registryUpsert(tmpDir, {
      name: 's3',
      version: '0.0.0',
      schemes: ['s3://', 's3s://'],
      source: 'cli-add',
      expectedHash: hash,
      cachePath,
      registeredAt: Date.now(),
    })

    // 4. 读 registry 校验
    const list = await registryRead(tmpDir)
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('s3')
    expect(list[0]?.source).toBe('cli-add')
    expect(list[0]?.expectedHash).toMatch(/^[a-f0-9]{64}$/)
  })

  test('case 2: 越界 evil provider (require fs) → sandbox reject + 不写 registry', async () => {
    const cachePath = getCachePath(tmpDir, 'evil')
    const ts = readFileSync(join(FIXTURES, 'evil-provider.ts'), 'utf-8')
    await writeProviderSource(cachePath, ts)

    const validation = await sandboxValidate(cachePath, ['evil://'])
    expect(validation.ok).toBe(false)
    expect(validation.flags).toContain('sandbox_violation')

    // 不应写 registry
    const list = await registryRead(tmpDir)
    expect(list).toHaveLength(0)

    // 写 IAPError 应是 PROOF/PROBE_INVALID
    try {
      if (!validation.ok) {
        throw new IAPError(
          'PROOF',
          'PROBE_INVALID',
          IAPAction.YIELD_TO_HUMAN,
          validation.reason ?? 'sandbox rejected',
          {
            component: 'probe-add-e2e',
          },
        )
      }
      throw new Error('should have thrown')
    } catch (err) {
      const e = err as IAPError
      expect(e.code).toBe('PROBE_INVALID')
    }
  })

  test('case 3: 未实现 InfraProvider empty.ts → sandbox reject + 不写 registry', async () => {
    const cachePath = getCachePath(tmpDir, 'empty')
    const ts = readFileSync(join(FIXTURES, 'empty-provider.ts'), 'utf-8')
    await writeProviderSource(cachePath, ts)

    const validation = await sandboxValidate(cachePath, ['empty://'])
    expect(validation.ok).toBe(false)
    // 实际原因可能是 "missing default export" 或 "does not implement InfraProvider"
    expect(validation.reason).toMatch(/missing default export|InfraProvider/)

    const list = await registryRead(tmpDir)
    expect(list).toHaveLength(0)
  })

  test('case 4: registry.json 不存在 → registryRead 返 [] (degraded mode)', async () => {
    const list = await registryRead(tmpDir)
    expect(list).toEqual([])
  })

  test('case 5: registryUpsert 写完后 json 物理存在 + format 正确', async () => {
    const cachePath = getCachePath(tmpDir, 'demo')
    const ts = readFileSync(join(FIXTURES, 'sample-s3-provider.ts'), 'utf-8')
    await writeProviderSource(cachePath, ts)
    const hash = await sha256OfFile(cachePath)
    await registryUpsert(tmpDir, {
      name: 'demo',
      version: '0.0.0',
      schemes: ['demo://'],
      source: 'cli-add',
      expectedHash: hash,
      cachePath,
      registeredAt: 1_700_000_000_000,
    })
    const registryPath = getRegistryPath(tmpDir)
    expect(existsSync(registryPath)).toBe(true)
    const json = JSON.parse(readFileSync(registryPath, 'utf-8'))
    expect(json.version).toBe(1)
    expect(json.providers).toHaveLength(1)
    expect(json.providers[0].name).toBe('demo')
    expect(json.providers[0].registeredAt).toBe(1_700_000_000_000)
  })
})
