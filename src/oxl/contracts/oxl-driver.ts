/**
 * OxlDriver — OXL 入口抽象接口
 *
 * 阶段：v0.3.0 Step 1.2（路线 C v3 + Intent 边界）
 *
 * 设计目标：
 * - 把 OXL 入口抽象为"driver"模式
 * - langium 和 mdast 各实现一个 driver
 * - v0.3 阶段 1 默认 langium，阶段 2 引入 mdast 双轨
 * - v0.5.0 后可完全删除 langium（仅保留 mdast）
 *
 * 关键不变量：
 * - Kernel 不知 OXL/driver 存在
 * - driver 暴露的 OxlDocument 是中性数据结构（不暴露 Langium 内部类型）
 * - 通过 contracts/oxl-driver.ts 作为统一契约
 */

import type { OxnAssetType, OxnScope } from '../scope/oxn-scope'

/**
 * OXL 中性文档（不暴露 Langium/mdast 内部类型）
 */
export interface OxlDocument {
  /** 文档 URI（路径标识）*/
  uri: string
  /** 原始内容（.oxn 或 .md）*/
  content: string
  /** 解析后的根节点（driver-specific AST）*/
  ast: unknown
  /** driver 名称 */
  driver: OxlDriverName
  /** 解析错误 */
  parseErrors: string[]
  /** 词法错误 */
  lexerErrors: string[]
  /** 文档元数据 */
  meta: {
    /** 内容 SHA-256 */
    contentHash: string
    /** 解析耗时（ms）*/
    parseTime: number
    /** 实体类型（domain/blueprint/work/task/probe/proof）*/
    entityType?: string
  }
}

/**
 * 解析选项
 */
export interface OxlParseOptions {
  /** 文件路径 */
  filePath?: string
  /** 资产类型提示（影响解析策略）*/
  assetType?: OxnAssetType
  /** 作用域（oxn / prj）*/
  scope?: OxnScope
}

/**
 * AST 元素类型（driver 中性）
 *
 * 每个 driver 把内部 AST 节点包装为统一格式：
 * - $type: 元素类型
 * - $text: 文本内容
 * - $range: 源码位置
 * - 其他字段：driver-specific
 */
export interface OxlAstElement {
  $type: string
  $text?: string
  $range?: { start: { line: number; character: number }; end: { line: number; character: number } }
  [key: string]: unknown
}

/**
 * Driver 名称
 */
export type OxlDriverName = 'langium' | 'mdast'

/**
 * OxlDriver — 统一 driver 接口
 *
 * 实现：
 * - LangiumOxlDriver：基于 Langium + chevrotain 解析 .oxn
 * - MdastOxlDriver：基于 unified + remark + mdast 解析 .md
 */
export interface OxlDriver {
  /** driver 名称 */
  readonly name: OxlDriverName

  /**
   * 解析文档
   * @param content 文件内容
   * @param options 解析选项
   * @returns 解析后的中性文档
   */
  parse(content: string, options?: OxlParseOptions): Promise<OxlDocument>

  /**
   * 解析文件（从路径读取）
   * @param filePath 文件绝对路径
   * @returns 解析后的中性文档
   */
  parseFile(filePath: string): Promise<OxlDocument>

  /**
   * 重置 driver 状态（单例缓存清理）
   */
  reset(): void

  /**
   * 获取 driver 元数据
   */
  getMetadata(): OxlDriverMetadata
}

/**
 * Driver 元数据
 */
export interface OxlDriverMetadata {
  /** driver 名称 */
  name: OxlDriverName
  /** 支持的文件扩展名 */
  fileExtensions: string[]
  /** 解析器版本 */
  parserVersion: string
  /** 描述 */
  description: string
}
