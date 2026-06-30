// =============================================================================
// probe-registry-store.ts (v0.2 Sprint 3d T7)
//
// 第三方 Probe Provider 注册表读写工具
// 物理路径: .openxenon/probes/registry.json (v1 schema)
// 数据契约: 复用 src/infra/registry/provider-registry.ts 的 ProviderManifest
//
// L3-CLI 层 — 由 src/cli/probe-add.ts 调用, 也可被 daemon 启动时调
// 纯洁性约束 (L3): 可依赖 L0-Contract (ProviderManifest) + L1-Infra 异步 fs
//                   不得 import 上层 (L0-Processor / L2)
// =============================================================================

import { join } from 'node:path'
import { mkdir, readFile, unlink, writeFile } from '@openxenon/engine/infra/filesystem-async'
import { IAPError, IAPAction } from '@openxenon/engine/kernel'
import type { ProviderManifest } from '@openxenon/engine/infra/registry/provider-registry'

const REGISTRY_VERSION = 1
const BOUNDARY_DIR = '.openxenon'
const PROBES_DIR = 'probes'
const CACHE_DIR = '.cache/third-party-probes'

/** registry.json schema v1 */
interface RegistryFile {
  version: number
  providers: ProviderManifest[]
}

function getRegistryPath(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR, PROBES_DIR, 'registry.json')
}

function getCacheDir(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR, CACHE_DIR)
}

function getCachePath(projectRoot: string, name: string): string {
  return join(getCacheDir(projectRoot), `${name}.ts`)
}

/** 读 registry.json; 不存在或 schema 非法 → [] (degraded mode) */
export async function registryRead(projectRoot: string): Promise<ProviderManifest[]> {
  const path = getRegistryPath(projectRoot)
  let content: string
  try {
    content = await readFile(path, 'utf-8')
  } catch {
    return [] // 不存在走 degraded mode
  }
  try {
    const parsed = JSON.parse(content) as RegistryFile
    if (parsed.version !== REGISTRY_VERSION) {
      throw new IAPError(
        'INFRA',
        'PROVIDER_DUPLICATE',
        IAPAction.YIELD_TO_HUMAN,
        `registry.json schema version mismatch: expected ${REGISTRY_VERSION}, got ${parsed.version}`,
        { component: 'probe-registry-store', path },
      )
    }
    return parsed.providers
  } catch (err) {
    if (err instanceof IAPError) throw err
    return [] // 损坏的 JSON 走 degraded mode (不阻断, 返空 list)
  }
}

/** 写 registry.json; 读 → upsert → 写 (原子) */
export async function registryUpsert(projectRoot: string, manifest: ProviderManifest): Promise<void> {
  const path = getRegistryPath(projectRoot)
  const list = await registryRead(projectRoot)

  // 校验 cachePath 物理存在
  const cachePath = getCachePath(projectRoot, manifest.name)
  if (manifest.cachePath !== cachePath) {
    throw new IAPError(
      'INFRA',
      'PROVIDER_DUPLICATE',
      IAPAction.YIELD_TO_HUMAN,
      `manifest.cachePath "${manifest.cachePath}" does not match expected "${cachePath}"`,
      { component: 'probe-registry-store', name: manifest.name },
    )
  }

  const idx = list.findIndex((p) => p.name === manifest.name)
  if (idx >= 0) {
    list[idx] = manifest
  } else {
    list.push(manifest)
  }

  const body: RegistryFile = { version: REGISTRY_VERSION, providers: list }
  try {
    await mkdir(join(projectRoot, BOUNDARY_DIR, PROBES_DIR), { recursive: true })
    await writeFile(path, JSON.stringify(body, null, 2), { mode: 0o644 })
  } catch (err) {
    throw new IAPError(
      'INFRA',
      'PROVIDER_DUPLICATE',
      IAPAction.YIELD_TO_HUMAN,
      `registry.json write failed: ${(err as Error).message}`,
      { component: 'probe-registry-store', path },
    )
  }
}

/** 从 registry.json 移除一个 provider (同时删 cachePath 文件) */
export async function registryRemove(projectRoot: string, name: string): Promise<boolean> {
  const path = getRegistryPath(projectRoot)
  const list = await registryRead(projectRoot)
  const idx = list.findIndex((p) => p.name === name)
  if (idx < 0) return false

  list.splice(idx, 1)
  const body: RegistryFile = { version: REGISTRY_VERSION, providers: list }
  try {
    await writeFile(path, JSON.stringify(body, null, 2), { mode: 0o644 })
  } catch (err) {
    throw new IAPError(
      'INFRA',
      'PROVIDER_DUPLICATE',
      IAPAction.YIELD_TO_HUMAN,
      `registry.json write failed: ${(err as Error).message}`,
      { component: 'probe-registry-store', path },
    )
  }

  // 删 cachePath (best-effort, 失败不抛)
  const cachePath = getCachePath(projectRoot, name)
  try {
    await unlink(cachePath)
  } catch {
    // ignore
  }

  return true
}

/** 公开 cachePath 计算 (供 probe-add.ts 用) */
export { getCachePath, getCacheDir, getRegistryPath }
