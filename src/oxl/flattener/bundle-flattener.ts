/**
 * Task 2.2 — OXN 扁平化引擎
 *
 * 递归解析 ref 外部引用，扁平化拼接为单体 .bundle.oxn。
 * 保留 prop 和 params 模板占位符（不求值），消除外部依赖。
 */

import type { OxnAssemblyBundle, OxnAssemblyBundleEntity } from '../schemas/oxn-assembly.schema'
import type { OxnAssetType } from '../scope/oxn-scope'
import { OxnWorkspaceManager } from '../scope/oxn-workspace-manager'

export interface FlattenOptions {
  maxDepth?: number // 最大递归深度，默认 3
  keepMetadata?: boolean // 是否保留元数据注释
}

const DEFAULT_OPTIONS: FlattenOptions = { maxDepth: 3, keepMetadata: true }

export interface FlattenResult {
  /** 扁平化后的 Bundle */
  bundle: OxnAssemblyBundle
  /** 被内联的外部引用列表 */
  inlinedRefs: string[]
  /** 未解析的引用 */
  unresolved: string[]
}

export class BundleFlattener {
  private workspace: OxnWorkspaceManager
  private visited: Set<string> = new Set()
  private inlinedRefs: string[] = []
  private unresolved: string[] = []
  private depth: number = 0
  private options: FlattenOptions

  constructor(options?: Partial<FlattenOptions>) {
    this.workspace = new OxnWorkspaceManager()
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * 扁平化一个 Bundle：递归解析所有外部引用并内联
   */
  flatten(bundle: OxnAssemblyBundle): FlattenResult {
    this.visited.clear()
    this.inlinedRefs = []
    this.unresolved = []
    this.depth = 0

    const flatEntities: OxnAssemblyBundleEntity[] = []

    for (const entity of bundle.entities) {
      this._flattenEntity(entity, flatEntities)
    }

    return {
      bundle: { entities: flatEntities },
      inlinedRefs: this.inlinedRefs,
      unresolved: this.unresolved,
    }
  }

  /**
   * 扁平化并输出为 .oxn 源码字符串
   */
  flattenToString(bundle: OxnAssemblyBundle): string {
    const { bundle: flatBundle } = this.flatten(bundle)
    return this._bundleToOxnString(flatBundle)
  }

  private _flattenEntity(entity: OxnAssemblyBundleEntity, result: OxnAssemblyBundleEntity[]): void {
    // 防循环
    const entityKey = `${entity.type}:${(entity.data as { name?: string }).name || 'unnamed'}`
    if (this.visited.has(entityKey)) return
    this.visited.add(entityKey)

    // 递归深度限制
    if (this.depth >= (this.options.maxDepth || 3)) {
      result.push(entity)
      return
    }

    // 解析 entity 中的外部引用
    if (entity.type === 'part' || entity.type === 'blueprint') {
      this._resolvePartRefs(entity, result)
    }

    result.push(entity)
  }

  private _resolvePartRefs(entity: OxnAssemblyBundleEntity, result: OxnAssemblyBundleEntity[]): void {
    const data = entity.data as Record<string, unknown>

    // 解析 probes 中的 ref
    const probes = data.probes as Array<Record<string, unknown>> | undefined
    if (probes) {
      for (const probe of probes) {
        const ref = probe.ref as string | undefined
        if (ref?.startsWith('@')) {
          this._inlineRef(ref, 'probe', result)
        }
      }
    }

    // 解析 implements
    const implementsRef = data.implements as string | undefined
    if (implementsRef && typeof implementsRef === 'string') {
      // 标记但不内联（interface 是契约型资产）
      this.inlinedRefs.push(`implements:${implementsRef}`)
    }
  }

  private _inlineRef(ref: string, type: OxnAssetType, result: OxnAssemblyBundleEntity[]): void {
    const resolved = this.workspace.resolve(ref, type)
    if (resolved.asset) {
      this.inlinedRefs.push(ref)
      this.depth++

      let entity: OxnAssemblyBundleEntity | null = null
      if ('data' in resolved.asset) {
        entity = {
          type: resolved.asset.type,
          data: resolved.asset.data as Record<string, unknown>,
        } as OxnAssemblyBundleEntity
      } else if ('content' in resolved.asset) {
        const { parse: parseYaml } = require('yaml')
        try {
          entity = {
            type: resolved.asset.type,
            data: parseYaml(resolved.asset.content),
          } as unknown as OxnAssemblyBundleEntity
        } catch {
          /* skip */
        }
      }

      if (entity) {
        result.push(entity)
      }

      this.depth--
    } else {
      this.unresolved.push(ref)
    }
  }

  private _bundleToOxnString(bundle: OxnAssemblyBundle): string {
    const lines: string[] = ['// === OXN Bundle (assembly) ===']

    for (const entity of bundle.entities) {
      const data = entity.data as Record<string, unknown>
      const name = data.name || data.id || 'unnamed'

      switch (entity.type) {
        case 'probe':
          lines.push(`probe "${name}" {`)
          lines.push(`  description = "${data.description || name}"`)
          if (data.props) {
            const props = data.props as Array<Record<string, unknown>>
            for (const p of props) {
              lines.push(`  prop "${p.name}" { type = ${p.type}${p.required ? '; required = true' : ''} }`)
            }
          }
          lines.push('}')
          break
        case 'part':
          lines.push(`part "${name}" {`)
          if (data.implements) lines.push(`  implements = "${data.implements}"`)
          if (data.execution && Array.isArray(data.execution)) {
            lines.push(`  execution = [${data.execution.join(', ')}]`)
          }
          lines.push('}')
          break
        case 'blueprint':
          lines.push(`blueprint "${name}" {`)
          lines.push(`  version = ${data._version || 1}`)
          lines.push('}')
          break
        default:
          lines.push(`// ${entity.type} "${name}"`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

export function flattenBundle(bundle: OxnAssemblyBundle, options?: Partial<FlattenOptions>): FlattenResult {
  return new BundleFlattener(options).flatten(bundle)
}
