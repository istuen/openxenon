/**
 * src/oxl/driver.ts — v0.7.0 unified driver selector
 *
 * 角色：取代 src/oxl/md-bridge/driver-registry.ts
 *   v0.7.0 后只剩 1 条解析路径 (unified pipeline), 不需要切换
 *   保留 "driver" 概念作为 facade (返回 unified 处理函数)
 *
 * 关键不变量：
 *   - 不感知 fs (只接收 content 字符串)
 *   - 不感知 OpenXenon Kernel (只输出 mdast)
 *   - 唯一 driver = 'unified'
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层
 *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import { parseMarkdown } from './md-pipeline/utils'
import {
  extractDomainIR,
  extractBlueprintIR,
  extractWorkIR,
  extractTaskIR,
  extractProofIR,
  validateCanonical,
  type RemarkCanonicalOptions,
} from './md-pipeline'

export type AssetType = 'domain' | 'blueprint' | 'work' | 'task' | 'proof'

export type DriverName = 'unified'

/** 统一 driver 接口 — 仅 1 个 driver, 返回 parse + extract 入口 */
export interface UnifiedDriver {
  readonly name: 'unified'
  parse(content: string): {
    tree: ReturnType<typeof parseMarkdown>['tree']
    frontmatter: Record<string, unknown>
  }
  extract<T extends AssetType>(
    type: T,
    tree: ReturnType<typeof parseMarkdown>['tree'],
    frontmatter: Record<string, unknown>,
  ): ExtractByAssetType<T>
  validate(
    tree: ReturnType<typeof parseMarkdown>['tree'],
    options: RemarkCanonicalOptions,
  ): ReturnType<typeof validateCanonical>
}

type ExtractByAssetType<T extends AssetType> = T extends 'domain'
  ? ReturnType<typeof extractDomainIR>
  : T extends 'blueprint'
    ? ReturnType<typeof extractBlueprintIR>
    : T extends 'work'
      ? ReturnType<typeof extractWorkIR>
      : T extends 'task'
        ? ReturnType<typeof extractTaskIR>
        : T extends 'proof'
          ? ReturnType<typeof extractProofIR>
          : never

const unifiedDriver: UnifiedDriver = {
  name: 'unified',
  parse(content) {
    const { tree, frontmatter } = parseMarkdown(content)
    return { tree, frontmatter }
  },
  extract(type, tree, frontmatter) {
    switch (type) {
      case 'domain':
        return extractDomainIR(tree, frontmatter) as never
      case 'blueprint':
        return extractBlueprintIR(tree, frontmatter) as never
      case 'work':
        return extractWorkIR(tree, frontmatter) as never
      case 'task':
        return extractTaskIR(tree, frontmatter) as never
      case 'proof':
        return extractProofIR(tree, frontmatter) as never
    }
  },
  validate(tree, options) {
    return validateCanonical(tree, options)
  },
}

/** 获取 active driver (返回 unified driver) */
export function getActiveDriver(): UnifiedDriver {
  return unifiedDriver
}

/** 获取当前 driver 名 */
export function getActiveDriverName(): DriverName {
  return 'unified'
}

/** 列出所有支持的 driver 名 */
export function listDrivers(): DriverName[] {
  return ['unified']
}

/**
 * 兼容 facade: 旧 driver-registry 的 API
 *
 * v0.7.0 后不再返回 langium/mdast 区分的 driver, 统一返回 UnifiedDriver.
 */
export function getDriver(_name?: DriverName): UnifiedDriver {
  return unifiedDriver
}
