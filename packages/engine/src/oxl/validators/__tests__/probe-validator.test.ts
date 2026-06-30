// =============================================================================
// probe-validator.test.ts (T10 v0.2 Sprint 5b)
//
// 父文档 T6.5 表 4 case:
//   1. 合法 builtin scheme → ok
//   2. 合法 cli-add scheme → ok
//   3. scheme 格式错 (无 ://) → 编译错误
//   4. scheme 未注册 → 编译错误
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { validateProbeSchemes } from '../probe-validator'
import {
  getProviderRegistry,
  resetProviderRegistry,
  type InfraProvider,
  type ProviderManifest,
} from '../../../infra/registry/provider-registry'
import type { ProbeDeclaration } from '../../generated/ast'
import type {
  IOExecRequest,
  IOExecResult,
  IOInterference,
  IOReadRequest,
  IOReadResult,
  IOStatRequest,
  IOStatResult,
} from '../../../kernel/contracts/io-primitive'

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

function mkProbe(name: string, scheme: string | undefined): ProbeDeclaration {
  // 简化: 构造一个 minimal ProbeDeclaration with scheme (Langium AST 接口复杂, 这里只取 validator 关心的字段)
  return {
    $type: 'ProbeDeclaration',
    name,
    scheme,
    descriptions: [],
    props: [],
    output: undefined,
  } as unknown as ProbeDeclaration
}

beforeEach(() => {
  resetProviderRegistry()
})

afterEach(() => {
  resetProviderRegistry()
})

describe('validateProbeSchemes (T10)', () => {
  test('case 1: 合法 builtin scheme → ok', () => {
    const reg = getProviderRegistry()
    const file = stubProvider('file', 'file://')
    reg.register(file.provider, file.manifest)

    const r = validateProbeSchemes([mkProbe('fs-exists', 'file://')], reg)
    expect(r.ok).toBe(true)
  })

  test('case 2: 合法 cli-add scheme → ok', () => {
    const reg = getProviderRegistry()
    const s3 = stubProvider('s3', 's3://')
    reg.register(s3.provider, s3.manifest)

    const r = validateProbeSchemes([mkProbe('s3-probe', 's3://')], reg)
    expect(r.ok).toBe(true)
  })

  test('case 3: scheme 格式错 (无 ://) → 编译错误', () => {
    const reg = getProviderRegistry()
    const r = validateProbeSchemes([mkProbe('bad', 's3')], reg)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0]?.reason).toMatch(/must end with ":\/\/"/)
    }
  })

  test('case 4: scheme 未注册 → 编译错误', () => {
    const reg = getProviderRegistry()
    const r = validateProbeSchemes([mkProbe('redis', 'redis://')], reg)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors[0]?.reason).toMatch(/not registered/)
      expect(r.errors[0]?.reason).toMatch(/oxn probe add/)
    }
  })

  test('case 5: 多 probe 含 1 个错 → errors 数组含该 probe', () => {
    const reg = getProviderRegistry()
    const file = stubProvider('file', 'file://')
    reg.register(file.provider, file.manifest)
    const probes = [mkProbe('fs-exists', 'file://'), mkProbe('redis', 'redis://')]
    const r = validateProbeSchemes(probes, reg)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.length).toBe(1)
      expect(r.errors[0]?.probeName).toBe('redis')
    }
  })

  test('case 6: scheme 字段缺失 → ok (向后兼容)', () => {
    const reg = getProviderRegistry()
    const r = validateProbeSchemes([mkProbe('legacy', undefined)], reg)
    expect(r.ok).toBe(true)
  })
})
