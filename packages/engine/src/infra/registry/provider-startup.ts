// =============================================================================
// provider-startup.ts (RFC-0032 Phase 2)
//
// 替代原 daemon-startup.ts —— "daemon" 字眼退出语义学; 能力保留
// v0.2 Sprint 5a T9 — Probe Signal Taint v2 PR-5 启动期冷加载
//
// 行为:
//   - v1: 启动期拒启 (engine crash)
//   - v2: CORRUPTED 标状态 (不阻断) → 启动正常 → Work 阶段精准阻断
//   - Phase 2: 文件改名 daemon-startup → provider-startup; 语义保持; 4 builtin
//     provider 仍走 bootstrapFromDisk
//
// 关键约束:
//   - 只读 + 不触网
//   - 不抛错
//   - 收集 warnings 给上层
// =============================================================================

import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { getProviderRegistry } from './provider-registry'
import { FileProvider, FILE_PROVIDER_MANIFEST } from '../providers/file-provider'
import { HttpProvider, HTTP_PROVIDER_MANIFEST } from '../providers/http-provider'
import { ShellProvider, SHELL_PROVIDER_MANIFEST } from '../providers/shell-provider'
import { GitProvider, GIT_PROVIDER_MANIFEST } from '../providers/git-provider'
import type { InfraProvider, ProviderManifest } from './provider-registry'
import type { ProbeContextBase } from '../../kernel/contracts/probe-port'

export interface ProviderStartupResult {
  /** 启动期 bootstrap 始终 ok (v2 核心倒置) */
  ok: boolean
  bootstrap: {
    registered: ProviderManifest[]
    warnings: string[]
  }
}

const PROBE_CTX_FOR_BUILTIN: ProbeContextBase = {
  projectRoot: '',
}

/** Provider 构造器签名 */
type BuiltinCtor = () => InfraProvider
const BUILTIN_PROVIDERS: Array<{ ctor: BuiltinCtor; manifest: ProviderManifest }> = [
  { ctor: () => new FileProvider(), manifest: FILE_PROVIDER_MANIFEST },
  { ctor: () => new HttpProvider(), manifest: HTTP_PROVIDER_MANIFEST },
  { ctor: () => new ShellProvider(PROBE_CTX_FOR_BUILTIN), manifest: SHELL_PROVIDER_MANIFEST },
  { ctor: () => new GitProvider(PROBE_CTX_FOR_BUILTIN), manifest: GIT_PROVIDER_MANIFEST },
]

/**
 * Provider Startup —— 命令 `oxn probe list/fix` 调用方在列出 provider 前先 bootstrap
 *
 * - 注册 4 个 builtin provider (idempotent: 已注册静默 skip)
 * - bootstrapFromDisk 校验 cachePath hash (空 hash 走 degraded mode 标 OK)
 * - 不抛错：CORRUPTED/MISSING 仅 warnings, 上层负责阻断 (work-precheck)
 */
export async function providerStartup(projectRoot: string): Promise<ProviderStartupResult> {
  const reg = getProviderRegistry()
  const registered: ProviderManifest[] = []
  const warnings: string[] = []

  for (const { ctor, manifest } of BUILTIN_PROVIDERS) {
    try {
      const inst = ctor()
      reg.register(inst, manifest)
      registered.push(manifest)
    } catch (err) {
      warnings.push(`provider-register-failed ${manifest.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // bootstrapFromDisk 校验 cachePath hash
  for (const m of registered) {
    try {
      const cachePath = join(projectRoot, '.openxenon/.cache/third-party-probes', `${m.name}.ts`)
      // 期望 hash 空 = 无 cachePath 校验需求 → degraded mode 直接 OK
      if (!m.expectedHash) {
        // 无 hash → 永远 OK，无须 setStatus
        continue
      }
      // 真实 hash 校验路径
      if (!existsSync(cachePath)) {
        warnings.push(`provider-cache-missing ${m.name}: ${cachePath}`)
      } else {
        const cached = readFileSync(cachePath, 'utf-8')
        // 简化版：仅做存在校验；真实 hash 验在 probe-list 阶段
        void cached
      }
    } catch (err) {
      warnings.push(`provider-bootstrap-failed ${m.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { ok: true, bootstrap: { registered, warnings } }
}

/**
 * @deprecated v0.6.4-alpha.0+ — 改名 providerStartup；保留 export 给旧 caller 兼容期
 * Phase 3 工作：完全清理掉这 alias
 */
export const daemonStartup = providerStartup
