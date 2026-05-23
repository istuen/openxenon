/**
 * Task 1.4 — OXN 工作空间管理器
 *
 * 实现三级寻址的跨文件资源解析：
 *   @oxn/ → OxnBuiltinRegistry (内存表)
 *   @prj/ → .openxenon/arsenals/ (项目文件系统)
 *   @glo/ → ~/.openxenon/arsenals/ (全局文件系统)
 *
 * 同时适配现有 YAML 资产体系，为未来的 .oxn 文件体系预留接口。
 */
import { existsSync, readdirSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'

import { getBuiltinRegistry, type OxnBuiltinRegistry } from './oxn-builtin-registry'
import type {
  BuiltinAssetEntry,
  IOxnWorkspaceManager,
  OxnAssetType,
  OxnReference,
  OxnScope,
  ResolvedOxnAsset,
} from './oxn-scope'
import { getScopeAssetDir, parseOxnReference } from './oxn-scope'

// ========================
// 配置
// ========================

export interface OxnWorkspaceConfig {
  /** 项目根目录（用于 @prj/ 解析） */
  projectRoot?: string
  /** 全局 Arsenal 目录（默认 ~/.openxenon/arsenals） */
  globalRoot?: string
  /** 支持的文件后缀列表 */
  supportedExtensions: string[]
}

const DEFAULT_CONFIG: OxnWorkspaceConfig = {
  projectRoot: process.cwd(),
  globalRoot: join(homedir(), '.openxenon', 'arsenals'),
  supportedExtensions: ['.yaml', '.yml', '.json', '.oxn'],
}

// ========================
// 文件系统扫描
// ========================

interface FileSystemAsset {
  name: string
  type: OxnAssetType
  path: string
  content: string
}

/**
 * 扫描指定目录下的资产文件
 * 支持两种布局：
 *   1. 扁平布局：probes/<name>.yaml
 *   2. 目录布局：probes/<name>/canonical.yaml（优先）
 */
function scanDirectory(dir: string, type: OxnAssetType): FileSystemAsset[] {
  if (!existsSync(dir)) return []

  const typeDirMap: Record<OxnAssetType, string> = {
    probe: 'probes',
    part: 'parts',
    blueprint: 'blueprints',
    interface: 'interfaces',
  }

  const typeDir = join(dir, typeDirMap[type])
  if (!existsSync(typeDir)) return []

  const assets: FileSystemAsset[] = []
  const seen = new Set<string>()
  const entries = readdirSync(typeDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // 目录布局：<name>/canonical.yaml
      const canonicalFile = join(typeDir, entry.name, 'canonical.yaml')
      if (existsSync(canonicalFile) && !seen.has(entry.name)) {
        seen.add(entry.name)
        assets.push({
          name: entry.name,
          type,
          path: canonicalFile,
          content: readFileSync(canonicalFile, 'utf-8'),
        })
      }
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml') || entry.name.endsWith('.oxn')) {
      // 扁平布局：<name>.yaml
      const name = entry.name.replace(/\.(yaml|yml|oxn)$/, '')
      if (!seen.has(name)) {
        seen.add(name)
        assets.push({
          name,
          type,
          path: join(typeDir, entry.name),
          content: readFileSync(join(typeDir, entry.name), 'utf-8'),
        })
      }
    }
  }

  return assets
}

// ========================
// Workspace Manager 实现
// ========================

export class OxnWorkspaceManager implements IOxnWorkspaceManager {
  private config: OxnWorkspaceConfig
  private builtin: OxnBuiltinRegistry

  /** 文件系统缓存：scope:type → 资产列表 */
  private _fsCache: Map<string, FileSystemAsset[]> = new Map()

  /** 已解析资产的缓存 */
  private _resolveCache: Map<string, ResolvedOxnAsset> = new Map()

  constructor(config?: Partial<OxnWorkspaceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.builtin = getBuiltinRegistry()
  }

  // ---- 核心解析 ----

  resolve(ref: string, typeHint?: OxnAssetType): ResolvedOxnAsset {
    const cached = this._resolveCache.get(ref)
    if (cached) return cached

    const result = this._doResolve(ref, typeHint)
    this._resolveCache.set(ref, result)
    return result
  }

  private _doResolve(ref: string, typeHint?: OxnAssetType): ResolvedOxnAsset {
    const parsed = parseOxnReference(ref)
    if (!parsed) {
      return {
        ref,
        reference: {
          raw: ref,
          scope: 'prj',
          type: typeHint,
          name: ref,
        },
        asset: null,
        resolvedFrom: 'not_found',
      }
    }

    const type = parsed.type ?? typeHint ?? 'part' // 默认视为 part
    const reference: OxnReference = { ...parsed, type }

    if (parsed.scope === 'oxn') {
      return this._resolveBuiltin(reference)
    }

    return this._resolveFilesystem(reference)
  }

  private _resolveBuiltin(ref: OxnReference): ResolvedOxnAsset {
    const type = ref.type ?? 'probe'
    const name = ref.name

    let data: Record<string, unknown> | null = null
    switch (type) {
      case 'probe':
        data = this.builtin.getProbe(name)
        break
      case 'part':
        data = this.builtin.getPart(name)
        break
      case 'interface':
        data = this.builtin.getInterface(name)
        break
    }

    if (data) {
      return {
        ref: `@oxn/${type}/${name}`,
        reference: ref,
        asset: { name, type, data },
        resolvedFrom: 'builtin',
      }
    }

    return {
      ref: `@oxn/${type}/${name}`,
      reference: ref,
      asset: null,
      resolvedFrom: 'not_found',
    }
  }

  private _resolveFilesystem(ref: OxnReference): ResolvedOxnAsset {
    const dir = getScopeAssetDir(ref.scope, ref.type ?? 'part', this.config.projectRoot)
    if (!dir) {
      return {
        ref: ref.raw,
        reference: ref,
        asset: null,
        resolvedFrom: 'not_found',
      }
    }

    const assets = this._scanType(ref.scope, ref.type ?? 'part')
    const found = assets.find((a) => a.name === ref.name)

    if (found) {
      return {
        ref: `@${ref.scope}/${found.type}/${found.name}`,
        reference: ref,
        asset: {
          name: found.name,
          type: found.type,
          state: 'canonical',
          path: found.path,
          content: found.content,
        } as any,
        resolvedFrom: 'filesystem',
      }
    }

    return {
      ref: ref.raw,
      reference: ref,
      asset: null,
      resolvedFrom: 'not_found',
    }
  }

  // ---- 列表查询 ----

  list(scope: OxnScope, type: OxnAssetType): ResolvedOxnAsset[] {
    if (scope === 'oxn') {
      return this.builtin.listByType(type).map((entry) => ({
        ref: `@oxn/${type}/${entry.name}`,
        reference: {
          raw: `@oxn/${type}/${entry.name}`,
          scope: 'oxn',
          type,
          name: entry.name,
        },
        asset: entry,
        resolvedFrom: 'builtin' as const,
      }))
    }

    const assets = this._scanType(scope, type)
    return assets.map((a) => ({
      ref: `@${scope}/${a.type}/${a.name}`,
      reference: {
        raw: `@${scope}/${a.type}/${a.name}`,
        scope,
        type: a.type,
        name: a.name,
      },
      asset: {
        name: a.name,
        type: a.type,
        state: 'canonical' as const,
        path: a.path,
        content: a.content,
      } as any,
      resolvedFrom: 'filesystem' as const,
    })) as ResolvedOxnAsset[]
  }

  findImplementors(interfaceName: string, scope?: OxnScope): ResolvedOxnAsset[] {
    const scopes = scope ? [scope] : (['prj', 'glo', 'oxn'] as OxnScope[])

    const results: ResolvedOxnAsset[] = []

    for (const s of scopes) {
      const parts = this.list(s, 'part')
      for (const p of parts) {
        if (p.asset && typeof p.asset === 'object' && 'data' in p.asset) {
          const data = (p.asset as BuiltinAssetEntry).data
          if (data && typeof data === 'object' && 'implements' in data && data.implements === interfaceName) {
            results.push(p)
          }
        } else if (p.asset && 'content' in p.asset) {
          try {
            const parsed = parseYaml(p.asset.content) as Record<string, unknown>
            if (parsed.implements === interfaceName) {
              results.push(p)
            }
          } catch {
            // skip unparseable
          }
        }
      }
    }

    return results
  }

  count(scope: OxnScope, type: OxnAssetType): number {
    return this.list(scope, type).length
  }

  // ---- 缓存管理 ----

  /** 清除缓存（文件系统变更后调用） */
  invalidateCache(scope?: OxnScope, type?: OxnAssetType): void {
    if (scope && type) {
      this._fsCache.delete(`${scope}:${type}`)
    } else {
      this._fsCache.clear()
    }
    this._resolveCache.clear()
  }

  // ---- 内部方法 ----

  private _scanType(scope: OxnScope, type: OxnAssetType): FileSystemAsset[] {
    const key = `${scope}:${type}`
    if (this._fsCache.has(key)) {
      return this._fsCache.get(key)!
    }

    let dir: string | null = null
    if (scope === 'prj' && this.config.projectRoot) {
      dir = join(this.config.projectRoot, '.openxenon', 'arsenals')
    } else if (scope === 'glo') {
      dir = this.config.globalRoot ?? join(homedir(), '.openxenon', 'arsenals')
    }

    if (!dir) {
      const empty: FileSystemAsset[] = []
      this._fsCache.set(key, empty)
      return empty
    }

    const assets = scanDirectory(dir, type)
    this._fsCache.set(key, assets)
    return assets
  }
}

// ========================
// 工厂函数
// ========================

let _workspaceInstance: OxnWorkspaceManager | null = null

export function getWorkspaceManager(config?: Partial<OxnWorkspaceConfig>): OxnWorkspaceManager {
  if (config) {
    return new OxnWorkspaceManager(config)
  }
  if (!_workspaceInstance) {
    _workspaceInstance = new OxnWorkspaceManager()
  }
  return _workspaceInstance
}

export function createWorkspaceManager(config: Partial<OxnWorkspaceConfig> = {}): OxnWorkspaceManager {
  return new OxnWorkspaceManager(config)
}
