// =============================================================================
// ProviderRegistry (v0.2 Sprint 3c T6 — Probe Signal Taint v2 PR-3)
//
// L1-Infra 层 — Provider 注册中心
// 物理路径: src/infra/registry/provider-registry.ts
// 父文档: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2 §5.1 §5.4
//
// 职责：
//   1. 注册 4 个内置 InfraProvider（file / http / shell / git）
//   2. bootstrapFromDisk() 校验 cachePath 哈希 → 不匹配标 CORRUPTED, 不存在标 MISSING
//   3. checkWorkDependencies() 在 work 解析/启动前阻断缺依赖的 scheme
//
// 纯洁性约束 (L1-Infra):
//   - 可依赖 L0-Contract (IO Primitive 类型)
//   - 可依赖 L1-Infra 自身 (filesystem / frozen / 等)
//   - 不得 import L0-Processor / L2+ / L3 层
//
// 与 IRoleService 关系: ProviderRegistry 是"IO 物理执行的注册中心", 而
// IRoleService 是"业务角色调度"。Provider 由 Verdict 链 (Kernel) → Probe (Infra
// probes/) → Provider (Infra providers/) 调用, 与 Role 无耦合。
// =============================================================================

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { IAPError, IAPAction } from '../../kernel/index'
import type { InterferenceFlag } from '../../kernel/contracts/io-primitive'

// ───────── Status / Manifest / Interface ─────────

export type ProviderStatus = 'OK' | 'CORRUPTED' | 'MISSING' | 'UNREGISTERED'

export interface ProviderManifest {
  /** provider 名字 (e.g. "file", "http", "shell", "git") */
  name: string
  /** semver 字符串 */
  version: string
  /** 支持的 scheme 前缀 (e.g. ["file://"], ["https://", "http://"]) */
  schemes: string[]
  /** v2.0 仅 builtin; v2.1+ 才支持 cli-add */
  source: 'builtin' | 'cli-add'
  /** cachePath 文件的预期 SHA-256 (64-hex) */
  expectedHash: string
  /** 物理路径: .openxenon/.cache/third-party-probes/<name>.ts */
  cachePath: string
  /** 注册时间 (epoch ms) */
  registeredAt: number
}

export interface InfraProvider {
  readonly name: string
  readonly schemes: readonly string[]

  ioStat(req: import('../../kernel/contracts/io-primitive').IOStatRequest): Promise<{
    result: import('../../kernel/contracts/io-primitive').IOStatResult
    interference: { flags: InterferenceFlag[] }
  }>

  ioRead(req: import('../../kernel/contracts/io-primitive').IOReadRequest): Promise<{
    result: import('../../kernel/contracts/io-primitive').IOReadResult
    interference: { flags: InterferenceFlag[] }
  }>

  ioExec(req: import('../../kernel/contracts/io-primitive').IOExecRequest): Promise<{
    result: import('../../kernel/contracts/io-primitive').IOExecResult
    interference: { flags: InterferenceFlag[] }
  }>
}

// ───────── Registry ─────────

export interface BootstrapResult {
  ok: number
  corrupted: number
  missing: number
}

export interface WorkDependencyCheck {
  ok: boolean
  blocked: Array<{ scheme: string; reason: string }>
}

export interface ProviderListEntry {
  name: string
  schemes: string[]
  status: ProviderStatus
  reason?: string
}

interface RegistryEntry {
  provider: InfraProvider
  manifest: ProviderManifest
  status: ProviderStatus
  reason?: string
}

export class ProviderRegistry {
  private entries = new Map<string, RegistryEntry>()
  private schemeIndex = new Map<string, string>() // scheme → name

  /** 注册一个 provider (启动时由 builtin list 调用, 或 v2.1+ cli-add 触发) */
  register(provider: InfraProvider, manifest: ProviderManifest): void {
    if (this.entries.has(manifest.name)) {
      throw new IAPError(
        'INFRA',
        'PROVIDER_DUPLICATE',
        IAPAction.YIELD_TO_HUMAN,
        `provider "${manifest.name}" already registered`,
        {
          component: 'provider-registry',
          providerName: manifest.name,
        },
      )
    }
    this.entries.set(manifest.name, {
      provider,
      manifest,
      status: 'OK',
    })
    for (const scheme of manifest.schemes) {
      this.schemeIndex.set(scheme, manifest.name)
    }
  }

  /**
   * 1. 读 registry.json (声明: 哪个 provider 在哪个 cachePath, 期望 hash)
   * 2. 对每个 entry 校验 cachePath 文件 Hash
   * 3. 未在 registry.json 中出现的 scheme → status = 'UNREGISTERED' (仅在使用时报错)
   * 4. Hash 不匹配 → status = 'CORRUPTED', **不抛错** (老 caller 仍能工作, 但 provider 标脏)
   * 5. cachePath 不存在 → status = 'MISSING', **不抛错**
   */
  bootstrapFromDisk(registryJsonPath: string, _cacheDir: string): BootstrapResult {
    const result: BootstrapResult = { ok: 0, corrupted: 0, missing: 0 }

    if (!existsSync(registryJsonPath)) {
      // 没有 registry.json: 全部 entry 视为 OK (默认 trust builtin)
      for (const entry of this.entries.values()) {
        entry.status = 'OK'
        result.ok++
      }
      return result
    }

    let parsed: { providers?: Array<{ name: string; expectedHash: string; cachePath: string }> }
    try {
      const raw = readFileSync(registryJsonPath, 'utf-8')
      parsed = JSON.parse(raw)
    } catch {
      // JSON 解析失败: 视所有 entry 为 OK (degraded mode, 不阻断)
      for (const entry of this.entries.values()) {
        entry.status = 'OK'
        result.ok++
      }
      return result
    }

    const registryProviders = parsed.providers ?? []

    for (const entry of this.entries.values()) {
      const declared = registryProviders.find((p) => p.name === entry.manifest.name)
      if (!declared) {
        // 未在 registry.json 中声明: 视为 OK (builtin 默认可信)
        entry.status = 'OK'
        result.ok++
        continue
      }

      if (!existsSync(declared.cachePath)) {
        entry.status = 'MISSING'
        entry.reason = `cachePath not found: ${declared.cachePath}`
        result.missing++
        continue
      }

      const actualHash = sha256File(declared.cachePath)
      if (actualHash !== declared.expectedHash) {
        entry.status = 'CORRUPTED'
        entry.reason = `hash mismatch: expected ${declared.expectedHash}, got ${actualHash}`
        result.corrupted++
        continue
      }

      entry.status = 'OK'
      entry.reason = undefined
      result.ok++
    }

    return result
  }

  /**
   * Work 解析/启动前调用: 校验 requiredSchemes 都有可用 provider.
   *   - 已注册 + status=OK → 通过
   *   - 未注册 (schemeIndex miss) → blocked: scheme not registered
   *   - status=CORRUPTED / MISSING → blocked: 标脏/丢失
   */
  checkWorkDependencies(requiredSchemes: string[]): WorkDependencyCheck {
    const blocked: Array<{ scheme: string; reason: string }> = []

    for (const scheme of requiredSchemes) {
      const name = this.schemeIndex.get(scheme)
      if (!name) {
        blocked.push({ scheme, reason: 'scheme not registered' })
        continue
      }
      const entry = this.entries.get(name)
      if (!entry) {
        blocked.push({ scheme, reason: `provider "${name}" not found in entries` })
        continue
      }
      if (entry.status === 'CORRUPTED') {
        blocked.push({ scheme, reason: `provider "${name}" corrupted: ${entry.reason ?? 'unknown'}` })
      } else if (entry.status === 'MISSING') {
        blocked.push({ scheme, reason: `provider "${name}" missing: ${entry.reason ?? 'unknown'}` })
      }
    }

    return { ok: blocked.length === 0, blocked }
  }

  /** 按 scheme 前缀查找 provider. 找不到返 null (UNREGISTERED 在使用时报) */
  getProvider(scheme: string): InfraProvider | null {
    const name = this.schemeIndex.get(scheme)
    if (!name) return null
    const entry = this.entries.get(name)
    return entry ? entry.provider : null
  }

  getStatus(scheme: string): ProviderStatus {
    const name = this.schemeIndex.get(scheme)
    if (!name) return 'UNREGISTERED'
    const entry = this.entries.get(name)
    return entry ? entry.status : 'UNREGISTERED'
  }

  getManifest(name: string): ProviderManifest | null {
    const entry = this.entries.get(name)
    return entry ? entry.manifest : null
  }

  list(): ProviderListEntry[] {
    return Array.from(this.entries.values()).map((entry) => ({
      name: entry.manifest.name,
      schemes: [...entry.manifest.schemes],
      status: entry.status,
      reason: entry.reason,
    }))
  }
}

// ───────── 辅助 ─────────

function sha256File(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8')
  return createHash('sha256').update(content).digest('hex')
}

// ───────── 单例 ─────────

let _instance: ProviderRegistry | null = null

export function getProviderRegistry(): ProviderRegistry {
  if (!_instance) {
    _instance = new ProviderRegistry()
  }
  return _instance
}

/** 测试用: 重置单例 (避免跨测试污染) */
export function resetProviderRegistry(): void {
  _instance = null
}
