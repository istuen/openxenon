/**
 * md-bridge/entity-compiler.ts — 5 类顶层实体的统一编译/解析/校验契约
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 定义 EntityCompiler 接口（compile/parse/validate 三方法）
 * - 5 类实体（domain/blueprint/work/task/proof）各有实现
 * - 注册到 EntityRegistry；通过 factory get(type) 调用
 *
 * 关键不变量：
 * - compile: Langium AST → .md 字符串
 * - parse:   mdast + frontmatter → 业务对象（喂 Zod）
 * - validate: 返 E_MD_xxx 错误列表（不抛异常，dispatcher 聚合）
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 * - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import type { Root } from 'mdast'
import type { IntentEntityType } from './pipeline.js'

// ========================
// 输入输出类型
// ========================

/** 编译输入：Langium AST 节点 + 选项 */
export interface CompileInput {
  /** Langium AST 节点（DomainDeclaration / BlueprintDeclaration / WorkDeclaration / TaskDeclaration / ProofDeclaration）*/
  decl: unknown
  options?: CompileOptions
}

/** 编译选项 */
export interface CompileOptions {
  /** 版本号（默认 '0.3.0'）*/
  version?: string
  /** 是否输出 frontmatter（默认 true）*/
  frontmatter?: boolean
  /** 源文件 SHA-256（嵌入 frontmatter 注释，可选）*/
  sourceHash?: string
}

/** 编译输出 */
export interface CompileOutput {
  /** 完整 .md 内容（包含 frontmatter + H1 实体 + H2 分类 + 嵌套列表）*/
  md: string
  /** 实体名（从 H1 提取）*/
  name: string
  /** 编译警告（非致命）*/
  warnings: string[]
}

/** 解析输入：mdast + frontmatter + 选项 */
export interface ParseInput {
  mdast: Root
  frontmatter: Record<string, unknown>
  options?: ParseOptions
  filePath?: string
}

/** 解析选项 */
export interface ParseOptions {
  /**
   * 是否允许旧 `:::intent{...}` 语法（v0.3 兼容期）
   * - false（默认）：检测到 `:::intent` 块抛 E_MD_DEPRECATED_SYNTAX
   * - true：跳过 `:::intent` 块（旧路径，仅 v0.3 过渡期使用，v0.4 移除）
   */
  allowLegacyDirective?: boolean
}

/** 校验输入 */
export interface ValidationInput {
  mdast: Root
  frontmatter: Record<string, unknown>
  filePath?: string
}

/** 校验错误（轻量级，不依赖 IAPError）*/
export interface ValidationError {
  /** 错误码（E_MD_xxx / E_OXL_xxx）*/
  code: string
  /** 错误消息 */
  message: string
  /** 源代码行（可选）*/
  line?: number
  /** 源代码列（可选）*/
  column?: number
  /** 严重程度：error 阻断 Proof；warning 不阻断 */
  severity: 'error' | 'warning'
  /** 错误字段名（可选，便于定位）*/
  field?: string
}

// ========================
// EntityCompiler 接口
// ========================

/**
 * EntityCompiler — 5 类顶层实体的统一契约
 *
 * 实现：DomainCompiler / BlueprintCompiler / WorkCompiler / TaskCompiler / ProofCompiler
 * 注册：EntityRegistry.register(compiler)
 * 调用：entityRegistry.get(type).compile/decompile/validate
 */
export interface EntityCompiler {
  /** 实体类型标识 */
  readonly entityType: IntentEntityType

  /** 编译：Langium AST → .md 字符串（PR-B 走实路径）*/
  compile(input: CompileInput): CompileOutput

  /** 解析：mdast + frontmatter → 业务对象（喂 Zod）*/
  parse(input: ParseInput): Record<string, unknown>

  /** 校验：返回 E_MD_xxx / E_OXL_xxx 错误列表 */
  validate(input: ValidationInput): ValidationError[]
}
