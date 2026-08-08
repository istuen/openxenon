/**
 * md-pipeline/utils.ts — v0.4 PR-C1 unified-native 工具集
 *
 * 角色：用 mdast-util-visit / mdast-util-to-markdown 取代自研层。
 *   - extract-headings.ts     →  collectHeadings() (mdast-util-visit)
 *   - extract-list-fields.ts  →  collectListFields() (mdast-util-visit)
 *   - mdast-validator.ts      →  remark-canonical plugin (PR-C3)
 *   - driver-registry.ts      →  删 (PR-C4)
 *
 * 不变量：
 *   - 不感知 fs（只接收 Root AST）
 *   - 不感知 OpenXenon Kernel（只输出 mdast 工具函数）
 *   - 输入输出 AST 是标准 mdast（unified 生态通用）
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层（src/oxl/md-pipeline/）
 *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import type { Heading, List, ListItem, Paragraph, PhrasingContent, Root, Text } from 'mdast'
import { visit } from 'unist-util-visit'

/**
 * 收集所有 H1/H2/H3 节点 (typed, indexed by depth)
 * 取代 extract-headings.ts 的手写遍历
 */
export interface CollectedHeading {
  depth: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  position?: { start: { line: number; column: number } }
  children?: Heading['children']
}

export function collectHeadings(root: Root): CollectedHeading[] {
  const result: CollectedHeading[] = []
  visit(root, 'heading', (node: Heading) => {
    const text = (node.children ?? [])
      .filter((c: PhrasingContent): c is Text => c.type === 'text')
      .map((c: Text) => c.value)
      .join('')
    result.push({
      depth: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
      text,
      position: node.position,
      children: node.children,
    })
  })
  return result
}

/**
 * 找 H1 节点 (取代 extract-headings.ts 的 findH1)
 */
export function findFirstHeading(root: Root, depth: 1 | 2 | 3 | 4 | 5 | 6 = 1): CollectedHeading | null {
  let found: CollectedHeading | null = null
  visit(root, 'heading', (node: Heading) => {
    if (node.depth === depth && !found) {
      const text = (node.children ?? [])
        .filter((c: PhrasingContent): c is Text => c.type === 'text')
        .map((c: Text) => c.value)
        .join('')
      found = {
        depth: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
        text,
        position: node.position,
        children: node.children,
      }
    }
  })
  return found
}

/**
 * 收集 H2 + H3 嵌套结构 (取代 extractHeadingContexts 的核心逻辑)
 * @returns Array of { h2, h3, h3List } tuples
 */
export interface HeadingContext {
  h2: string | null
  h3: string | null
  h3List: List | null
  h3Position: { line: number; column: number } | null
  /** 兼容字段：H3 下的 H4 子章节 (旧 extractHeadingContexts API) */
  h4Sections?: Array<{ title: string; list: List | null }>
}

export function collectHeadingContexts(root: Root): HeadingContext[] {
  const contexts: HeadingContext[] = []
  let currentH2: string | null = null

  for (const child of root.children) {
    if (child.type === 'heading') {
      const h = child as Heading
      const text = (h.children ?? [])
        .filter((c: PhrasingContent): c is Text => c.type === 'text')
        .map((c: Text) => c.value)
        .join('')
      if (h.depth === 2) {
        currentH2 = text
      } else if (h.depth === 3 && currentH2) {
        // 检测后续 H4 节点（兼容旧 API）
        const h4Sections: Array<{ title: string; list: List | null }> = []
        for (let j = root.children.indexOf(child) + 1; j < root.children.length; j++) {
          const next = root.children[j]!
          if (next.type === 'heading') {
            const nh = next as Heading
            if (nh.depth < 4) break // 遇到更浅的 heading 退出
            if (nh.depth === 4) {
              const title = (nh.children ?? [])
                .filter((c: PhrasingContent): c is Text => c.type === 'text')
                .map((c: Text) => c.value)
                .join('')
              h4Sections.push({ title, list: null })
            }
          } else if (next.type === 'list' && h4Sections.length > 0) {
            h4Sections[h4Sections.length - 1]!.list = next as List
          }
        }
        contexts.push({
          h2: currentH2,
          h3: text,
          h3List: null,
          h3Position: h.position?.start ?? null,
          h4Sections: h4Sections.length > 0 ? h4Sections : undefined,
        })
      }
    } else if (child.type === 'list' && contexts.length > 0 && !contexts[contexts.length - 1]!.h3List) {
      // 紧跟 H3 的 list 节点 → 作为 h3List 关联
      const last = contexts[contexts.length - 1]!
      if (last.h3 && last.h3Position) {
        const prevIdx = root.children.indexOf(child) - 1
        const prev = prevIdx >= 0 ? root.children[prevIdx] : null
        if (prev?.type === 'heading' && (prev as Heading).depth === 3) {
          last.h3List = child as List
        }
      }
    }
  }

  return contexts
}

/**
 * 收集列表项中的 key-value 字段 (取代 extractListFields 的核心)
 * - "list" 节点下, "listItem" 内的 paragraph 第一个 child 是 text
 * - 该 text 形如 "key: value" → 拆分为 { key, value }
 */
export interface ListField {
  key: string
  value: string | string[] | null
  raw: string
}

/** 从 fields 数组取单个 string 值 (compat: 取代 extract-list-fields.ts 的 getScalar) */
export function getScalar(fields: ListField[], key: string): string | null {
  const f = fields.find((x) => x.key === key)
  if (!f) return null
  if (typeof f.value === 'string') return f.value
  if (Array.isArray(f.value)) return f.value.join(', ')
  return null
}

/** 从 fields 数组取 array 值 (compat: 取代 extract-list-fields.ts 的 getArray) */
export function getArray(fields: ListField[], key: string): string[] {
  const f = fields.find((x) => x.key === key)
  if (!f) return []
  // 1) 嵌套 list（arr 来自 collectListFields 的 visit）
  if (Array.isArray(f.value) && f.value.length > 0 && typeof f.value[0] === 'string') {
    return f.value as string[]
  }
  // 2) inline 数组语法 `key: [a, b, c]`（v0.7.3 P5 工作项 task.deps 场景）
  if (typeof f.value === 'string') {
    const m = f.value.match(/^\s*\[(.*)\]\s*$/)
    if (m) {
      return m[1]!
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    }
  }
  // 3) 空 inline / 标量 → []
  return []
}

export function collectListFields(list: List): ListField[] {
  const fields: ListField[] = []
  for (const item of list.children) {
    if (item.type !== 'listItem') continue
    const li = item as ListItem
    // 第一个 paragraph 包含 "key: value" 主行
    const firstPara = (li.children ?? []).find((c: ListItem['children'][number]) => c.type === 'paragraph') as
      | Paragraph
      | undefined
    if (!firstPara) continue
    const firstText = (firstPara.children ?? []).find((c: Paragraph['children'][number]) => c.type === 'text') as
      | Text
      | undefined
    if (!firstText) continue
    const raw = firstText.value
    // 🆕 v0.7.3 P2: 用 's' flag 让 . 匹配 newline（支持 multiline - desc: | YAML block scalar）
    const m = raw.match(/^([\w-]+):\s*(.*)$/s)
    if (!m) {
      // 🆕 v0.7.4: 自由文本行（Asset 结构 v2 形态 A: `- <Theorem>` 无 key: value）
      // 视为 `_text` synthetic field，供 Axiom 体回退（desc / value / items 缺省时）
      fields.push({ key: '_text', value: raw.trim(), raw })
      continue
    }
    const [, key, value] = m as unknown as [string, string, string]
    // 嵌套 list 作为 array value
    const nestedList = (li.children ?? []).find((c: ListItem['children'][number]) => c.type === 'list') as
      | List
      | undefined
    if (nestedList) {
      const arr: string[] = []
      visit(nestedList, 'listItem', (n: ListItem) => {
        const txt = (n.children ?? []).find((c: ListItem['children'][number]) => c.type === 'paragraph') as
          | Paragraph
          | undefined
        if (txt) {
          const t = (txt.children ?? []).find((c: Paragraph['children'][number]) => c.type === 'text') as
            | Text
            | undefined
          if (t) arr.push(t.value)
        }
      })
      fields.push({ key, value: arr, raw })
    } else {
      // 剥首尾引号 (兼容 YAML 风格的 "value" / 'value')
      let trimmed = value.trim()
      // 🆕 v0.7.3 P2: 支持 YAML block scalar 标记 `|` `|-` `>+`
      //   `- desc: |\n  line1\n  line2` → "line1\nline2"
      if (/^[|>][+-]?$/.test(trimmed.split('\n')[0] ?? '')) {
        const lines = trimmed.split('\n').slice(1)
        trimmed = lines.join('\n').trim()
      } else {
        trimmed = trimmed.replace(/^["']|["']$/g, '')
      }
      fields.push({ key, value: trimmed || null, raw })
    }
  }
  return fields
}

/**
 * unified 入口: 把 markdown 字符串解析成 mdast Root
 * 取代 pipeline.ts 的部分功能
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkStringify from 'remark-stringify'

/**
 * Parse markdown into mdast Root + extract frontmatter.
 * remarkFrontmatter plugin removes the yaml node from tree.children and stores
 * parsed frontmatter in `tree.data.frontmatter` (via processor.run).
 */
export function parseMarkdown(content: string): { tree: Root; frontmatter: Record<string, unknown> } {
  const processor = unified().use(remarkParse).use(remarkFrontmatter)
  const tree = processor.parse(content) as Root
  processor.runSync(tree)
  // remark-frontmatter v11 不解析 yaml 内部数据, 只把 yaml 节点留在 tree.children
  // 这里用简单正则提取 key: value 对
  return {
    tree,
    frontmatter: extractYamlFromTree(tree),
  }
}

/**
 * 从 mdast 提取 yaml frontmatter (简单 key: value 解析, 不引入 js-yaml)
 *
 * v0.7.1+ 扩展支持：
 *   - inline array `key: []` / `key: [a, b, c]`
 *   - block sequence `key:\n  - a\n  - b`
 *   - 标量 `key: value` / `key: "string"` / `key: true|false` / `key: 123`
 *
 * 不支持（仍未支持的 YAML 特性，如需要请改用 js-yaml）：
 *   - 嵌套 map（key: \n  sub: v）
 *   - block scalar `key: |` 多行字符串
 *   -锚点 / 别名 / 引用
 */
export function extractYamlFromTree(tree: Root): Record<string, unknown> {
  const fm: Record<string, unknown> = {}
  for (const child of tree.children) {
    if (child.type !== 'yaml') continue
    const value = (child as { value: string }).value
    const lines = value.split('\n')
    let i = 0
    while (i < lines.length) {
      const line = lines[i]!
      const m = line.match(/^([\w-]+):\s*(.*)$/)
      if (!m) {
        i++
        continue
      }
      const key = m[1]!
      const v = m[2]!.trim()

      // inline array: `key: []` or `key: [a, b, "c"]`
      if (v.startsWith('[') && v.endsWith(']')) {
        const inner = v.slice(1, -1).trim()
        fm[key] = inner === '' ? [] : inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
        i++
        continue
      }

      // block sequence: `key:` 后续行 `\s+- item`
      if (v === '') {
        const items: string[] = []
        let j = i + 1
        while (j < lines.length) {
          const nextLine = lines[j]!
          const seqMatch = nextLine.match(/^\s+-\s+(.*)$/)
          if (seqMatch) {
            items.push(seqMatch[1]!.trim().replace(/^["']|["']$/g, ''))
            j++
          } else {
            break
          }
        }
        if (items.length > 0) {
          fm[key] = items
          i = j
          continue
        }
        fm[key] = ''
        i++
        continue
      }

      // scalar
      if (v === 'true') fm[key] = true
      else if (v === 'false') fm[key] = false
      else if (/^\d+$/.test(v)) fm[key] = Number(v)
      else fm[key] = v.replace(/^["']|["']$/g, '')
      i++
    }
  }
  return fm
}

/**
 * unified 出口: 把 mdast Root 序列化回 markdown 字符串
 * 用于 work.md / domain-md / blueprint-md / proof-md 等 round-trip
 */
export function stringifyMarkdown(root: Root): string {
  return unified().use(remarkStringify).stringify(root)
}

/**
 * 计算 Root 节点数 (sanity check)
 */
export function countNodes(root: Root): number {
  let n = 0
  visit(root, () => {
    n++
  })
  return n
}

// =============================================================================
// v0.4 PR-C4: 兼容别名 (compat aliases for self-developed md-bridge layer)
// =============================================================================
//
// 这些函数被 5 compilers (work/task/domain/blueprint/proof) 调用.
// PR-C4 把 extract-headings.ts / extract-list-fields.ts 删掉后,
// 这 2 个别名让 5 compilers 无需改 import 路径即可继续工作.
// 旧 md-bridge mdast-to-kernel.ts / mdast-validator.ts 也用这些别名.

/** @deprecated use collectHeadingContexts instead */
export const extractHeadingContexts = collectHeadingContexts
/** @deprecated use collectListFields instead */
export const extractListFields = collectListFields

/**
 * @deprecated use findFirstHeading instead
 * 提供旧 API 兼容: { entity, name, text, position: { line, column } }
 * 新 findFirstHeading 返回 { depth, text, position: mdast.Position, children }
 */
export function findH1(
  root: Root,
  depth: 1 | 2 | 3 | 4 | 5 | 6 = 1,
): {
  entity: string | null
  name: string | null
  text: string
  position: { line: number; column: number } | null
} | null {
  const h = findFirstHeading(root, depth)
  if (!h) return null
  const m = h.text.match(/^(\w+):\s*(.+)$/)
  return {
    entity: m ? m[1]! : null,
    name: m ? m[2]!.trim() : null,
    text: h.text,
    position: h.position?.start ?? null,
  }
}
