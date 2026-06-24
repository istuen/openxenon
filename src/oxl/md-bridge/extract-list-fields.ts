/**
 * md-bridge/extract-list-fields.ts — 列表字段递归提取器
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 递归提取 list 节点的所有字段
 * - 区分标量 / 数组 / 嵌套字段三种形态
 *
 * 关键不变量：
 * - 不依赖固定缩进空格数（mdast 树形结构天然支持）
 * - 只依赖 listItem.children 的父子关系
 * - 嵌套 list 节点的 listItem.children 递归处理
 *
 * 形态识别：
 * - "- key: value" → { key, value: string }
 * - "- key:" 后接纯 list（listItem 内是标量文本）→ { key, value: string[] }
 * - "- key:" 后接嵌套 list（listItem 内是 "- subkey: value"）→ { key, value: ListField[] }
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 */

import type { List, ListItem, Paragraph, PhrasingContent } from 'mdast'

// ========================
// 类型
// ========================

/** 列表字段（标量 / 数组 / 嵌套字段 三选一）*/
export interface ListField {
  /** 字段名（去掉冒号与空白）*/
  key: string
  /** 字段值 */
  value: ListFieldValue
}

/** 字段值类型 */
export type ListFieldValue = string | string[] | ListField[]

/** 提取选项 */
export interface ExtractOptions {
  /** 最大嵌套深度（默认 3，PR-A RFC §3.4 约束）*/
  maxDepth?: number
}

// ========================
// 主提取器
// ========================

/**
 * 递归提取 list 节点的所有字段
 *
 * @example
 *   const list = parseList(mdast) // - type: enum
 *                                  // - values: [dev, staging]
 *                                  // - required: true
 *   const fields = extractListFields(list)
 *   // [
 *   //   { key: 'type', value: 'enum' },
 *   //   { key: 'values', value: ['dev', 'staging'] },
 *   //   { key: 'required', value: 'true' }
 *   // ]
 */
export function extractListFields(list: List, options: ExtractOptions = {}): ListField[] {
  const maxDepth = options.maxDepth ?? 3
  const fields: ListField[] = []

  for (const item of list.children) {
    if (item.type !== 'listItem') continue
    const field = parseListItem(item, maxDepth, 1)
    if (field) fields.push(field)
  }

  return fields
}

// ========================
// 内部实现
// ========================

/**
 * 解析单个 listItem 为 ListField
 */
function parseListItem(item: ListItem, maxDepth: number, currentDepth: number): ListField | null {
  // listItem.children 第一个元素通常是 paragraph，包含 "- key: value" 文本
  const firstChild = item.children[0]
  if (!firstChild || firstChild.type !== 'paragraph') return null

  // 提取 "- key: value" 中的 key + remainder
  const { key, remainder } = extractKeyFromParagraph(firstChild)
  if (!key) return null

  // 找到子 list（可能为 undefined）
  const childList = item.children.find((c) => c.type === 'list') as List | undefined

  // 情形 1：子 list 存在（不论 remainder 是否为空）→ 数组 / 嵌套字段
  if (childList) {
    if (currentDepth >= maxDepth) {
      // 嵌套深度超限：作为字符串数组（防止无限递归）
      const arr = childList.children
        .map((li) => (li.type === 'listItem' ? collectText(li).trim() : null))
        .filter((s): s is string => s !== null && s.length > 0)
      return { key, value: arr }
    }

    // 判断是数组还是嵌套字段
    if (isNestedFieldFormat(childList)) {
      // 嵌套字段：递归
      return { key, value: extractListFields(childList, { maxDepth }) }
    } else {
      // 数组：每个 listItem 是标量
      const arr = childList.children
        .map((li) => (li.type === 'listItem' ? collectText(li).trim() : null))
        .filter((s): s is string => s !== null && s.length > 0)
      return { key, value: arr }
    }
  }

  // 情形 2：标量（remainder 是非空文本）
  if (remainder.trim() !== '') {
    return { key, value: remainder.trim() }
  }

  // 情形 3：空 remainder 无子 list → 标量空字符串
  return { key, value: '' }
}

/**
 * 从 paragraph 提取 "- key: value" 中的 key 和 remainder
 */
function extractKeyFromParagraph(p: Paragraph): { key: string; remainder: string } {
  // 拼接所有子节点的文本
  const fullText = p.children.map((c) => collectPhrasingText(c)).join('')

  // 找第一个冒号（": "）
  const colonIdx = fullText.indexOf(':')
  if (colonIdx === -1) {
    return { key: '', remainder: fullText }
  }

  return {
    key: fullText.slice(0, colonIdx).trim(),
    remainder: fullText.slice(colonIdx + 1).trim(),
  }
}

/**
 * 收集 PhrasingContent 节点的文本
 */
function collectPhrasingText(node: PhrasingContent): string {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value
  }
  if (node.type === 'strong' || node.type === 'emphasis' || node.type === 'delete') {
    return node.children.map(collectPhrasingText).join('')
  }
  if (node.type === 'link') {
    return node.children.map(collectPhrasingText).join('')
  }
  return ''
}

/**
 * 判断 list 是否为"嵌套字段"格式
 * 启发式：listItem 第一个 paragraph 含 ":" 则视为嵌套字段
 */
function isNestedFieldFormat(list: List): boolean {
  for (const item of list.children) {
    if (item.type !== 'listItem') continue
    const p = item.children[0]
    if (p && p.type === 'paragraph') {
      const text = collectText(p)
      if (text.includes(':')) return true
    }
  }
  return false
}

/**
 * 递归收集节点内所有纯文本（仅 listItem/paragraph 入口）
 */
function collectText(node: ListItem | Paragraph | PhrasingContent): string {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value
  }
  if (node.type === 'listItem' || node.type === 'paragraph') {
    return node.children
      .map((c) => {
        if (c.type === 'text' || c.type === 'inlineCode') return c.value
        if (c.type === 'list') return '' // 嵌套 list 不计入顶层文本
        if ('children' in c && Array.isArray(c.children)) {
          return (c.children as PhrasingContent[]).map(collectText).join('')
        }
        return ''
      })
      .join('')
  }
  if ('children' in node && Array.isArray((node as { children: unknown[] }).children)) {
    return (node as { children: PhrasingContent[] }).children.map(collectText).join('')
  }
  return ''
}

// ========================
// 便捷函数
// ========================

/** 把 ListField[] 转为扁平 Record（仅顶层）*/
export function fieldsToRecord(fields: ListField[]): Record<string, ListFieldValue> {
  const record: Record<string, ListFieldValue> = {}
  for (const field of fields) {
    record[field.key] = field.value
  }
  return record
}

/** 提取 ListField[] 中指定 key 的标量值（不存在返回 undefined）*/
export function getScalar(fields: ListField[], key: string): string | undefined {
  const field = fields.find((f) => f.key === key)
  if (field && typeof field.value === 'string') return field.value
  return undefined
}

/** 提取 ListField[] 中指定 key 的数组值（不存在返回空数组）*/
export function getArray(fields: ListField[], key: string): string[] {
  const field = fields.find((f) => f.key === key)
  if (field && Array.isArray(field.value)) {
    // value 可能是 string[] 或 ListField[]
    if (field.value.length > 0 && typeof field.value[0] === 'string') {
      return field.value as string[]
    }
  }
  return []
}

/** 提取 ListField[] 中指定 key 的嵌套字段值（不存在返回空数组）*/
export function getNestedFields(fields: ListField[], key: string): ListField[] {
  const field = fields.find((f) => f.key === key)
  if (field && Array.isArray(field.value)) {
    // value 可能是 ListField[]
    if (field.value.length > 0 && typeof field.value[0] === 'object') {
      return field.value as ListField[]
    }
  }
  return []
}

// ========================
// 高级提取：listItem 形式
// ========================

/** 提取的 listItem 结构：name (remainder) + nested fields */
export interface ListItemExtracted {
  /** listItem 名称（- key: <name> 中的 <name>，可空）*/
  name: string
  /** 嵌套字段（listItem 下的子 list）*/
  fields: ListField[]
}

/**
 * 提取 list 节点的每个 listItem 为 { name, fields } 形式
 *
 * 适用场景：当 listItem 形如 "- <key>: <name>\n  - <attr>: ..."，需要 name + 嵌套 attributes 时
 *
 * @example
 *   // MD:
 *   // - part: build_module
 *   //   - skill_context: 打包
 *   //   - probe: test
 *   const items = extractListItems(list)
 *   // [
 *   //   {
 *   //     name: 'build_module',
 *   //     fields: [
 *   //       { key: 'skill_context', value: '打包' },
 *   //       { key: 'probe', value: 'test' },
 *   //     ]
 *   //   }
 *   // ]
 */
export function extractListItems(list: List, options: ExtractOptions = {}): ListItemExtracted[] {
  const maxDepth = options.maxDepth ?? 3
  const items: ListItemExtracted[] = []

  for (const item of list.children) {
    if (item.type !== 'listItem') continue
    const firstChild = item.children[0]
    if (!firstChild || firstChild.type !== 'paragraph') continue

    const { key: _key, remainder } = extractKeyFromParagraph(firstChild)
    const name = remainder.trim()

    // 找子 list
    const childList = item.children.find((c) => c.type === 'list') as List | undefined
    const fields = childList ? extractListFields(childList, { maxDepth }) : []

    items.push({ name, fields })
  }

  return items
}
