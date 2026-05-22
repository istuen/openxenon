/**
 * Task 2.1 — OXN 资产加载器
 *
 * 从 .oxn 文件加载资产，支持三级作用域扫描 + 索引构建。
 * 依赖 Task 1.4 的 OxnWorkspaceManager 进行文件系统解析。
 */
import { existsSync, readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { OxnWorkspaceManager } from '../scope/oxn-workspace-manager'
import type { OxnScope, OxnAssetType, ResolvedOxnAsset } from '../scope/oxn-scope'
import type {
  OxnAssemblyIR,
  OxnAssemblyTaskIR,
} from '../../kernel/schemas/oxn-assembly.schema'

export type { OxnScope, OxnAssetType }

export interface OxnLoadResult {
  /** 解析后的资产列表 */
  assets: ResolvedOxnAsset[]
  /** 所有 Blueprint IR */
  blueprints: OxnAssemblyIR[]
  /** 所有 Task IR */
  tasks: OxnAssemblyTaskIR[]
  /** 已加载文件路径集合 */
  loadedFiles: string[]
}

export class OxnAssetLoader {
  private workspace: OxnWorkspaceManager
  private index: Map<string, ResolvedOxnAsset[]> = new Map()

  constructor(projectRoot?: string) {
    this.workspace = new OxnWorkspaceManager({ projectRoot })
  }

  /** 加载指定类型的所有资产 */
  loadAll(type: OxnAssetType, scopes?: OxnScope[]): OxnLoadResult {
    const result: OxnLoadResult = { assets: [], blueprints: [], tasks: [], loadedFiles: [] }
    const scopeList = scopes || (['prj', 'glo', 'oxn'] as OxnScope[])

    for (const scope of scopeList) {
      const assets = this.workspace.list(scope, type)
      result.assets.push(...assets)
    }

    return result
  }

  /** 加载指定作用域和类型的资产 JSON 负载 */
  loadJson<T = Record<string, unknown>>(scope: OxnScope, type: OxnAssetType, name: string): T | null {
    const resolved = this.workspace.resolve(`@${scope}/${type}/${name}`)
    if (!resolved.asset) return null

    if ('content' in resolved.asset) {
      try {
        return parseYaml(resolved.asset.content) as T
      } catch {
        return null
      }
    }
    if ('data' in resolved.asset) {
      return resolved.asset.data as T
    }
    return null
  }

  /** 路径加载：直接读取文件 */
  loadFromPath(filePath: string): string | null {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf-8')
  }

  /** 构建资产索引（按作用域+类型） */
  buildIndex(): Map<string, ResolvedOxnAsset[]> {
    this.index.clear()
    const scopes: OxnScope[] = ['oxn', 'prj', 'glo']
    const types: OxnAssetType[] = ['probe', 'part', 'blueprint', 'interface']

    for (const scope of scopes) {
      for (const type of types) {
        const key = `${scope}:${type}`
        const assets = this.workspace.list(scope, type)
        if (assets.length > 0) {
          this.index.set(key, assets)
        }
      }
    }

    return this.index
  }

  /** 获取索引统计 */
  getIndexStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const [key, assets] of this.index) {
      stats[key] = assets.length
    }
    return stats
  }

  /** 获取工作空间管理器 */
  getWorkspace(): OxnWorkspaceManager {
    return this.workspace
  }
}

/** 便捷工厂 */
export function createAssetLoader(projectRoot?: string): OxnAssetLoader {
  return new OxnAssetLoader(projectRoot)
}
