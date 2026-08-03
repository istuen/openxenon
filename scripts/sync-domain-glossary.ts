#!/usr/bin/env bun
/**
 * scripts/sync-domain-glossary.ts — RFC-0017 术语双层 SSOT sync 脚本（精简版）
 *
 * 行为契约（RFC-0017 §D7）：
 *   输入：.openxenon/assets/domains/oxn-{x}-domain.md (9 files)
 *   输出：docs/product/zh-cn/concepts/glossary.md (1 file)
 *   副作用：.openxenon/assets/domains/*.md（每个 term 头部插入 glossary-ref）
 *
 * 操作流程：
 *   1. 读取 9 个 Domain 文件，**仅**提取 `## Terms:` 段下的 `### term` H3
 *      （排除 `## Invariants` / `## Bans` 段，per RFC-0017 §D2/D3）
 *   2. 合并去重（按 references DAG 找 root；同 name 多 Domain 定义全部保留为 domains: 列表）
 *   3. 按字母排序，输出 ~140 个去重 term
 *   4. 渲染到 glossary.md（SYNC:START/END 外覆盖，sentinel 内保留）
 *   5. 更新 Domain 文件：`## Terms:` 段下每个 term 头部加 `glossary-ref:`
 *   6. 更新 Domain 与 glossary 的 synced-at 字段
 *
 * sync 职责边界（2026-08-01 grilling 决议）：
 *   ✅ 提取、合并、排序、生成、回填——纯机械工作
 *   ❌ 冲突判定——同名 term 多 Domain 定义是否矛盾由工程师 + AI 负责
 *   ❌ 概念边界设计——Probe/Part/Roadmap 等跨 Domain 概念是否拆分 term 由 RFC 立项
 *
 * 用法：
 *   bun scripts/sync-domain-glossary.ts            # dry-run
 *   bun scripts/sync-domain-glossary.ts --write    # 实际写入
 *   bun scripts/sync-domain-glossary.ts --write --strict  # 严格模式（同 name 多 Domain 必须 desc 完全一致）
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ─── 路径常量 ──────────────────────────────────────────────

const ROOT = join(import.meta.dir, '..')
const DOMAINS_DIR = join(ROOT, '.openxenon', 'assets', 'domains')
const GLOSSARY_PATH = join(ROOT, 'docs', 'product', 'zh-cn', 'concepts', 'glossary.md')

// ─── 类型 ──────────────────────────────────────────────────

interface DomainTerm {
  /** term 名（H3 文本） */
  name: string
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

interface MergedTerm {
  name: string
  slug: string
  /** 所有出现该 term 的 Domain 来源 */
  domains: Array<{
    domain: string
    desc: string
  }>
}

// ─── 工具函数 ──────────────────────────────────────────────

/**
 * 从 H3 文本生成 kebab-case slug
 */
export function toSlug(h3Text: string): string {
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
export function escapeAngleBrackets(s: string): string {
  return s.replace(/<([a-zA-Z][a-zA-Z0-9_-]*)>/g, '&lt;$1&gt;')
}

/**
 * 解析 Domain 文件 frontmatter（YAML 简化版：仅 references）
 */
export function parseFrontmatter(content: string): { references: string[] } {
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
export function extractTermsFromDomain(filePath: string, domainName: string): DomainTerm[] {
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

// ─── 合并去重 ──────────────────────────────────────────────

function mergeTerms(domains: Domain[]): MergedTerm[] {
  const byName = new Map<string, Array<{ domain: Domain; term: DomainTerm }>>()
  for (const d of domains) {
    for (const t of d.terms) {
      if (!byName.has(t.name)) byName.set(t.name, [])
      byName.get(t.name)!.push({ domain: d, term: t })
    }
  }

  const merged: MergedTerm[] = []
  for (const [name, occurrences] of byName) {
    const slug = toSlug(name)
    const mergedDomains = occurrences.map((o) => ({
      domain: o.domain.name,
      desc: o.term.desc,
    }))

    merged.push({ name, slug, domains: mergedDomains })
  }

  // 按字母排序
  merged.sort((a, b) => a.name.localeCompare(b.name))

  return merged
}

// ─── 渲染 ──────────────────────────────────────────────────

// ─── 合并去重 ──────────────────────────────────────────────

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
    '>',
    '> 内部定义来自 `.openxenon/assets/domains/`（Asset 视角），本页是面向用户的精简字典。',
    '> 修改术语请编辑 Asset Domain 文件，本页通过 sync 脚本自动重建。',
    '>',
    '> **多 Domain 定义说明**：同名 term 在多个 Domain 视角下可能有不同描述。**冲突判定由工程师 + AI 负责**，sync 脚本仅如实合并。',
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
      lines.push(
        ``,
        `- [${t.domains[0]!.domain}](/openxenon/assets/domains/${t.domains[0]!.domain}.md#${t.slug}) — ${escapeAngleBrackets(t.domains[0]!.desc)}`,
      )
      for (const d of t.domains.slice(1)) {
        const linkPath = `/openxenon/assets/domains/${d.domain}.md#${t.slug}`
        lines.push(`- [${d.domain}](${linkPath}) — ${escapeAngleBrackets(d.desc)}`)
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
          const refLine = `- glossary-ref: /openxenon/assets/domains/${d.name}.md#${slug}`
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
  const merged = mergeTerms(domains)
  const multiDomain = merged.filter((t) => t.domains.length > 1).length
  console.log(`   去重后 ${merged.length} term / 多 Domain 定义 ${multiDomain} 处`)

  // strict 模式：同 name 多 Domain 必须 desc 完全一致（防止 root/sub 错配）
  if (strict) {
    let strictViolation = 0
    for (const t of merged) {
      if (t.domains.length < 2) continue
      const descs = new Set(t.domains.map((d) => d.desc))
      if (descs.size > 1) {
        console.error(`❌ --strict：term "${t.name}" 在多个 Domain 间 desc 字符串不完全一致`)
        strictViolation++
      }
    }
    if (strictViolation > 0) {
      console.error(`   共 ${strictViolation} 处违规，请确认 root/sub 分配是否正确`)
      process.exit(1)
    }
  }

  // 渲染 glossary
  const glossaryContent = renderGlossary(merged, today)

  // Domain 文件注入 glossary-ref
  const updates = injectGlossaryRef(domains, merged)

  console.log(`\n📝 计划变更：`)
  console.log(`   - docs/product/zh-cn/concepts/glossary.md: ${write ? '写入' : 'dry-run'}`)
  for (const [name] of updates) {
    console.log(`   - .openxenon/assets/domains/${name}.md: ${write ? '注入 glossary-ref' : 'dry-run'}`)
  }

  if (!write) {
    console.log(`\n💡 加 --write 实际写入；加 --strict 让多 Domain desc 字符串不一致即失败`)
    return
  }

  writeFileSync(GLOSSARY_PATH, glossaryContent, 'utf-8')
  for (const [name, content] of updates) {
    writeFileSync(join(DOMAINS_DIR, `${name}.md`), content, 'utf-8')
  }
  console.log(`\n✅ sync 完成`)
}

main()
