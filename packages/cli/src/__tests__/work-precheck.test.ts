// =============================================================================
// work-precheck.test.ts (T9 v0.2 Sprint 5a)
//
// 父文档 T5.6 表 4 case:
//   1. Work A 用 s3 (CORRUPTED) → 抛 IAP_PROOF_PROBE_CORRUPTED
//   2. Work B 不用 s3 → 正常通过 (v2 核心倒置)
//   3. Work C 用 redis (UNREGISTERED) → 抛 IAP_PROOF_PROBE_MISSING
//   4. Work D 用 file:// builtin → 正常通过
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  getProviderRegistry,
  resetProviderRegistry,
  type InfraProvider,
  type ProviderManifest,
} from '@openxenon/engine/infra/registry/provider-registry'
import { IAPError } from '@openxenon/engine/kernel'
import type {
  IOExecRequest,
  IOExecResult,
  IOInterference,
  IOReadRequest,
  IOReadResult,
  IOStatRequest,
  IOStatResult,
} from '@openxenon/engine/kernel/contracts/io-primitive'
import { workPrecheck } from '@openxenon/engine/Work/work-precheck'

function stubProvider(name: string, scheme: string): { provider: InfraProvider; manifest: ProviderManifest } {
  const provider: InfraProvider = {
    name,
    schemes: [scheme],
    ioStat: async (_req: IOStatRequest) => ({
      result: { exists: true, isFile: true, isDir: false, mtimeMs: 0, size: 0, symlink: false },
      interference: { flags: [] } as IOInterference,
    }),
    ioRead: async (_req: IOReadRequest) => ({
      result: { bytes: 0, text: '', truncated: false } as IOReadResult,
      interference: { flags: [] } as IOInterference,
    }),
    ioExec: async (_req: IOExecRequest) => ({
      result: { exitCode: 0, stdout: '', stderr: '', durationMs: 0 } as IOExecResult,
      interference: { flags: [] } as IOInterference,
    }),
  }
  return {
    provider,
    manifest: {
      name,
      version: '0.1.0',
      schemes: [scheme],
      source: 'builtin',
      expectedHash: '',
      cachePath: '',
      registeredAt: Date.now(),
    },
  }
}

beforeEach(() => {
  resetProviderRegistry()
})

afterEach(() => {
  resetProviderRegistry()
})

describe('workPrecheck (v2 核心倒置)', () => {
  test('case 1: Work A 用 s3 (CORRUPTED) → 抛 IAP_PROOF_PROBE_CORRUPTED', async () => {
    const reg = getProviderRegistry()
    const s3 = stubProvider('s3', 's3://')
    reg.register(s3.provider, s3.manifest)
    // 强制标 CORRUPTED
    const entries = (reg as unknown as { entries: Map<string, { status: string }> }).entries
    entries.get('s3')!.status = 'CORRUPTED'

    await expect(workPrecheck(['s3://'])).rejects.toThrow(IAPError)
    try {
      await workPrecheck(['s3://'])
    } catch (err) {
      const e = err as IAPError
      expect(e.code).toBe('PROBE_CORRUPTED')
      expect(e.axis).toBe('PROOF')
      expect(e.message).toMatch(/s3:\/\//)
    }
  })

  test('case 2: Work B 不用 s3 → 正常通过 (v2 核心倒置: 不阻断该 Work)', async () => {
    const reg = getProviderRegistry()
    const s3 = stubProvider('s3', 's3://')
    reg.register(s3.provider, s3.manifest)
    const entries = (reg as unknown as { entries: Map<string, { status: string }> }).entries
    entries.get('s3')!.status = 'CORRUPTED' // s3 坏

    // Work B 不用 s3 → empty schemes → 正常通过
    await expect(workPrecheck([])).resolves.toBeUndefined()
  })

  test('case 3: Work C 用 redis (UNREGISTERED) → 抛 IAP_PROOF_PROBE_MISSING', async () => {
    // redis 根本没注册 → getStatus 返 UNREGISTERED
    await expect(workPrecheck(['redis://'])).rejects.toThrow(IAPError)
    try {
      await workPrecheck(['redis://'])
    } catch (err) {
      const e = err as IAPError
      expect(e.code).toBe('PROBE_MISSING')
      expect(e.message).toMatch(/redis:\/\//)
    }
  })

  test('case 4: Work D 用 file:// builtin → 正常通过', async () => {
    const reg = getProviderRegistry()
    const file = stubProvider('file', 'file://')
    reg.register(file.provider, file.manifest)

    await expect(workPrecheck(['file://'])).resolves.toBeUndefined()
  })

  test('case 5: 多 scheme 部分坏 → 抛 IAPError (阻断整个 Work)', async () => {
    const reg = getProviderRegistry()
    const file = stubProvider('file', 'file://')
    reg.register(file.provider, file.manifest)
    // s3 损坏
    const s3 = stubProvider('s3', 's3://')
    reg.register(s3.provider, s3.manifest)
    const entries = (reg as unknown as { entries: Map<string, { status: string }> }).entries
    entries.get('s3')!.status = 'CORRUPTED'

    // [file, s3] 有一个坏 → 抛错 (Work D 部分依赖 s3)
    await expect(workPrecheck(['file://', 's3://'])).rejects.toThrow(IAPError)
  })
})
