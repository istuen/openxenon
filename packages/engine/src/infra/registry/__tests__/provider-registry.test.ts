// =============================================================================
// ProviderRegistry tests (v0.2 Sprint 3c T6)
//
// 父文档 T3.6 表 3 路径:
//   1. bootstrap 成功 (4 ok, 0 corrupted, 0 missing)
//   2. 1 篡改 (3 ok, 1 CORRUPTED, 不抛错)
//   3. 1 删 (3 ok, 1 MISSING, 不抛错)
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import {
  ProviderRegistry,
  resetProviderRegistry,
  type InfraProvider,
  type ProviderManifest,
} from '../provider-registry'
import { IAPError } from '../../../kernel/index'
import type {
  IOExecRequest,
  IOExecResult,
  IOInterference,
  IOReadRequest,
  IOReadResult,
  IOStatRequest,
} from '../../../kernel/contracts/io-primitive'

let tmpDir: string

beforeEach(() => {
  resetProviderRegistry()
  tmpDir = join(tmpdir(), `oxn-registry-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  resetProviderRegistry()
  rmSync(tmpDir, { recursive: true, force: true })
})

/** 构造 stub provider + manifest for testing */
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

function writeProviderFile(name: string, content: string): string {
  const path = join(tmpDir, `${name}.ts`)
  writeFileSync(path, content)
  return path
}

function hashOf(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

describe('ProviderRegistry', () => {
  test('case 1: bootstrap 成功 (4 ok)', () => {
    const reg = new ProviderRegistry()
    const a = stubProvider('file', 'file://')
    const b = stubProvider('http', 'https://')
    const c = stubProvider('shell', 'shell://')
    const d = stubProvider('git', 'git://')
    reg.register(a.provider, a.manifest)
    reg.register(b.provider, b.manifest)
    reg.register(c.provider, c.manifest)
    reg.register(d.provider, d.manifest)

    // 写 4 个 cachePath, 4 个 hash 全匹配
    const p1 = writeProviderFile('file', 'file-impl')
    const p2 = writeProviderFile('http', 'http-impl')
    const p3 = writeProviderFile('shell', 'shell-impl')
    const p4 = writeProviderFile('git', 'git-impl')
    const registryJson = join(tmpDir, 'registry.json')
    writeFileSync(
      registryJson,
      JSON.stringify({
        providers: [
          { name: 'file', expectedHash: hashOf('file-impl'), cachePath: p1 },
          { name: 'http', expectedHash: hashOf('http-impl'), cachePath: p2 },
          { name: 'shell', expectedHash: hashOf('shell-impl'), cachePath: p3 },
          { name: 'git', expectedHash: hashOf('git-impl'), cachePath: p4 },
        ],
      }),
    )

    const result = reg.bootstrapFromDisk(registryJson, tmpDir)
    expect(result).toEqual({ ok: 4, corrupted: 0, missing: 0 })
    expect(reg.getStatus('file://')).toBe('OK')
    expect(reg.getStatus('https://')).toBe('OK')
  })

  test('case 2: 1 篡改 → 3 ok + 1 CORRUPTED, 不抛错', () => {
    const reg = new ProviderRegistry()
    const a = stubProvider('file', 'file://')
    const b = stubProvider('http', 'https://')
    const c = stubProvider('shell', 'shell://')
    const d = stubProvider('git', 'git://')
    reg.register(a.provider, a.manifest)
    reg.register(b.provider, b.manifest)
    reg.register(c.provider, c.manifest)
    reg.register(d.provider, d.manifest)

    // 写 4 个文件, 但 http 的 expectedHash 是错的 (模拟篡改)
    const p1 = writeProviderFile('file', 'file-impl')
    const p2 = writeProviderFile('http', 'http-impl-actual')
    const p3 = writeProviderFile('shell', 'shell-impl')
    const p4 = writeProviderFile('git', 'git-impl')
    const registryJson = join(tmpDir, 'registry.json')
    writeFileSync(
      registryJson,
      JSON.stringify({
        providers: [
          { name: 'file', expectedHash: hashOf('file-impl'), cachePath: p1 },
          { name: 'http', expectedHash: hashOf('http-impl-WRONG'), cachePath: p2 },
          { name: 'shell', expectedHash: hashOf('shell-impl'), cachePath: p3 },
          { name: 'git', expectedHash: hashOf('git-impl'), cachePath: p4 },
        ],
      }),
    )

    // bootstrapFromDisk 必须不抛错
    const result = reg.bootstrapFromDisk(registryJson, tmpDir)
    expect(result).toEqual({ ok: 3, corrupted: 1, missing: 0 })
    expect(reg.getStatus('https://')).toBe('CORRUPTED')
  })

  test('case 3: 1 删 → 3 ok + 1 MISSING, 不抛错', () => {
    const reg = new ProviderRegistry()
    const a = stubProvider('file', 'file://')
    const b = stubProvider('http', 'https://')
    const c = stubProvider('shell', 'shell://')
    const d = stubProvider('git', 'git://')
    reg.register(a.provider, a.manifest)
    reg.register(b.provider, b.manifest)
    reg.register(c.provider, c.manifest)
    reg.register(d.provider, d.manifest)

    // 写 3 个文件, 1 个 cachePath 指向不存在的文件
    const p1 = writeProviderFile('file', 'file-impl')
    const p2 = join(tmpDir, 'http-deleted.ts') // 不写
    const p3 = writeProviderFile('shell', 'shell-impl')
    const p4 = writeProviderFile('git', 'git-impl')
    const registryJson = join(tmpDir, 'registry.json')
    writeFileSync(
      registryJson,
      JSON.stringify({
        providers: [
          { name: 'file', expectedHash: hashOf('file-impl'), cachePath: p1 },
          { name: 'http', expectedHash: hashOf('http-impl'), cachePath: p2 },
          { name: 'shell', expectedHash: hashOf('shell-impl'), cachePath: p3 },
          { name: 'git', expectedHash: hashOf('git-impl'), cachePath: p4 },
        ],
      }),
    )

    const result = reg.bootstrapFromDisk(registryJson, tmpDir)
    expect(result).toEqual({ ok: 3, corrupted: 0, missing: 1 })
    expect(reg.getStatus('https://')).toBe('MISSING')
  })

  test('checkWorkDependencies: 全部 OK → ok=true', () => {
    const reg = new ProviderRegistry()
    const a = stubProvider('file', 'file://')
    reg.register(a.provider, a.manifest)
    reg.bootstrapFromDisk(join(tmpDir, 'no-registry.json'), tmpDir) // 走 degraded 模式 (全 OK)
    const r = reg.checkWorkDependencies(['file://'])
    expect(r.ok).toBe(true)
    expect(r.blocked).toEqual([])
  })

  test('checkWorkDependencies: CORRUPTED scheme → blocked', () => {
    const reg = new ProviderRegistry()
    const a = stubProvider('file', 'file://')
    reg.register(a.provider, a.manifest)
    // 强制标 CORRUPTED (通过 list 注入 status)
    ;(reg as unknown as { entries: Map<string, { status: string }> }).entries.get('file')!.status = 'CORRUPTED'
    const r = reg.checkWorkDependencies(['file://'])
    expect(r.ok).toBe(false)
    expect(r.blocked.length).toBe(1)
    expect(r.blocked[0]?.scheme).toBe('file://')
    expect(r.blocked[0]?.reason).toMatch(/corrupted/)
  })

  test('register 重复 name → 抛 IAPError', () => {
    const reg = new ProviderRegistry()
    const a = stubProvider('file', 'file://')
    reg.register(a.provider, a.manifest)
    expect(() => {
      reg.register(a.provider, a.manifest)
    }).toThrow(IAPError)
  })

  test('getProvider / getStatus / getManifest / list 基本查询', () => {
    const reg = new ProviderRegistry()
    const a = stubProvider('file', 'file://')
    reg.register(a.provider, a.manifest)

    expect(reg.getProvider('file://')).toBe(a.provider)
    expect(reg.getProvider('unknown://')).toBe(null)
    expect(reg.getStatus('file://')).toBe('OK')
    expect(reg.getStatus('unknown://')).toBe('UNREGISTERED')
    expect(reg.getManifest('file')).toEqual(a.manifest)
    expect(reg.getManifest('unknown')).toBe(null)
    expect(reg.list()).toHaveLength(1)
    expect(reg.list()[0]?.name).toBe('file')
  })
})
