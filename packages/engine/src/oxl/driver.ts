/**
 * src/oxl/driver.ts — v0.4 PR-C4 unified driver selector
 *
 * 角色：取代 src/oxl/md-bridge/driver-registry.ts
 *   driver-registry 提供 langium + mdast 运行时切换
 *   unified-native 后只剩 1 条解析路径 (unified pipeline), 不需要切换
 *   但保留 "driver" 概念作为向后兼容 facade (返回 unified 处理函数)
 *
 * 关键不变量：
 *   - 不感知 fs (只接收 content 字符串)
 *   - 不感知 OpenXenon Kernel (只输出 mdast)
 *   - 唯一 driver = 'unified' (替代 'langium' / 'mdast' 两个旧 driver)
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

/** 兼容旧 OxlDriverName ('langium' | 'mdast' 都被映射到 'unified') */
export type DriverName = 'langium' | 'mdast' | 'unified'

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

/**
 * 当前 active driver (统一 only, 旧 langium/mdast 别名映射为 unified)
 *
 * v0.6.1 PR-4 (D-β c 锁定): 默认从 'unified' → 'mdast' 语义保持。
 * 'langium' 仍保留入口（兼容旧 worker 测试），但默认走 'mdast' 后端。
 * v0.7.0 切割时 'langium' alias 完全删除（langium-driver/ 目录 git rm）。
 */
let activeDriverName: DriverName = 'mdast'

/** 获取 active driver (返回 unified driver) */
export function getActiveDriver(): UnifiedDriver {
  if (activeDriverName === 'langium' || activeDriverName === 'mdast') {
    // 兼容: 旧 driver 名映射到 unified
    return unifiedDriver
  }
  return unifiedDriver
}

/** 设置 active driver (兼容: 旧名都被接受, 实际都走 unified) */
export function setActiveDriver(name: DriverName): void {
  activeDriverName = name
}

/** 获取当前 driver 名 */
export function getActiveDriverName(): DriverName {
  return activeDriverName
}

/** 列出所有支持的 driver 名 (兼容: 显示 3 个名, 实际都走 unified) */
export function listDrivers(): DriverName[] {
  // v0.6.1 PR-4: 把 'mdast' 提到首位（默认）；'unified' 保留兼容 alias；'langium' 标为 deprecated
  return ['mdast', 'langium', 'unified']
}

/**
 * 兼容 facade: 旧 driver-registry 的 API
 *
 * 不再返回 langium/mdast 区分的 driver, 而是统一返回 UnifiedDriver.
 * 这是 compat 期间的最后一段代码 — v0.5 完全删除 driver-registry 概念.
 */
export function getDriver(name?: DriverName): UnifiedDriver {
  if (name) setActiveDriver(name)
  return getActiveDriver()
}
