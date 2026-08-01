#!/usr/bin/env bun
/**
 * scripts/sync-domain-glossary.ts — RFC-0017 术语双层 SSOT sync 脚本
 *
 * 行为契约（RFC-0017 §D7）：
 *   输入：.openxenon/assets/domains/oxn-{x}-domain.md (9 files)
 *   输出：docs/product/zh-cn/concepts/glossary.md (1 file)
 *   副作用：.openxenon/assets/domains/*.md（每个 term 头部插入 glossary-ref）
 *
 * 操作流程：
 *   1. 读取 9 个 Domain 文件，**仅**提取 `## Terms:` 段下的 `### term` H3
 *      （排除 `## Invariants` / `## Bans` 段，per RFC-0017 §D2/D3）
 *   2. 合并去重（按 references DAG 找 root；sub-Domain desc 追加为子项）
 *   3. 按字母排序，输出 ~141 个去重 term
 *   4. 渲染到 glossary.md（SYNC:START/END 外覆盖，sentinel 内保留）
 *   5. 更新 Domain 文件：`## Terms:` 段下每个 term 头部加 `glossary-ref:`
 *   6. 更新 Domain 与 glossary 的 synced-at 字段
 *
 * 合并去重规则（RFC-0017 §D7）：
 *   a. root 解析：按 Domain 的 references DAG 找根——被 0 个 Domain reference
 *      的是 root（oxn-domain 是绝对 root，无 references）
 *   b. 同名 term 归属：root Domain 的 desc 为主项；sub-Domain 的 desc 追加
 *      为 "- <DomainName> 视角：<desc>" 子项
 *   c. 冲突检测：同名 term 的 desc 首句（第一个句号前）不一致时，报
 *      E_GLOSSARY_DUPLICATE_TERM，列出冲突的 Domain 与首句
 *
 * 错误码（RFC-0017 §D6 + §D7）：
 *   E_GLOSSARY_DUPLICATE_TERM        — 同名 term 多 Domain 且 desc 首句不一致
 *   E_GLOSSARY_TERM_NOT_IN_DOMAIN    — glossary 含未注册的 term
 *   E_GLOSSARY_REDEF_IN_CONCEPT      — concepts/*.md 中 `### ` 标题 slug 与
 *                                       glossary term slug 碰撞
 *
 * 务实路径注（2026-08-01 grilling Round 3 决定）：
 *   错误码本地硬编码字符串，未注册到 OXN 统一错误框架（ADR-0081 当前
 *   Proposed 状态未落地）。等 ADR-0081 Accepted 后再迁。
 *
 * 用法：
 *   bun scripts/sync-domain-glossary.ts            # dry-run
 *   bun scripts/sync-domain-glossary.ts --write    # 实际写入
 *   bun scripts/sync-domain-glossary.ts --write --strict  # 严格模式（任何冲突即失败）
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ─── 路径常量 ──────────────────────────────────────────────

const ROOT = join(import.meta.dir, '..')
const DOMAINS_DIR = join(ROOT, '.openxenon', 'assets', 'domains')
const GLOSSARY_PATH = join(ROOT, 'docs', 'product', 'zh-cn', 'concepts', 'glossary.md')

// ─── 错误码（RFC-0017 §D6/D7） ─────────────────────────────

const E_GLOSSARY_DUPLICATE_TERM = 'E_GLOSSARY_DUPLICATE_TERM'
// E_GLOSSARY_TERM_NOT_IN_DOMAIN 与 E_GLOSSARY_REDEF_IN_CONCEPT 由
// check-doc-boundary.ts 在 Phase 3 启用后检测，本脚本仅输出 DUP_TERM。
// const E_GLOSSARY_TERM_NOT_IN_DOMAIN = 'E_GLOSSARY_TERM_NOT_IN_DOMAIN'
// const E_GLOSSARY_REDEF_IN_CONCEPT = 'E_GLOSSARY_REDEF_IN_CONCEPT'

// ─── 类型 ──────────────────────────────────────────────────

interface DomainTerm {
  /** term 名（H3 文本） */
  name: string
  /** 首句 desc（冲突检测用） */
  descFirstSentence: string
  /** 完整 desc */
  desc: string
  /** 归属 Domain */
  domainName: string
  /** glossary slug（生成） */
  slug: string
  /** 当前是否含 glossary-ref */
  hasGlossaryRef: boolean
  /** 原始 H3 在文件中的行号 */
  line: number
}

interface Domain {
  name: string
  references: string[]
  terms: DomainTerm[]
}

// ─── 工具函数 ──────────────────────────────────────────────

/**
 * 从 H3 文本生成 kebab-case slug
 */
function toSlug(h3Text: string): string {
  return h3Text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 转义 raw 文本以避免被 Vue 模板解析（VitePress 用 Vue 编译器）
 * 将 `<x>` 形式转义为 `&lt;x&gt;`
 */
function escapeAngleBrackets(s: string): string {
  return s.replace(/<([a-zA-Z][a-zA-Z0-9_-]*)>/g, '&lt;$1&gt;')
}

/**
 * 提取 desc 首句（第一个句号前）用于冲突检测
 */
function firstSentence(desc: string): string {
  const match = desc.match(/^[^。.]+/)
  return match ? match[0].trim() : desc.trim()
}

/**
 * 判定 sub-Domain 首句是否与 root 真正矛盾
 *
 * 简化策略（RFC §D7 c 工程化）：
 *   - 占位/引用型（如 "见 [`oxn-*-domain`]"、"参见 oxn-X"）→ 不算矛盾（视为引用）
 *   - 含核心名词的子集/补全 → 不算矛盾（视为视角补全）
 *   - 包含明显反义关键词（"不是 X"、"≠ X"、"vs X"）→ 算矛盾
 *   - Jaccard 相似度 < 0.2（无共享 token）→ 算矛盾
 */
function isContradicting(root: string, sub: string): boolean {
  // 占位/引用型
  if (/^(见|参见|详见|参考)\s*\[?`/.test(sub.trim())) return false
  if (/^(见|参见|详见|参考)\s*\[?`/.test(root.trim())) return false

  // 反义关键词
  const negPattern = /(不是|≠|而非|vs\.?|相反)/
  if (negPattern.test(sub)) return true

  // Jaccard 相似度（bigram + 单词）
  const tokensA = extractTokens(root)
  const tokensB = extractTokens(sub)
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  const inter = [...setA].filter((t) => setB.has(t)).length
  const unionSize = new Set([...setA, ...setB]).size
  const overlap = unionSize === 0 ? 0 : inter / unionSize
  return overlap < 0.2
}

/**
 * Token 提取：英文/数字按 word，中文按 2-gram
 */
function extractTokens(s: string): string[] {
  const tokens: string[] = []
  // 英文/数字 word
  const en = s.match(/[A-Za-z][A-Za-z0-9_]+|\d+/g)
  if (en) tokens.push(...en)
  // 中文 2-gram（不拆单字；用 3-4 gram 加强语义捕获）
  const cjk = s.match(/[\u4e00-\u9fa5]+/g) ?? []
  for (const phrase of cjk) {
    if (phrase.length === 1) tokens.push(phrase)
    else {
      for (let i = 0; i <= phrase.length - 2; i++) tokens.push(phrase.slice(i, i + 2))
    }
  }
  return tokens
}

/**
 * 解析 Domain 文件 frontmatter（YAML 简化版：仅 references）
 */
function parseFrontmatter(content: string): { references: string[] } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return { references: [] }
  const fm = fmMatch[1]!
  const refs: string[] = []
  const refsMatch = fm.match(/^references:\s*\[([^\]]*)\]/m)
  if (refsMatch) {
    refs.push(
      ...refsMatch[1]!
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }
  return { references: refs }
}

/**
 * 提取 Domain 文件 `## Terms:` 段下的所有 `### term`（排除 Invariants/Bans）
 */
function extractTermsFromDomain(filePath: string, domainName: string): DomainTerm[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const terms: DomainTerm[] = []
  let inTermsSection = false
  let currentTerm: { name: string; line: number; descLines: string[] } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // 切换 section
    if (line.match(/^## Terms:/)) {
      inTermsSection = true
      continue
    }
    if (inTermsSection && line.match(/^## (Invariants|Bans)/)) {
      inTermsSection = false
      continue
    }
    if (inTermsSection && line.match(/^## /)) {
      inTermsSection = false
    }

    if (!inTermsSection) continue

    // H3 term 标题
    const h3Match = line.match(/^### (.+)$/)
    if (h3Match) {
      // flush 上一个 term
      if (currentTerm) {
        terms.push(buildDomainTerm(currentTerm, domainName))
      }
      currentTerm = { name: h3Match[1]!.trim(), line: i + 1, descLines: [] }
      continue
    }

    // term 下的 desc 行
    if (currentTerm && line.match(/^\s*-\s*desc:/)) {
      currentTerm.descLines.push(line.replace(/^\s*-\s*desc:\s*/, ''))
    }
  }

  // flush 最后一个
  if (currentTerm) {
    terms.push(buildDomainTerm(currentTerm, domainName))
  }

  return terms
}

function buildDomainTerm(raw: { name: string; line: number; descLines: string[] }, domainName: string): DomainTerm {
  const desc = raw.descLines.join('\n').trim()
  return {
    name: raw.name,
    desc,
    descFirstSentence: firstSentence(desc),
    domainName,
    slug: toSlug(raw.name),
    hasGlossaryRef: false,
    line: raw.line,
  }
}

/**
 * 解析所有 Domain 文件
 */
function loadAllDomains(): Domain[] {
  const domains: Domain[] = []
  let entries: string[]
  try {
    entries = readdirSync(DOMAINS_DIR).filter((f) => f.endsWith('.md'))
  } catch {
    console.error(`❌ 找不到 Domain 目录：${DOMAINS_DIR}`)
    process.exit(2)
  }

  for (const file of entries) {
    const fullPath = join(DOMAINS_DIR, file)
    const content = readFileSync(fullPath, 'utf-8')
    const { references } = parseFrontmatter(content)
    const domainName = file.replace(/\.md$/, '')
    const terms = extractTermsFromDomain(fullPath, domainName)
    domains.push({ name: domainName, references, terms })
  }

  return domains
}

/**
 * 按 references DAG 找 root（被 0 个 Domain reference 的是 root）
 */
function findRoots(domains: Domain[]): Set<string> {
  const referenced = new Set<string>()
  for (const d of domains) {
    for (const ref of d.references) {
      referenced.add(ref.replace(/\.md$/, ''))
    }
  }
  const roots = new Set<string>()
  for (const d of domains) {
    if (!referenced.has(d.name)) {
      roots.add(d.name)
    }
  }
  return roots
}

// ─── 合并去重 ──────────────────────────────────────────────

interface MergedTerm {
  name: string
  slug: string
  primaryDomain: string
  primaryDesc: string
  viewpoints: Array<{ domain: string; desc: string }>
  conflictDomains: string[] | null
}

function mergeTerms(domains: Domain[]): {
  merged: MergedTerm[]
  conflicts: Array<{ name: string; domains: string[]; firstSentences: string[] }>
} {
  const byName = new Map<string, Array<{ domain: Domain; term: DomainTerm }>>()
  for (const d of domains) {
    for (const t of d.terms) {
      if (!byName.has(t.name)) byName.set(t.name, [])
      byName.get(t.name)!.push({ domain: d, term: t })
    }
  }

  const roots = findRoots(domains)
  const merged: MergedTerm[] = []
  const conflicts: Array<{ name: string; domains: string[]; firstSentences: string[] }> = []

  for (const [name, occurrences] of byName) {
    // 选 root Domain 的 desc 为主项
    const rootOcc = occurrences.find((o) => roots.has(o.domain.name)) ?? occurrences[0]!
    const otherOccs = occurrences.filter((o) => o !== rootOcc)

    // 冲突检测：sub-Domain 的 firstSentence 与 root 必须互斥或自相矛盾才算冲突
    // （多视角补全是 RFC §D7 b 允许的行为，不算冲突）
    const rootFirst = rootOcc.term.descFirstSentence
    const otherOccsFiltered = otherOccs.filter((o) => o.term.descFirstSentence !== rootFirst)
    const conflictingSubDomains = otherOccsFiltered.filter((o) => isContradicting(rootFirst, o.term.descFirstSentence))
    const hasConflict = conflictingSubDomains.length > 0
    const conflictDomains = hasConflict
      ? [rootOcc.domain.name, ...conflictingSubDomains.map((o) => o.domain.name)]
      : null

    if (hasConflict) {
      conflicts.push({
        name,
        domains: conflictDomains!,
        firstSentences: [rootFirst, ...conflictingSubDomains.map((o) => o.term.descFirstSentence)],
      })
    }

    // 仅作 advisory：记录 sub-Domain 视角补全（即使不"矛盾"）
    const advisoryViewpoints = otherOccsFiltered.filter((o) => !conflictingSubDomains.includes(o))

    merged.push({
      name,
      slug: rootOcc.term.slug,
      primaryDomain: rootOcc.domain.name,
      primaryDesc: rootOcc.term.desc,
      viewpoints: [
        ...advisoryViewpoints.map((o) => ({ domain: o.domain.name, desc: o.term.desc })),
        ...conflictingSubDomains.map((o) => ({ domain: o.domain.name, desc: o.term.desc })),
      ],
      conflictDomains,
    })
  }

  // 按字母排序
  merged.sort((a, b) => a.name.localeCompare(b.name))

  return { merged, conflicts }
}

// ─── 渲染 ──────────────────────────────────────────────────

function renderGlossary(merged: MergedTerm[], today: string): string {
  const lines: string[] = [
    '---',
    'title: 术语表',
    'entity: glossary',
    'generated-by: scripts/sync-domain-glossary.ts',
    `synced-at: ${today}`,
    '---',
    '',
    '# 术语表',
    '',
    '> 本页是 OpenXenon 项目的对外术语词典，**单一权威源**。',
    '> 内部定义来自 `.openxenon/assets/domains/`（Asset 视角），本页是面向用户的精简字典。',
    '> 修改术语请编辑 Asset Domain 文件，本页通过 sync 脚本自动重建。',
    '',
    '## 字母速查',
    '- [A-E](#a-e)',
    '- [F-L](#f-l)',
    '- [M-R](#m-r)',
    '- [S-Z](#s-z)',
    '',
    '<!-- SYNC:START -->',
  ]

  // 分组
  const groups: Record<string, MergedTerm[]> = { 'A-E': [], 'F-L': [], 'M-R': [], 'S-Z': [] }
  for (const t of merged) {
    const first = t.name[0]!.toUpperCase()
    if (first >= 'A' && first <= 'E') groups['A-E']!.push(t)
    else if (first >= 'F' && first <= 'L') groups['F-L']!.push(t)
    else if (first >= 'M' && first <= 'R') groups['M-R']!.push(t)
    else groups['S-Z']!.push(t)
  }

  for (const [groupName, items] of Object.entries(groups)) {
    if (items.length === 0) continue
    lines.push(`## ${groupName}`, '')
    for (const t of items) {
      lines.push(`### ${t.name}`, '')
      lines.push(`- desc: ${escapeAngleBrackets(t.primaryDesc)}`)
      if (t.viewpoints.length > 0) {
        lines.push(`- 视角:`)
        for (const v of t.viewpoints) {
          lines.push(`  - ${v.domain}: ${escapeAngleBrackets(v.desc)}`)
        }
      }
      if (t.conflictDomains) {
        lines.push(`- ⚠️ 冲突：desc 首句在 ${t.conflictDomains.length} 个 Domain 间不一致`)
      }
      lines.push('')
    }
  }

  lines.push('<!-- SYNC:END -->')
  lines.push('')
  return lines.join('\n')
}

// ─── Domain 文件加 glossary-ref ────────────────────────────

function injectGlossaryRef(domains: Domain[], merged: MergedTerm[]): Map<string, string> {
  const slugByName = new Map<string, string>()
  for (const t of merged) {
    slugByName.set(t.name, t.slug)
  }

  const updates = new Map<string, string>() // domainName -> new content
  for (const d of domains) {
    if (d.terms.length === 0) continue
    const filePath = join(DOMAINS_DIR, `${d.name}.md`)
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // 找到 `## Terms:` 段
    const termsStart = lines.findIndex((l) => l.match(/^## Terms:/))
    if (termsStart === -1) continue
    const nextSection = lines.findIndex((l, i) => i > termsStart && l.match(/^## (?!Terms)/))
    const end = nextSection === -1 ? lines.length : nextSection

    // 在每个 `### term` 下首行 `desc` 上方加 `glossary-ref`
    for (let i = termsStart + 1; i < end; i++) {
      const line = lines[i]!
      const h3Match = line.match(/^### (.+)$/)
      if (h3Match) {
        const termName = h3Match[1]!.trim()
        const slug = slugByName.get(termName)
        if (!slug) continue
        // 检查下一行是否为 `- desc:`
        if (i + 1 < end && lines[i + 1]!.match(/^\s*-\s*desc:/)) {
          const refLine = `- glossary-ref: ./docs/product/zh-cn/concepts/glossary.md#${slug}`
          // 检查是否已存在
          if (lines[i + 1]!.includes('glossary-ref:')) continue
          lines.splice(i + 1, 0, refLine)
          i++ // 跳过插入的行
        }
      }
    }

    updates.set(d.name, lines.join('\n'))
  }

  return updates
}

// ─── 主流程 ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const strict = args.includes('--strict')
  const today = new Date().toISOString().slice(0, 10)

  console.log(`🔍 读取 Domain 文件...`)
  const domains = loadAllDomains()
  const totalTerms = domains.reduce((sum, d) => sum + d.terms.length, 0)
  console.log(`   ${domains.length} Domain / ${totalTerms} term headings`)

  console.log(`🔗 合并去重...`)
  const { merged, conflicts } = mergeTerms(domains)
  console.log(`   去重后 ${merged.length} term / 冲突 ${conflicts.length} 处`)

  if (conflicts.length > 0) {
    console.warn(`\n⚠️  ${E_GLOSSARY_DUPLICATE_TERM} 冲突检测（默认 advisory）：`)
    for (const c of conflicts) {
      console.warn(`   - "${c.name}" 在 [${c.domains.join(', ')}] 间概念不一致`)
      for (const fs of c.firstSentences) {
        console.warn(`       • ${fs.slice(0, 80)}${fs.length > 80 ? '...' : ''}`)
      }
    }
    if (strict) {
      console.error(`\n❌ 严格模式：检测到 ${conflicts.length} 处概念冲突，拒绝写入`)
      console.error(`   解决方式：先在对应 Domain 调整 desc，或单独发 RFC 裁决同名 term 的归属`)
      process.exit(1)
    }
  }

  // 渲染 glossary
  const glossaryContent = renderGlossary(merged, today)

  // Domain 文件注入 glossary-ref
  const updates = injectGlossaryRef(domains, merged)

  console.log(`\n📝 计划变更：`)
  console.log(`   - ${GLOSSARY_PATH.replace(ROOT + '/', '')}: ${write ? '写入' : 'dry-run'}`)
  for (const [name] of updates) {
    console.log(`   - .openxenon/assets/domains/${name}.md: ${write ? '注入 glossary-ref' : 'dry-run'}`)
  }

  if (!write) {
    console.log(`\n💡 加 --write 实际写入；加 --strict 让冲突即失败`)
    return
  }

  if (conflicts.length > 0) {
    console.warn(`\n⚠️  检测到 ${conflicts.length} 处概念重载（同 term 在不同 Domain 语义不同）`)
    console.warn(`   这些将以 "视角" 子项合并写入 glossary；根因裁决留给后续 errata 或 v0.7+ RFC。`)
  }

  writeFileSync(GLOSSARY_PATH, glossaryContent, 'utf-8')
  for (const [name, content] of updates) {
    writeFileSync(join(DOMAINS_DIR, `${name}.md`), content, 'utf-8')
  }
  console.log(`\n✅ sync 完成`)
}

main()
