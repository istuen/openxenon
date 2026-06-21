/**
 * md-bridge/remark-to-mdast.ts — .md → mdast AST 完整转换器
 *
 * v0.3 阶段 1 T3 任务
 *
 * 角色：
 * - 提供语义更清晰的 mdast 转换 API
 * - 在 pipeline.ts 基础上提供 5 类 Intent 实体的专门转换器
 * - 支持 rich 错误信息（带行/列位置）
 *
 * 关键不变量：
 * - 复用 pipeline.ts 的 unified 链
 * - 为每种 Intent 实体（domain/blueprint/work/task/proof）提供专门 API
 * - 错误抛出 E_MD_INVALID_SYNTAX 带行/列号
 */

import type { Root, Heading } from 'mdast'
import { runMdPipeline, type PipelineInput, type PipelineOutput, type IntentBlock } from './pipeline.js'

// ========================
// 类型
// ========================

/** mdast 转换结果（语义清晰版）*/
export interface MdastConversionResult extends PipelineOutput {
  /** 一级标题（# Title）*/
  title: string
  /** 一级标题外的 heading 列表（## Term / ## 业务规则 等）*/
  headings: Heading[]
  /** 顶层段落数 */
  paragraphCount: number
  /** 顶层列表数 */
  listCount: number
  /** 顶层代码块数 */
  codeBlockCount: number
}

// ========================
// 主入口
// ========================

/**
 * .md → mdast 完整转换（语义增强版）
 *
 * 与 pipeline.ts 的区别：
 * - 提取 title（一级标题）
 * - 提取所有 heading
 * - 统计段落/列表/代码块
 * - 提供 rich 错误信息
 *
 * @example
 * ```ts
 * const result = remarkToMdast({
 *   content: '# Domain: Order\n\n## Term\n\n:::intent{...}\n- rule\n:::',
 *   entity: 'domain',
 * })
 * console.log(result.title) // 'Domain: Order'
 * console.log(result.intents.length) // 1
 * ```
 */
export function remarkToMdast(input: PipelineInput): MdastConversionResult {
  const pipelineResult = runMdPipeline(input)

  // 提取 title（一级标题的文本）
  const title = extractTitle(pipelineResult.mdast)

  // 提取所有 heading（不含 title）
  const headings = extractHeadings(pipelineResult.mdast)

  // 统计
  let paragraphCount = 0
  let listCount = 0
  let codeBlockCount = 0

  for (const child of pipelineResult.mdast.children) {
    if (child.type === 'paragraph') paragraphCount++
    else if (child.type === 'list') listCount++
    else if (child.type === 'code') codeBlockCount++
  }

  return {
    ...pipelineResult,
    title,
    headings,
    paragraphCount,
    listCount,
    codeBlockCount,
  }
}

// ========================
// 5 类 Intent 实体专门 API
// ========================

/** Domain 解析结果 */
export interface DomainParseResult {
  /** Domain 名（PascalCase）*/
  name: string
  /** frontmatter */
  frontmatter: Record<string, unknown>
  /** title（# Domain: X）*/
  title: string
  /** term/ban/invariant 块 */
  blocks: {
    terms: IntentBlock[]
    bans: IntentBlock[]
    invariants: IntentBlock[]
  }
  /** 一级标题外的 heading */
  headings: Heading[]
  /** contentHash */
  contentHash: string
}

/**
 * 解析 Domain MD
 *
 * 期望结构：
 * ```md
 * ---
 * entity: domain
 * version: 0.3.0
 * ---
 *
 * # Domain: OrderContext
 *
 * :::intent{#term-1 type="term" scope="domain"}
 * Order 业务实体定义
 * :::
 *
 * ## Term: Order
 * | 属性 | 说明 |
 * | id | 唯一标识 |
 * ```
 */
export function parseDomainMd(content: string, filePath?: string): DomainParseResult {
  const result = remarkToMdast({ content, entity: 'domain', filePath })

  if (!result.success) {
    throw new MdastParseError(
      result.errors.map((e) => e.message).join('; '),
      result.errors[0]?.line,
      result.errors[0]?.column,
      'E_MD_INVALID_SYNTAX',
    )
  }

  // 提取 name（从 title）
  const name = extractDomainName(result.title)

  // 按 type 分类 intents
  const blocks = {
    terms: result.intents.filter((i) => i.attributes.type === 'term'),
    bans: result.intents.filter((i) => i.attributes.type === 'ban'),
    invariants: result.intents.filter((i) => i.attributes.type === 'invariant'),
  }

  return {
    name,
    frontmatter: result.frontmatter,
    title: result.title,
    blocks,
    headings: result.headings,
    contentHash: result.contentHash,
  }
}

/** Blueprint 解析结果 */
export interface BlueprintParseResult {
  /** Blueprint 名（kebab-case）*/
  name: string
  /** frontmatter */
  frontmatter: Record<string, unknown>
  /** title（# Blueprint: X）*/
  title: string
  /** prop 块（parameter 声明）*/
  props: IntentBlock[]
  /** slot 块（拓扑占位）*/
  slots: IntentBlock[]
  /** probe 块（验证探针）*/
  probes: IntentBlock[]
  /** contentHash */
  contentHash: string
}

/**
 * 解析 Blueprint MD
 */
export function parseBlueprintMd(content: string, filePath?: string): BlueprintParseResult {
  const result = remarkToMdast({ content, entity: 'blueprint', filePath })

  if (!result.success) {
    throw new MdastParseError(
      result.errors.map((e) => e.message).join('; '),
      result.errors[0]?.line,
      result.errors[0]?.column,
      'E_MD_INVALID_SYNTAX',
    )
  }

  const name = extractBlueprintName(result.title)

  return {
    name,
    frontmatter: result.frontmatter,
    title: result.title,
    props: result.intents.filter((i) => i.attributes.type === 'prop'),
    slots: result.intents.filter((i) => i.attributes.type === 'slot'),
    probes: result.intents.filter((i) => i.attributes.type === 'probe'),
    contentHash: result.contentHash,
  }
}

/** Work 解析结果 */
export interface WorkParseResult {
  /** Work 名（kebab-case）*/
  name: string
  /** frontmatter */
  frontmatter: Record<string, unknown>
  /** title（# Work: X）*/
  title: string
  /** context 块 */
  contexts: IntentBlock[]
  /** task 块（嵌套的 task 列表）*/
  tasks: IntentBlock[]
  /** contentHash */
  contentHash: string
}

/**
 * 解析 Work MD
 */
export function parseWorkMd(content: string, filePath?: string): WorkParseResult {
  const result = remarkToMdast({ content, entity: 'work', filePath })

  if (!result.success) {
    throw new MdastParseError(
      result.errors.map((e) => e.message).join('; '),
      result.errors[0]?.line,
      result.errors[0]?.column,
      'E_MD_INVALID_SYNTAX',
    )
  }

  const name = extractWorkName(result.title)

  return {
    name,
    frontmatter: result.frontmatter,
    title: result.title,
    contexts: result.intents.filter((i) => i.attributes.type === 'context'),
    tasks: result.intents.filter((i) => i.attributes.type === 'task'),
    contentHash: result.contentHash,
  }
}

// ========================
// 错误类型
// ========================

export class MdastParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'MdastParseError'
  }
}

// ========================
// 辅助函数
// ========================

/** 提取一级标题文本 */
function extractTitle(mdast: Root): string {
  const h1 = mdast.children.find((n): n is Heading => n.type === 'heading' && n.depth === 1)
  if (!h1) return ''
  return collectHeadingText(h1)
}

/** 提取所有 heading（不含 h1）*/
function extractHeadings(mdast: Root): Heading[] {
  return mdast.children.filter((n): n is Heading => n.type === 'heading' && n.depth >= 2)
}

/** 收集 heading 内的纯文本 */
function collectHeadingText(heading: Heading): string {
  return heading.children
    .map((child) => {
      if (child.type === 'text') return child.value
      if ('children' in child) {
        return child.children.map((c) => (c.type === 'text' ? c.value : '')).join('')
      }
      return ''
    })
    .join('')
    .trim()
}

/** 从 "Domain: X" 提取 X */
function extractDomainName(title: string): string {
  const match = title.match(/^Domain:\s*(.+)$/i)
  return match ? (match[1]?.trim() ?? '') : title.trim()
}

/** 从 "Blueprint: X" 提取 X */
function extractBlueprintName(title: string): string {
  const match = title.match(/^Blueprint:\s*(.+)$/i)
  return match ? (match[1]?.trim() ?? '') : title.trim()
}

/** 从 "Work: X" 提取 X */
function extractWorkName(title: string): string {
  const match = title.match(/^Work:\s*(.+)$/i)
  return match ? (match[1]?.trim() ?? '') : title.trim()
}
