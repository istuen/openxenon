/**
 * md-pipeline/backlinks.ts — v0.7 ADR-0059 + ADR-0060 backlinks 引擎
 *
 * 角色：扫描所有 Domain .md 文件，构建反向索引（target Domain → 哪些 source Domain 引用了它）。
 *       双向扫描（v0.7.1）：
 *         1. sub → root 反向：扫描子 Domain 的 references frontmatter
 *         2. root → sub 反向：扫描 root Domain desc 内 MD link
 *       不参与 DAG 校验，仅作 backlinks 展示用途（oxn domain show 时显示）。
 *
 * 设计要点：
 *   - MD link 语法：标准 markdown `[`text`](./oxn-domain.md#anchor)`
 *   - references frontmatter：YAML `references: [oxn-domain, oxn-engine-domain]`
 *   - references → MD link 名称映射：references 元素（如 'oxn-engine-domain'）映射到
 *     对应的 Domain 文件 basename（如 'oxn-engine-domain.md'）
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层
 *   - 不感知 fs 路径（由调用方传入 file content）
 *   - 不感知 OpenXenon Kernel
 */

import type { Root, Link, Heading, Text } from 'mdast'
import { visit } from 'unist-util-visit'

// =============================================================================
// 类型定义
// =============================================================================

/** 单个反向链接记录 */
export interface Backlink {
  /** 引用方 Domain 文件相对路径（如 'oxn-work-domain.md'）*/
  sourceFile: string
  /** 引用方 Domain 名（来自 frontmatter name）*/
  sourceDomain: string
  /** 链接所在的 H3 term 名（如 'Work'）—— 仅 MD link 类 backlink 有值 */
  sourceTerm?: string
  /** 链接文本（如 'oxn-work-domain'）—— 仅 MD link 类有值 */
  linkText?: string
  /** 链接 target URL（如 './oxn-work-domain.md#work'）—— 仅 MD link 类有值 */
  linkUrl?: string
  /** 来源类型 */
  source: 'md-link' | 'references-frontmatter'
  /** references 来源——若 source = references-frontmatter，记录引用了哪些 Domain 名（key 形式） */
  references?: string[]
}

/** 反向链接索引：targetDomainFile → Backlink[] */
export type BacklinkIndex = Map<string, Backlink[]>

// =============================================================================
// 链接提取
// =============================================================================

/**
 * 从单个 .md 文件提取所有 term 描述字段里的 MD 链接
 *
 * 提取规则：
 *   - 只看 ## Terms / ## Bans / ## Invariants 下的 H3 term
 *   - 每个 H3 下的 paragraph 子节点（term.desc 内容）
 *   - 链接 target 必须以 .md 结尾（含 #anchor 形式）
 *
 * 返回的 backlink source = 'md-link'，含 sourceTerm。
 */
export function extractMdLinksFromDomain(
  content: string,
  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },
): Omit<Backlink, 'sourceFile'>[] {
  const { tree, frontmatter } = parseMarkdown(content)
  const sourceDomain = typeof frontmatter.name === 'string' ? frontmatter.name : '<unknown>'

  const results: Omit<Backlink, 'sourceFile'>[] = []

  visit(tree, 'heading', (node) => {
    const h = node as Heading
    if (h.depth !== 3) return

    // 该 H3 的父 H2 必须是 Terms/Bans/Invariants 之一
    const h2Parent = findParentH2(tree, h)
    if (!h2Parent) return

    const h3Name = headingText(h)
    if (!h3Name) return

    // 从 H3 后开始，向后遍历兄弟节点直到下一个 heading
    const children = tree.children
    const h3Idx = children.indexOf(h)
    if (h3Idx === -1) return

    for (let i = h3Idx + 1; i < children.length; i++) {
      const sib = children[i]
      if (!sib) continue
      if (sib.type === 'heading') break
      collectLinksFromNode(sib, results, h3Name, sourceDomain)
    }
  })

  return results
}

/**
 * 从单个 .md 文件的 frontmatter 提取 references 字段，构建 backlinks 记录。
 *
 * ADR-0059 §D1: references 是 sub→root DAG 表达。我对它求反向：扫描每个文件的
 * references 列表，对每个被引 Domain 建一条 backlink。
 *
 * 返回的 backlink source = 'references-frontmatter'，不含 sourceTerm（精度到 Domain 级）。
 *
 * 例：
 *   oxn-work-domain.md frontmatter `references: [oxn-domain, oxn-engine-domain, oxn-asset-domain]`
 *   → 对 oxn-domain.md / oxn-engine-domain.md / oxn-asset-domain.md 各建 1 条 backlink
 *     { source: 'references-frontmatter', references: ['oxn-domain', 'oxn-engine-domain', 'oxn-asset-domain'] }
 */
export function extractReferencesBacklinks(
  content: string,
  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },
): Omit<Backlink, 'sourceFile'>[] {
  const { frontmatter } = parseMarkdown(content)
  const sourceDomain = typeof frontmatter.name === 'string' ? frontmatter.name : '<unknown>'
  const refs = frontmatter.references

  if (!Array.isArray(refs) || refs.length === 0) {
    return []
  }

  const refList = refs.filter((r): r is string => typeof r === 'string' && r.length > 0)

  return refList.map((refKey) => ({
    sourceDomain,
    source: 'references-frontmatter' as const,
    references: [refKey],
  }))
}

/** 找 heading 的父 H2（只允许 Terms / Bans / Invariants） */
function findParentH2(tree: Root, target: Heading): Heading | null {
  const children = tree.children
  const targetIdx = children.indexOf(target)
  if (targetIdx === -1) return null

  for (let i = targetIdx - 1; i >= 0; i--) {
    const c = children[i]
    if (c?.type !== 'heading') continue
    const h = c as Heading
    if (h.depth === 2) {
      const text = headingText(h)
      if (
        text === 'Terms' ||
        text.startsWith('Terms:') ||
        text === 'Bans' ||
        text.startsWith('Bans:') ||
        text === 'Invariants' ||
        text.startsWith('Invariants:')
      ) {
        return h
      }
      return null
    }
  }
  return null
}

/**
 * Inline 递归遍历节点找所有 link（避免嵌套 visit 的状态污染问题）
 * 一个 listItem > paragraph 内的 link 也算 term.desc 的一部分
 */
function collectLinksFromNode(
  node: unknown,
  results: Omit<Backlink, 'sourceFile'>[],
  h3Name: string,
  sourceDomain: string,
): void {
  const n = node as { type?: string; children?: unknown[]; url?: string }
  if (!n || typeof n !== 'object') return
  if (n.type === 'link' && typeof n.url === 'string' && isMdLink(n.url)) {
    const linkNode = n as unknown as Link
    const text = collectLinkText(linkNode)
    results.push({
      sourceDomain,
      sourceTerm: h3Name,
      linkText: text,
      linkUrl: n.url,
      source: 'md-link',
    })
  }
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      collectLinksFromNode(child, results, h3Name, sourceDomain)
    }
  }
}

/** 判断 URL 是否指向 .md 文件（剥离 #anchor 后检查） */
function isMdLink(url: string): boolean {
  const withoutAnchor = url.split('#')[0] ?? url
  return withoutAnchor.endsWith('.md')
}

/** 提取 heading 文本 */
function headingText(h: Heading): string {
  return (h.children ?? [])
    .filter((c): c is Text => c.type === 'text')
    .map((c) => c.value)
    .join('')
    .trim()
}

/** 收集 link 节点的文本内容 */
function collectLinkText(link: Link): string {
  return (link.children ?? [])
    .filter((c): c is Text => c.type === 'text')
    .map((c) => c.value)
    .join('')
    .trim()
}

/**
 * 从链接 URL 提取目标文件 basename（作为 index key）
 *
 * 例：
 *   './oxn-domain.md#work' → 'oxn-domain.md'
 *   '../../assets/domains/oxn-domain.md' → 'oxn-domain.md'
 *   'oxn-engine-domain.md' → 'oxn-engine-domain.md'
 *
 * v0.7 假设 Domain 文件平铺在 .openxenon/assets/domains/ 下，basename 唯一
 * （如有目录嵌套需扩展此函数做完整路径规范化）
 */
export function normalizeLinkTarget(url: string): string {
  const hashIdx = url.indexOf('#')
  const withoutAnchor = hashIdx === -1 ? url : url.slice(0, hashIdx)
  // 提取 basename（最后一段路径分量）
  const segments = withoutAnchor.split('/')
  const basename = segments[segments.length - 1] ?? ''
  return basename.trim()
}

// =============================================================================
// 反向索引构建
// =============================================================================

/**
 * 从多个 Domain 文件内容构建反向链接索引（双向 union）
 *
 * ADR-0059 §D3（2026-07-17 修订）+ ADR-0060 D8：双向扫描
 *   1. **sub → root 反向**：扫描每个 Domain 的 references frontmatter
 *   2. **root → sub 反向**：扫描每个 Domain desc 内的 MD link
 *   3. 两组 union 输出 backlinks 索引
 *
 * 两种 backlink 区分（Backlink.source 字段）：
 *   - 'md-link': 来自 desc MD link，含 sourceTerm 精度到 term 级
 *   - 'references-frontmatter': 来自 references frontmatter，精度到 Domain 级
 *
 * @param entries 每个元素是 { filePath, content } — filePath 用于 sourceFile 字段
 * @param parseMarkdown md-pipeline 提供的 parseMarkdown 函数
 * @returns Map<targetDomainFile, Backlink[]>
 */
export function buildBacklinkIndex(
  entries: Array<{ filePath: string; content: string }>,
  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },
): BacklinkIndex {
  const index: BacklinkIndex = new Map()

  /** 把 backlink 按 target file 入索引 */
  function addToIndex(target: string, backlink: Backlink): void {
    const arr = index.get(target) ?? []
    arr.push(backlink)
    index.set(target, arr)
  }

  // 第一遍：references frontmatter（sub → root 反向）
  // 同时构建 references key → file basename 映射，用于把 'oxn-engine-domain'
  // 转换为 'oxn-engine-domain.md' 作为索引 key。
  const keyToFile = new Map<string, string>()
  for (const { filePath, content } of entries) {
    const { frontmatter } = parseMarkdown(content)
    const name = typeof frontmatter.name === 'string' ? frontmatter.name : null
    if (!name) continue
    const fileBasename = filePath.split('/').pop() ?? filePath
    // name 如 'OxnEngineDomain'，references 如 'oxn-engine-domain'
    // 通过 file basename 推导 key：去掉 .md，加 '-domain' 后缀
    const key = inferReferencesKey(fileBasename, name)
    if (key) keyToFile.set(key, fileBasename)
  }

  for (const { filePath, content } of entries) {
    const refBacklinks = extractReferencesBacklinks(content, parseMarkdown)
    for (const rb of refBacklinks) {
      const refs = rb.references ?? []
      for (const refKey of refs) {
        const target = keyToFile.get(refKey)
        if (!target) continue
        const backlink: Backlink = {
          sourceFile: filePath,
          sourceDomain: rb.sourceDomain,
          source: 'references-frontmatter',
          references: refs,
        }
        addToIndex(target, backlink)
      }
    }
  }

  // 第二遍：desc MD link（root → sub 反向）
  for (const { filePath, content } of entries) {
    const mdLinks = extractMdLinksFromDomain(content, parseMarkdown)
    for (const link of mdLinks) {
      if (!link.linkUrl) continue
      const target = normalizeLinkTarget(link.linkUrl)
      const backlink: Backlink = {
        sourceFile: filePath,
        sourceDomain: link.sourceDomain,
        sourceTerm: link.sourceTerm,
        linkText: link.linkText,
        linkUrl: link.linkUrl,
        source: 'md-link',
      }
      addToIndex(target, backlink)
    }
  }

  return index
}

/**
 * 从 Domain 文件名推导 references 列表中的 key。
 *
 * Domain 文件命名约定：
 *   - oxn-engine-domain.md → references key 'oxn-engine-domain'
 *   - oxn-cli-domain.md → 'oxn-cli-domain'
 *
 * 推导规则：basename 去 .md 后缀即为 key（约定 references 元素与 basename 一致）。
 */
function inferReferencesKey(basename: string, _name: string): string | null {
  if (basename.endsWith('.md')) {
    return basename.slice(0, -3)
  }
  return null
}
