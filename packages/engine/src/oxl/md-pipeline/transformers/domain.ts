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
 *
 * 🆕 v0.7.4 (Asset 结构 v2 收编)：free-form Group 名兼容
 *   - 旧 ## Terms / ## Bans / ## Invariants 直接映射（向后兼容）
 *   - 新 ## Concept / ## Forbidden / ## Boundary / ## DocModality 等按 GROUP_TO_CATEGORY 映射
 *   - Axiom 体字段负载推断：`- value:` → Invariant / `- items:` → Ban / `- desc:` → Term
 *   - 自由文本项（无 key: value 形式）归为 _text 合成字段
 *
 * 详见 docs/dev/zh-cn/asset-structure-v2.md 与 RFC-0017。
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Domain H2 分类白名单
// v0.4 RFC PR-A: 新增 'Stack' 类别（Q2 决策 — 软推荐）
// ========================

export const DOMAIN_CATEGORIES = ['Terms', 'Bans', 'Invariants', 'Stack'] as const
export type DomainCategory = (typeof DOMAIN_CATEGORIES)[number]

/**
 * v0.7.4: Asset 结构 v2（design-asset-structure-unification）允许 Group 名 free-form。
 * Group → Axiom → Theorem 三层结构下，Engine 必须按 Axiom 体字段负载推断类型：
 *   - 有 `- value:` 字段 → Invariant
 *   - 有 `- items:` 列表（值数组） → Ban
 *   - 否则（仅 `- desc:` 或纯文本） → Term
 *
 * 同时保留旧 ## Terms/Bans/Invariants 兼容识别（按 Group 名推断）。
 */
const GROUP_TO_CATEGORY: Record<string, DomainCategory> = {
  // 旧结构
  Terms: 'Terms',
  Bans: 'Bans',
  Invariants: 'Invariants',
  Stack: 'Stack',
  // v0.7.4：Asset 结构 v2 free-form Group 名 → 默认 Category
  Concept: 'Terms',
  Forbidden: 'Bans',
  Boundary: 'Invariants',
  Practice: 'Terms',
  Foundation: 'Terms',
  Phases: 'Terms',
  Reference: 'Terms',
  FailureHandling: 'Terms',
  Quality: 'Terms',
  ToolchainRule: 'Terms',
  UseWorkflow: 'Terms',
  UseDomain: 'Terms',
  UseStack: 'Terms',
  Scenes: 'Terms',
}

/**
 * v3.2.1 同步：暴露 GROUP_TO_CATEGORY 的 keys 给 md-bridge/compilers/domain-compiler.ts
 * validate() 用它作为「合法 Domain H2 Group 名」白名单。
 *
 * 注：包含 `Stack` 是因为 v0.7.4 free-form Group 名不限；v0.7 PR-1 的「## Stack 应被拒绝」
 * 决策已被 v2 free-form 语义取代（Stack 作为 Group 名仍允许；只是不再映射到内部 Category）。
 */
export const VALID_DOMAIN_GROUP_NAMES: readonly string[] = Object.keys(GROUP_TO_CATEGORY)

function classifyAxiom(categoryPrefix: string, fields: ListField[], desc: string): DomainCategory {
  // 1. 旧结构 H2 名直接映射（Terms / Bans / Invariants / Stack）
  if (
    categoryPrefix === 'Terms' ||
    categoryPrefix === 'Bans' ||
    categoryPrefix === 'Invariants' ||
    categoryPrefix === 'Stack'
  ) {
    return categoryPrefix as DomainCategory
  }
  // 2. v0.7.4 free-form Group：按 Axiom 体字段负载推断（最强信号）
  //    - value → Invariants
  //    - items → Bans
  if (fields.some((f) => f.key === 'value')) return 'Invariants'
  if (fields.some((f) => f.key === 'items')) return 'Bans'
  // 3. 形态 C：Group 名映射（Forbidden → Bans / Boundary → Invariants 等）
  if (categoryPrefix in GROUP_TO_CATEGORY) {
    return GROUP_TO_CATEGORY[categoryPrefix]!
  }
  // 4. 仅有 `- desc:` 字段（无 value / items / Group mapping）→ Term
  if (desc || fields.some((f) => f.key === 'desc')) return 'Terms'
  // 5. 完全未知 Group + 无 desc → 默认 Term（兼容未来 Group 名）
  return 'Terms'
}

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
  /** v0.7.3 P2: 标记 items 是否来自真实 `- items:` 列表（true）vs fallback 从 - desc: 派生（false） */
  itemsFromItemsList: boolean
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
    // 🆕 v0.7.3 P2: support `## Terms: <Group>` style headings
    // (extract category prefix from "Terms: Work" → "Terms")
    // 🆕 v0.7.4: free-form Group（Asset 结构 v2）：按 Axiom 体字段负载推断类型
    const rawCategoryPrefix = (ctx.h2.split(':')[0] ?? '').trim()
    // Externals 由 parseDomainExternals 单独处理；不在 IR 通用收编范围
    if (rawCategoryPrefix === 'Externals') continue
    const fields = ctx.h3List ? collectListFields(ctx.h3List) : []
    const descField = fields.find((f) => f.key === 'desc')
    const desc = typeof descField?.value === 'string' ? descField.value : ''
    const categoryPrefix = classifyAxiom(rawCategoryPrefix, fields, desc)

    switch (categoryPrefix) {
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
        {
          const { items, itemsFromItemsList } = extractBanItems(fields, desc)
          bans.push({
            id: `ban-${banIdx}`,
            items,
            itemsFromItemsList,
            desc,
          })
        }
        break
      case 'Invariants':
        invIdx++
        invariants.push({
          id: `inv-${slugify(ctx.h3)}`,
          value: extractFirstFieldValue(fields, desc) || extractFreeTextFromFields(fields),
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

function extractFirstFieldValue(fields: ListField[], fallback: string): string {
  const valueField = fields.find((f) => f.key === 'value')
  if (typeof valueField?.value === 'string') return valueField.value
  return fallback
}

/**
 * v0.7.4: 收集 Axiom 体所有 free-text list 行（Asset 结构 v2 形态 A）。
 * 例如 `### Inv1\n- 5 AssetKind 白名单不可混用...` → "5 AssetKind 白名单不可混用..."
 * 用于 Invariant / Term / Ban 在缺 `value:` / `items:` / `desc:` 字段时回退。
 */
function extractFreeTextFromFields(fields: ListField[]): string {
  const texts: string[] = []
  for (const f of fields) {
    if (f.key !== '_text') continue
    if (typeof f.value === 'string' && f.value.length > 0) {
      texts.push(f.value)
    }
  }
  return texts.join(' / ')
}

function extractBanItems(fields: ListField[], desc: string): { items: string[]; itemsFromItemsList: boolean } {
  const itemsField = fields.find((f) => f.key === 'items')
  if (Array.isArray(itemsField?.value) && itemsField.value.length > 0) {
    return { items: itemsField.value as string[], itemsFromItemsList: true }
  }
  // 🆕 v0.7.4: Asset 结构 v2 形态 A 下 Ban Axiom 体是一组 `- <name>` 自由行
  // （被 collectListFields 归类为 `_text` synthetic fields）
  const textFields = fields.filter((f) => f.key === '_text' && typeof f.value === 'string' && f.value.length > 0)
  if (textFields.length > 0) {
    return {
      items: textFields.map((f) => (f.value as string).trim()).filter(Boolean),
      itemsFromItemsList: true,
    }
  }
  return { items: desc ? desc.split(',').map((s) => s.trim()) : [], itemsFromItemsList: false }
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
