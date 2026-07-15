/**
 * 共享 MD 解析 helper —— 给 md-bridge 测试用。
 * 把 MD 字符串 → mdast Root（不处理 frontmatter）。
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'

export function parseMd(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root
}
