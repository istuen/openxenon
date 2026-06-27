/**
 * md-pipeline/transformers/domain.ts — v0.4 PR-C2 unified-native 实体抽取
 *
 * 角色：从 mdast Root 抽取 Domain 业务 IR (terms / bans / invariants / stack)
 * 取代 src/oxl/md-bridge/compilers/domain-compiler.ts 的 parse() 方法
 *
 * 关键不变量：
 *   - 输入是 mdast Root (from parseMarkdown())
 *   - 输出是 DomainIR 对象
 *   - 不感知 OpenXenon Kernel / fs
 *   - 复用 utils.ts 的 collectHeadingContexts / collectListFields
 *
 * 兼容性 (compat 期间)：
 *   - domain-compiler.ts 仍可工作
 *   - 本模块是 v0.4 unified-native 实现
 *   - 行为等价: 相同输入 → 相同 IR
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层
 *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Domain H2 分类白名单
// v0.4 RFC PR-A: 新增 'Stack' 类别（Q2 决策 — 软推荐）
// ========================

export const DOMAIN_CATEGORIES = ['Terms', 'Bans', 'Invariants', 'Stack'] as const
export type DomainCategory = (typeof DOMAIN_CATEGORIES)[number]

// ========================
// Domain IR 类型
// ========================

export interface DomainTerm {
  id: string
  name: string
  desc: string
}

export interface DomainBan {
  id: string
  items: string[]
  desc: string
}

export interface DomainInvariant {
  id: string
  value: string
  desc: string
}

export interface DomainStackEntry {
  id: string
  name: string
  fields: ListField[]
}

export interface DomainIR {
  entity: 'domain'
  name: string
  version: string
  /** v0.4.1: 从 H1 与首个 H2 之间的 `> blockquote` 抽取的域描述 */
  description: string
  terms: DomainTerm[]
  bans: DomainBan[]
  invariants: DomainInvariant[]
  stack: DomainStackEntry[]
  _counters: { termIdx: number; banIdx: number; invIdx: number; stackIdx: number }
}

// ========================
// slug helper
// ========================

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ========================
// 核心抽取函数 (unified-native, 取代 domain-compiler.parse)
// ========================

export function extractDomainIR(root: Root, frontmatter: Record<string, unknown> = {}): DomainIR {
  const contexts = collectHeadingContexts(root)

  const terms: DomainTerm[] = []
  const bans: DomainBan[] = []
  const invariants: DomainInvariant[] = []
  const stack: DomainStackEntry[] = []

  let termIdx = 0
  let banIdx = 0
  let invIdx = 0
  let stackIdx = 0

  for (const ctx of contexts) {
    if (!ctx.h2 || !ctx.h3) continue
    if (!DOMAIN_CATEGORIES.includes(ctx.h2 as DomainCategory)) continue

    const fields = ctx.h3List ? collectListFields(ctx.h3List) : []
    const descField = fields.find((f) => f.key === 'desc')
    const desc = typeof descField?.value === 'string' ? descField.value : ''

    switch (ctx.h2 as DomainCategory) {
      case 'Terms':
        termIdx++
        terms.push({
          id: `term-${slugify(ctx.h3)}`,
          name: ctx.h3,
          desc,
        })
        break
      case 'Bans':
        banIdx++
        bans.push({
          id: `ban-${banIdx}`,
          items: extractBanItems(fields, desc),
          desc,
        })
        break
      case 'Invariants':
        invIdx++
        invariants.push({
          id: `inv-${slugify(ctx.h3)}`,
          value: extractFirstFieldValue(fields, desc),
          desc,
        })
        break
      case 'Stack':
        stackIdx++
        stack.push({
          id: `stack-${slugify(ctx.h3)}`,
          name: ctx.h3,
          fields,
        })
        break
    }
  }

  return {
    entity: 'domain',
    name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
    version: frontmatter.version !== undefined && frontmatter.version !== null ? String(frontmatter.version) : '0.3.0',
    description: extractDescription(root),
    terms,
    bans,
    invariants,
    stack,
    _counters: { termIdx, banIdx, invIdx, stackIdx },
  }
}

function extractBanItems(fields: ListField[], desc: string): string[] {
  const itemsField = fields.find((f) => f.key === 'items')
  if (Array.isArray(itemsField?.value)) {
    return itemsField.value as string[]
  }
  return desc ? desc.split(',').map((s) => s.trim()) : []
}

function extractFirstFieldValue(fields: ListField[], fallback: string): string {
  const valueField = fields.find((f) => f.key === 'value')
  if (typeof valueField?.value === 'string') return valueField.value
  return fallback
}

/**
 * v0.4.1: 抽取 H1 与首个 H2 之间的 `> blockquote` 作为域描述
 * 例:
 *   # Domain: X
 *   > 这是描述文本
 *   ## Terms
 */
function extractDescription(root: Root): string {
  let seenH1 = false
  for (const child of root.children) {
    if (child.type === 'heading') {
      if (child.depth === 1) {
        seenH1 = true
        continue
      }
      if (child.depth === 2) {
        // 到达首个 H2, 描述段结束
        return ''
      }
    }
    if (seenH1 && child.type === 'blockquote') {
      // 提取 blockquote 内所有 paragraph 文本
      const texts: string[] = []
      for (const sub of child.children) {
        if (sub.type === 'paragraph') {
          const ps: string[] = []
          for (const p of sub.children) {
            if ('value' in p && typeof p.value === 'string') ps.push(p.value)
          }
          if (ps.length > 0) texts.push(ps.join(''))
        }
      }
      return texts.join(' ').trim()
    }
  }
  return ''
}

// ========================
// unified plugin 形式 (可选, 让用户能 compose 进 pipeline)
// ========================

/**
 * unified plugin: 从 mdast 抽取 DomainIR, 存储在 tree.data.domain
 *
 * @example
 * ```ts
 * const processor = unified()
 *   .use(remarkParse)
 *   .use(remarkFrontmatter)
 *   .use(remarkDomainExtractor())
 *   .use(remarkStringify)
 *
 * const tree = processor.parse(md)
 * processor.runSync(tree)
 * const ir = tree.data.domain // DomainIR
 * ```
 */
export function remarkDomainExtractor(): (tree: Root) => void {
  return (tree) => {
    // frontmatter 已在 remarkFrontmatter plugin 抽出
    // 这里只抽取 body 内容
    const frontmatter = extractYamlFromTree(tree)
    tree.data ??= {}
    ;(tree.data as Record<string, unknown>).domain = extractDomainIR(tree, frontmatter)
  }
}
