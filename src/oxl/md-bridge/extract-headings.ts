/**
 * md-bridge/extract-headings.ts — H1/H2/H3 上下文栈提取器
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 维护 H1/H2/H3 上下文栈遍历 mdast
 * - 把 H3 与紧随的 list 节点关联
 * - 提取 HeadingContext 列表供 EntityCompiler 使用
 *
 * 关键不变量：
 * - H1 = 顶层实体（"# Domain: Name"）
 * - H2 = 分类（"## Terms" / "## Bans" / "## Invariants" / "## Props" / "## Slots" / "## Tasks" / "## Context"）
 * - H3 = 实例（"### Intent" / "### build"）
 * - H3 后紧邻的 list 节点 = 实例的属性列表
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 */

import type { Root, Heading, List, PhrasingContent } from 'mdast'

// ========================
// 类型
// ========================

/** Heading 上下文（一个 H3 实例的完整上下文）*/
export interface HeadingContext {
  /** 当前 H1 文本（"Domain: IntentAlignContext" 或空）*/
  h1: string | null

  /** 当前 H2 分类（"Terms" / "Bans" / "## Invariants" / ...）*/
  h2: string | null

  /** 当前 H3 实例名 */
  h3: string | null

  /** H3 后的 list 节点（属性列表）；可能为 null（H3 后无 list）*/
  h3List: List | null

  /** H3 的源位置（用于错误码 line/column）*/
  h3Position: { line: number; column: number } | null

  /** H1 源位置 */
  h1Position: { line: number; column: number } | null
}

// ========================
// 提取器
// ========================

/**
 * 遍历 mdast，提取所有 H3 实例的 HeadingContext。
 *
 * 行为：
 * 1. 遇到 H1 → 重置 h1/h2/h3 上下文
 * 2. 遇到 H2 → 重置 h3 上下文（h1 保留）
 * 3. 遇到 H3 → 创建新 context，h3List 占位为 null
 * 4. 遇到 list（且 h3 存在）→ 关联到最近一个 h3List 为 null 的 context
 * 5. 遇到 H4+ → 重置 h3 上下文（视为 list 子结构，不创建新 context）
 *
 * @example
 *   const contexts = extractHeadingContexts(mdast)
 *   for (const ctx of contexts) {
 *     if (ctx.h2 === 'Terms' && ctx.h3 && ctx.h3List) {
 *       const term = parseTerm(ctx.h3, extractListFields(ctx.h3List))
 *     }
 *   }
 */
export function extractHeadingContexts(mdast: Root): HeadingContext[] {
  const contexts: HeadingContext[] = []

  let currentH1: string | null = null
  let currentH1Position: { line: number; column: number } | null = null
  let currentH2: string | null = null
  let currentH3: string | null = null
  let pendingH3ContextIndex: number | null = null

  for (const child of mdast.children) {
    if (child.type === 'heading') {
      const heading = child as Heading
      const text = collectHeadingText(heading)
      const position = heading.position
        ? { line: heading.position.start.line, column: heading.position.start.column }
        : null

      if (heading.depth === 1) {
        currentH1 = text
        currentH1Position = position
        currentH2 = null
        currentH3 = null
        pendingH3ContextIndex = null
      } else if (heading.depth === 2) {
        currentH2 = text
        currentH3 = null
        pendingH3ContextIndex = null
      } else if (heading.depth === 3) {
        currentH3 = text
        const ctx: HeadingContext = {
          h1: currentH1,
          h2: currentH2,
          h3: currentH3,
          h3List: null,
          h3Position: position,
          h1Position: currentH1Position,
        }
        contexts.push(ctx)
        pendingH3ContextIndex = contexts.length - 1
      } else if (heading.depth >= 4) {
        // H4+ 视为 H3 的子结构；不创建新 context
        currentH3 = null
        pendingH3ContextIndex = null
      }
    } else if (child.type === 'list' && pendingH3ContextIndex !== null) {
      // 紧跟 H3 的第一个 list 节点
      const ctx = contexts[pendingH3ContextIndex]
      if (ctx && ctx.h3List === null) {
        ctx.h3List = child as List
      }
    }
  }

  return contexts
}

// ========================
// 辅助函数
// ========================

/** 收集 heading 内的纯文本（递归 children）*/
function collectHeadingText(heading: Heading): string {
  return collectTextFromChildren(heading.children).trim()
}

/** 递归收集 PhrasingContent 数组的纯文本 */
function collectTextFromChildren(children: PhrasingContent[]): string {
  return children
    .map((child) => {
      if (child.type === 'text' || child.type === 'inlineCode') {
        return child.value
      }
      if ('children' in child && Array.isArray(child.children)) {
        return collectTextFromChildren(child.children as PhrasingContent[])
      }
      return ''
    })
    .join('')
}

/**
 * 工具：查找第一个匹配的 H1（"# Entity: Name"）
 *
 * @example
 *   const h1 = findH1(mdast)
 *   // h1.text = "Domain: IntentAlignContext"
 *   // h1.entity = "Domain"
 *   // h1.name = "IntentAlignContext"
 */
export interface ParsedH1 {
  text: string
  entity: string | null
  name: string | null
  position: { line: number; column: number } | null
}

export function findH1(mdast: Root): ParsedH1 | null {
  for (const child of mdast.children) {
    if (child.type === 'heading' && child.depth === 1) {
      const text = collectHeadingText(child as Heading)
      const position = (child as Heading).position
        ? { line: (child as Heading).position!.start.line, column: (child as Heading).position!.start.column }
        : null

      // 解析 "# Entity: Name" 形式
      const match = text.match(/^([A-Z][A-Za-z]*)\s*:\s*(.+)$/)
      if (match) {
        return {
          text,
          entity: match[1] ?? null,
          name: match[2]?.trim() ?? null,
          position,
        }
      }
      return { text, entity: null, name: text, position }
    }
  }
  return null
}

/** 工具：提取 H2 分类列表（保持顺序）*/
export function extractH2Categories(mdast: Root): string[] {
  const categories: string[] = []
  for (const child of mdast.children) {
    if (child.type === 'heading' && child.depth === 2) {
      categories.push(collectHeadingText(child as Heading))
    }
  }
  return categories
}
