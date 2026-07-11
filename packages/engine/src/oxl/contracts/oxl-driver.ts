/**
 * OxlDriver — OXL 入口抽象接口
 *
 * v0.7.0: Langium driver removed; mdast only
 */

import type { OxnAssetType, OxnScope } from '../scope/oxn-scope'

/**
 * OXL 中性文档（不暴露内部类型）
 */
export interface OxlDocument {
  /** 文档 URI（路径标识）*/
  uri: string
  /** 原始内容（.md）*/
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
 */
export interface OxlAstElement {
  $type: string
  $text?: string
  $range?: { start: { line: number; character: number }; end: { line: number; character: number } }
  [key: string]: unknown
}

/**
 * Driver 名称 (v0.7.0: mdast only)
 */
export type OxlDriverName = 'mdast'

/**
 * OxlDriver — 统一 driver 接口
 *
 * v0.7.0: Only MdastOxlDriver remains
 */
export interface OxlDriver {
  /** driver 名称 */
  readonly name: OxlDriverName

  /**
   * 解析文档
   */
  parse(content: string, options?: OxlParseOptions): Promise<OxlDocument>

  /**
   * 解析文件（从路径读取）
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
