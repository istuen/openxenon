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
import { extractHeadingContexts, type HeadingContext } from '../md-pipeline/utils.js'
import { extractListFields } from '../md-pipeline/utils.js'

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
 * v0.3.0 canonical: 纯 MD 形式（H1 + ## Terms/Bans/Invariants + ### 实例 + 列表）
 * 替代旧的 `:::intent{type="term"}` 容器指令
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

  const name = extractDomainName(result.title)

  // v0.3.0 canonical: 从 H1/H2/H3 + 列表读 term/ban/invariant
  const contexts = extractHeadingContexts(result.mdast)
  const blocks = {
    terms: contexts
      .filter((c: HeadingContext) => c.h2 === 'Terms' && c.h3 && c.h3List && !c.h3List.ordered)
      .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'term')),
    bans: contexts
      .filter((c: HeadingContext) => c.h2 === 'Bans' && c.h3 && c.h3List && !c.h3List.ordered)
      .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'ban')),
    invariants: contexts
      .filter((c: HeadingContext) => c.h2 === 'Invariants' && c.h3 && c.h3List && !c.h3List.ordered)
      .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'invariant')),
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
 *
 * v0.3.0 canonical: ## Props / ## Slots + ### 实例 + 列表
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

  // v0.3.0 canonical: 从 H3 列表读 prop/slot/probe
  const contexts = extractHeadingContexts(result.mdast)
  const props = contexts
    .filter((c: HeadingContext) => c.h2 === 'Props' && c.h3 && c.h3List && !c.h3List.ordered)
    .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'prop'))
  const slots = contexts
    .filter((c: HeadingContext) => c.h2 === 'Slots' && c.h3 && c.h3List && !c.h3List.ordered)
    .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'slot'))
  // probes 内联在 part 内（canonical 形式），不在独立 ## Probes；保留 empty 数组向后兼容
  const probes = contexts
    .filter((c: HeadingContext) => c.h2 === 'Probes' && c.h3 && c.h3List && !c.h3List.ordered)
    .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'probe'))

  return {
    name,
    frontmatter: result.frontmatter,
    title: result.title,
    props,
    slots,
    probes,
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
 *
 * v0.3.0 canonical: ## Context / ## Tasks + ### 实例 + 列表
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

  // v0.3.0 canonical: 从 H3 列表读 context/task
  const contexts = extractHeadingContexts(result.mdast)
  const ctxBlocks = contexts
    .filter((c: HeadingContext) => c.h2 === 'Context' && c.h3 && c.h3List && !c.h3List.ordered)
    .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'context'))
  const tasks = contexts
    .filter((c: HeadingContext) => c.h2 === 'Tasks' && c.h3 && c.h3List && !c.h3List.ordered)
    .map((c: HeadingContext) => h3ContextToIntentBlock(c, 'task'))

  return {
    name,
    frontmatter: result.frontmatter,
    title: result.title,
    contexts: ctxBlocks,
    tasks,
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

// ========================
// v0.3.0 canonical 辅助函数
// ========================

/**
 * 把 H3 + 列表上下文转成 IntentBlock 形状（向后兼容旧 API）
 * - attributes: 把列表字段拍平为 { key: value } 字符串字典
 * - content: 描述 / 业务含义等人类可读内容
 */
function h3ContextToIntentBlock(
  ctx: { h3: string | null; h3List: import('mdast').List | null; h3Position: { line: number; column: number } | null },
  type: string,
): IntentBlock {
  const name = ctx.h3 ?? ''
  const attributes: Record<string, string> = { id: name, name, type }
  const content: string[] = []

  if (ctx.h3List) {
    const fields = extractListFields(ctx.h3List)
    for (const f of fields) {
      const v = Array.isArray(f.value) ? f.value.join(', ') : String(f.value)
      attributes[f.key] = v
      content.push(`${f.key}: ${v}`)
    }
  }

  return {
    name: 'intent',
    attributes,
    content,
    node: ctx.h3List as unknown as import('mdast').RootContent,
    position: ctx.h3Position ? { start: ctx.h3Position, end: ctx.h3Position } : undefined,
  }
}
