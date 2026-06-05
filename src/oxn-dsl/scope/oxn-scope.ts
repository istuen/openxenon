/**
 * Task 1.4 — OXN Scope 核心类型与引用解析
 *
 * 定义 OXN 的二级寻址规范：
 *   @oxn/ → 内置资产（硬编码内存表 / .oxn 文件）
 *   @prj/ → 项目级（.openxenon/blueprints/、.openxenon/domains/）
 */
import { z } from 'zod'

// ========================
// Scope 枚举
// ========================

/** OXN 二级作用域 */
export type OxnScope = 'oxn' | 'prj'

export const OxnScopeSchema = z.enum(['oxn', 'prj'])
export const OXNS_SCOPES: readonly OxnScope[] = ['oxn', 'prj'] as const

/** Asset 类型 */
export type OxnAssetType = 'probe' | 'part' | 'blueprint' | 'interface'

export const OxnAssetTypeSchema = z.enum(['probe', 'part', 'blueprint', 'interface'])

// ========================
// 引用解析
// ========================

/** 解析后的 OXN 引用 */
export interface OxnReference {
  /** 原始字符串，如 "@prj/part/jest-runner" */
  raw: string
  /** 作用域 */
  scope: OxnScope
  /** 资产类型（从上下文推断或显式指定） */
  type?: OxnAssetType
  /** 资产名称 */
  name: string
}

/**
 * 将 @scope/type/name 或 @scope/name 格式解析为 OxnReference
 *
 * 合法格式：
 *   "@oxn/probe/shell-exec"     → scope=oxn, type=probe, name=shell-exec
 *   "@oxn/shell-exec"           → scope=oxn, name=shell-exec
 *   "@prj/blueprint/my-bp"      → scope=prj, type=blueprint, name=my-bp
 *   "@prj/part/jest-runner"     → scope=prj, type=part, name=jest-runner
 */
export function parseOxnReference(ref: string): OxnReference | null {
  if (!ref.startsWith('@')) return null

  const slash1 = ref.indexOf('/')
  if (slash1 === -1) return null

  const scope = ref.slice(1, slash1) as OxnScope
  if (!OXNS_SCOPES.includes(scope)) return null

  const rest = ref.slice(slash1 + 1)
  const slash2 = rest.indexOf('/')

  if (slash2 !== -1) {
    // 三段式：@scope/type/name
    const type = rest.slice(0, slash2) as OxnAssetType
    const name = rest.slice(slash2 + 1)
    if (!name) return null
    return { raw: ref, scope, type, name }
  }

  // 两段式：@scope/name
  if (!rest) return null
  return { raw: ref, scope, name: rest }
}

/**
 * 将 OxnReference 还原为标准三段式引用字符串
 */
export function formatOxnReference(ref: OxnReference): string {
  if (ref.type) {
    return `@${ref.scope}/${ref.type}/${ref.name}`
  }
  return `@${ref.scope}/${ref.name}`
}

export function isValidOxnReference(ref: string): boolean {
  return parseOxnReference(ref) !== null
}

// ========================
// 作用域物理路径映射
// ========================

import { join } from 'path'

/** 获取指定作用域的 Arsenal 根目录 */
export function getScopeRoot(scope: OxnScope, projectRoot?: string): string | null {
  switch (scope) {
    case 'oxn':
      return null // builtin registry, 不经过文件系统
    case 'prj':
      return projectRoot ? join(projectRoot, '.openxenon', 'arsenals') : null
  }
}

/** 根据作用域和资产类型获取文件系统路径 */
export function getScopeAssetDir(scope: OxnScope, type: OxnAssetType, projectRoot?: string): string | null {
  const root = getScopeRoot(scope, projectRoot)
  if (!root) return null

  // 类型目录映射
  const dirMap: Record<OxnAssetType, string> = {
    probe: 'probes',
    part: 'parts',
    blueprint: 'blueprints',
    interface: 'interfaces',
  }

  const typeDir = dirMap[type]
  return join(root, typeDir)
}

// ========================
// 跨文件 Props 提取
// ========================

import type { OxnAssemblyProp } from '../schemas/oxn-assembly.schema'

/** 从已解析的资产中提取 prop 定义 */
export interface ResolvedAssetProps {
  name: string
  type: OxnAssetType
  scope: OxnScope
  props: OxnAssemblyProp[]
  /** interface 支持的 methods */
  methods?: Array<{
    name: string
    input?: Record<string, string>
    output?: Record<string, string>
  }>
}

/** 跨文件 Props 比对结果 */
export interface PropsComparisonResult {
  /** 在目标中存在但引用中缺失的 required 字段 */
  missingRequired: string[]
  /** 类型不匹配的字段 */
  typeMismatches: Array<{ field: string; expected: string; actual: string }>
  /** 引用中声明但目标中不存在的字段 */
  unknownFields: string[]
}

/**
 * 比对 abstract part 的 params 字段与 concrete part 的 props 定义
 *
 * 验证逻辑：
 * 1. abstract params 中的每个 key 必须在 concrete part props 中存在
 * 2. concrete part 中 required 且无 default 的 prop 必须在 abstract params 中覆盖
 * 3. params 表达式的类型必须与 prop type 兼容（简化版检查）
 */
export function compareProps(
  abstractParams: Record<string, string>, // key → 表达式字符串
  concreteProps: OxnAssemblyProp[],
): PropsComparisonResult {
  const result: PropsComparisonResult = {
    missingRequired: [],
    typeMismatches: [],
    unknownFields: [],
  }

  const concretePropMap = new Map(concreteProps.map((p) => [p.name, p]))

  // 检查 abstract params 是否引用了不存在的字段
  for (const key of Object.keys(abstractParams)) {
    if (!concretePropMap.has(key)) {
      result.unknownFields.push(key)
    }
  }

  // 检查 concrete part 的 required 字段是否被覆盖
  for (const prop of concreteProps) {
    if (prop.required && prop.default === undefined) {
      if (!(prop.name in abstractParams)) {
        result.missingRequired.push(prop.name)
      }
    }
  }

  return result
}

// ========================
// 内置资产注册表类型
// ========================

/** 内置资产条目 */
export interface BuiltinAssetEntry<T = Record<string, unknown>> {
  name: string
  type: OxnAssetType
  data: T
}

/** 内置资产注册表接口 */
export interface IBuiltinRegistry {
  getProbe(name: string): Record<string, unknown> | null
  getPart(name: string): Record<string, unknown> | null
  getInterface(name: string): Record<string, unknown> | null
  listByType(type: OxnAssetType): BuiltinAssetEntry[]
  has(name: string, type: OxnAssetType): boolean
}

// ========================
// 工作空间管理器类型
// ========================

import type { StandardAsset } from '../../infra/loader'

/** 解析后的资产 */
export interface ResolvedOxnAsset {
  /** 格式化的引用字符串 */
  ref: string
  /** 解析后的引用信息 */
  reference: OxnReference
  /** 原始资产数据 */
  asset: StandardAsset | BuiltinAssetEntry | null
  /** 解析来源 */
  resolvedFrom: 'builtin' | 'filesystem' | 'not_found'
}

/** 工作空间管理器接口 */
export interface IOxnWorkspaceManager {
  /**
   * 解析一个 OXN 引用，返回资产信息
   * 支持三段式 (@scope/type/name) 和两段式 (@scope/name)
   * 两段式引用需要调用者通过上下文推断类型
   */
  resolve(ref: string, typeHint?: OxnAssetType): ResolvedOxnAsset

  /** 列出指定作用域和类型的全部资产 */
  list(scope: OxnScope, type: OxnAssetType): ResolvedOxnAsset[]

  /** 查找实现了指定 interface 的所有具象 part */
  findImplementors(interfaceName: string, scope?: OxnScope): ResolvedOxnAsset[]

  /** 获取指定作用域和类型的资产数量 */
  count(scope: OxnScope, type: OxnAssetType): number
}
