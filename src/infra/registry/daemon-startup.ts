// =============================================================================
// daemon-startup.ts (v0.2 Sprint 5a T9 — Probe Signal Taint v2 PR-5)
//
// Daemon 冷加载: 启动期只读 .openxenon/probes/registry.json + 校验 Hash
// 父文档: .openxenon/forges/sprints/sprint-5a/2026-06-15-probe-taint-daemon-workcheck-pr5.md §1
//
// v2 核心倒置 (vs v1):
//   - v1: 启动期拒启 (engine crash)
//   - v2: CORRUPTED 标状态 (不阻断) → 启动正常 → Work 阶段精准阻断
// 关键约束:
//   - 只读 + 不触网
//   - 不抛错
//   - 收集 warnings 给上层
//
// 注册 4 个 builtin provider (file/http/shell/git) — 它们的 manifest 期望 hash 是 '' (空字符串,
// 无 cachePath 校验需求, bootstrapFromDisk 走 degraded 模式直接标 OK)
// =============================================================================

import { join } from 'node:path'
import { getProviderRegistry } from './provider-registry'
import { FileProvider, FILE_PROVIDER_MANIFEST } from '../providers/file-provider'
import { HttpProvider, HTTP_PROVIDER_MANIFEST } from '../providers/http-provider'
import { ShellProvider, SHELL_PROVIDER_MANIFEST } from '../providers/shell-provider'
import { GitProvider, GIT_PROVIDER_MANIFEST } from '../providers/git-provider'
import type { InfraProvider, ProviderManifest } from './provider-registry'

export interface DaemonStartupResult {
  /** 启动期 bootstrap 始终 ok (v2 核心倒置) */
  ok: boolean
  bootstrap: {
    ok: number
    corrupted: number
    missing: number
  }
  /** 人类可读 warnings (CORRUPTED / MISSING 提示, 不阻断 Daemon) */
  warnings: string[]
}

export async function daemonStartup(projectRoot: string): Promise<DaemonStartupResult> {
  const reg = getProviderRegistry()

  // 0. 注册 4 个 builtin provider (幂等: 重复 name 抛 IAPError → 吞掉, 已有则 skip)
  const stubContext = { projectRoot: process.cwd() }
  registerBuiltinSafe(reg, () => new FileProvider(), FILE_PROVIDER_MANIFEST)
  registerBuiltinSafe(reg, () => new HttpProvider(), HTTP_PROVIDER_MANIFEST)
  registerBuiltinSafe(reg, () => new ShellProvider(stubContext), SHELL_PROVIDER_MANIFEST)
  registerBuiltinSafe(reg, () => new GitProvider(stubContext), GIT_PROVIDER_MANIFEST)

  const registryPath = join(projectRoot, '.openxenon', 'probes', 'registry.json')
  const cacheDir = join(projectRoot, '.openxenon', '.cache', 'third-party-probes')

  // 1. 只读 + 不触网 bootstrap
  const bootstrap = reg.bootstrapFromDisk(registryPath, cacheDir)

  // 2. 收集 warnings (不抛错)
  const warnings: string[] = []
  if (bootstrap.corrupted > 0) {
    warnings.push(
      `WARN: ${bootstrap.corrupted} provider(s) corrupted (hash mismatch). Run 'oxn probe list' for details.`,
    )
  }
  if (bootstrap.missing > 0) {
    warnings.push(`WARN: ${bootstrap.missing} provider(s) missing (cache file deleted). Run 'oxn probe fix' to repair.`)
  }

  return { ok: true, bootstrap, warnings }
}

/** 幂等注册 builtin — 已存在时跳过 (避免 IAPError) */
function registerBuiltinSafe(
  reg: ReturnType<typeof getProviderRegistry>,
  factory: () => InfraProvider,
  manifest: ProviderManifest,
): void {
  if (reg.getManifest(manifest.name)) return
  reg.register(factory(), manifest)
}
