#!/usr/bin/env bun
/**
 * check-doc-boundary — 文档三层守门（v0.7 重构 + v0.7.4 Phase 5 + v0.7.4-remediation Step 3）
 *
 * 规则矩阵（v0.7 topic-first）：
 *   docs/product/{zh-cn,en}/*  → 禁止  .openxenon/**
 *   docs/dev/{zh-cn,en}/*       → 禁止  .openxenon/drafts/**
 *                                禁止  .openxenon/assets/    （v0.7.4 新增；dev→assets 改引 glossary）
 *   docs/rfc/{zh-cn,en}/*       → 禁止  .openxenon/drafts/**
 *   .openxenon/drafts/rfc/*     → 禁止  docs/product/**
 *   .openxenon/drafts/*         → 禁止  .openxenon/drafts/rfc/**
 *
 * 允许：
 *   docs/{product,dev,rfc}/ 同树互引
 *   .openxenon/drafts/ → docs/（仅通过 promote workflow，不在路径上禁止）
 *   .openxenon/drafts/rfc/ → docs/dev/（探索引用沉淀）
 *   docs/rfc/ → docs/adrs/（RFC related 段引用 ADR 镜像）
 *
 * 扫描范围：
 *   - body markdown 链接 [text](url)（v0.7 原生）
 *   - frontmatter `related:` 字段内的 ADR/Asset 引用路径（Step 3 B1）
 *
 * 跳过规则：
 *   docs/_archive/**
 *   docs/.vitepress/**
 *   包含 '<!-- boundary:ignore -->' 注释的段落
 *
 * v0.7.4-remediation：
 *   - B1：新增 frontmatter YAML 扫描（related 字段）
 *   - B2：targetPattern 去 `^` 锚点（避免错误相对路径致 false negative）
 *   - B3：取消 `.archived` 隐式豁免（统一所有规则对 .archived 的检查一致性）
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'

const ROOT = resolve(import.meta.dir, '..')
const DOC_ROOT = join(ROOT, 'docs')
const OPENXENON_ROOT = join(ROOT, '.openxenon')

// ─── 规则定义 ──────────────────────────────────────────────

interface BoundaryRule {
  name: string
  description: string
  sourcePattern: RegExp
  targetPattern: RegExp
  message: string
}

const RULES: BoundaryRule[] = [
  {
    name: 'product-no-openxenon',
    description: 'product/ 不可引用 .openxenon/',
    sourcePattern: /^docs\/product\//,
    targetPattern: /\.openxenon\//,
    message: '产品手册不可引用 .openxenon/ 内部（严格隔离）',
  },
  {
    name: 'dev-no-drafts',
    description: 'dev/ 不可引用 .openxenon/drafts/',
    sourcePattern: /^docs\/dev\//,
    targetPattern: /\.openxenon\/drafts\//,
    message: '开发手册不可引用 .openxenon/drafts/ 内部（仅 docs/rfc/ 可互引）',
  },
  {
    name: 'dev-no-assets',
    description: 'dev/ 不可引用 .openxenon/assets/',
    sourcePattern: /^docs\/dev\//,
    targetPattern: /\.openxenon\/assets\//,
    message: '开发手册不可直接引用 .openxenon/assets/（Domain 是 vocabulary，应通过 docs/glossary/）',
  },
  {
    name: 'rfc-no-drafts-isolated',
    description: 'docs/rfc/ 不可引用 .openxenon/drafts/rfc/（drafts/rfc/ 待审视，不混进 rfc/）',
    sourcePattern: /^docs\/rfc\//,
    targetPattern: /\.openxenon\/drafts\/rfc\//,
    message: 'docs/rfc/ 已 accepted 的 OXP 不引用 drafts/rfc/ 待审视文档',
  },
  {
    name: 'drafts-no-rfc',
    description: '.openxenon/drafts/（非 rfc/ 子目录） 不可引用 .openxenon/drafts/rfc/',
    sourcePattern: /^\.openxenon\/drafts\/(?!rfc\/)/,
    targetPattern: /\.openxenon\/drafts\/rfc\//,
    message: '项目工作草稿不可引用 ADR/RFC 暂存区',
  },
  {
    name: 'drafts-rfc-no-assets',
    description: '.openxenon/drafts/rfc/ 不可引用 .openxenon/assets/',
    sourcePattern: /^\.openxenon\/drafts\/rfc\//,
    targetPattern: /\.openxenon\/assets\//,
    message: 'ADR/RFC 暂存不应直接引用项目资产（应通过 docs/ 概念页）',
  },
  {
    // v0.6.2 Step 9 (ssot-asset-doc-boundary-audit-2026-07-28.md)
    // 来自 oxn-project-domain.md ban `assets-to-docs`：Asset 是边界不依赖手册
    name: 'assets-no-docs',
    description: '.openxenon/assets/ 不可引用 docs/（边界不依赖手册）',
    sourcePattern: /^\.openxenon\/assets\//,
    targetPattern: /^docs\//,
    message: 'Asset 不应依赖手册（边界独立可读）',
  },
  {
    // v0.6.2 Step 9
    // 来自 oxn-project-domain.md ban `rfc-to-product-doc`：规定性应独立可读
    name: 'rfc-no-product-doc',
    description: 'docs/rfc/ 不可引用 docs/product/（规定性应独立可读）',
    sourcePattern: /^docs\/rfc\//,
    targetPattern: /^docs\/product\//,
    message: 'RFC（规定性）不应引用 product 手册（描述性）',
  },
  {
    // v0.6.2 Step 9
    // 来自 oxn-project-domain.md ban `rfc-to-dev-doc`：规定性应独立可读
    name: 'rfc-no-dev-doc',
    description: 'docs/rfc/ 不可引用 docs/dev/（规定性应独立可读）',
    sourcePattern: /^docs\/rfc\//,
    targetPattern: /^docs\/dev\//,
    message: 'RFC（规定性）不应引用 dev 手册（描述性）',
  },
]

// ─── 路径解析 ──────────────────────────────────────────────

function resolveRelativePath(sourceFile: string, link: string): string | null {
  // 绝对路径
  if (link.startsWith('/')) {
    const cleaned = link.replace(/^\.html$/, '')
    return relative(ROOT, join(ROOT, 'docs', cleaned.slice(1)))
  }
  // 相对路径
  const sourceDir = join(sourceFile, '..')
  const resolved = resolve(sourceDir, link)
  return relative(ROOT, resolved)
}

function extractLinks(content: string): string[] {
  const links: string[] = []
  // [text](url) 和 ![alt](url)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  let match
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[2]!)
  }
  return links
}

/**
 * 提取 frontmatter `related:` 字段内的所有路径（Step 3 B1）
 *
 * 格式：
 *   ```yaml
 *   ---
 *   related:
 *     - ADR-0001: docs/adrs/0001-blueprint-props-funnel-effect.md
 *     - ADR-0021: docs/adrs/0021-...
 *   ---
 *   ```
 *
 * 提取每行 `: ` 后面的路径值。
 */
function extractFrontmatterRefs(content: string): string[] {
  const refs: string[] = []
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return refs

  const fm = fmMatch[1]!
  // 匹配 "  - ADR-XXXX: <path>" 或 "  - <key>: <path>" 行
  const pathRegex = /:\s*(.+)$/gm
  let match
  while ((match = pathRegex.exec(fm)) !== null) {
    const value = match[1]!.trim()
    // 过滤无路径值（如 `: ---` 或 `: null`）
    if (!value || value === '~' || value === 'null' || value.startsWith('[')) continue
    // 只保留看起来像路径的值
    if (value.match(/^[a-zA-Z0-9_\-./]+\.(md|html)$/) || value.startsWith('./') || value.startsWith('../')) {
      refs.push(value)
    }
  }
  return refs
}

// ─── 扫描 ──────────────────────────────────────────────────

interface Violation {
  file: string
  line: number
  rule: string
  message: string
  link: string
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  const relativePath = relative(ROOT, filePath)

  // 跳过 _archive 与 .vitepress
  if (relativePath.includes('_archive') || relativePath.startsWith('docs/.vitepress/')) {
    return violations
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  // 检查是否被 boundary:ignore 注释豁免
  let ignoreUntilNextHeading = false

  // ── Step 3 B1：扫描 frontmatter `related:` 字段内的 ADR 路径 ──
  const frontmatterRefs = extractFrontmatterRefs(content)
  if (frontmatterRefs.length > 0) {
    // 找到 frontmatter `related:` 字段所在行号（大致估算）
    let relatedStartLine = 1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.match(/^related:\s*$/)) {
        relatedStartLine = i + 1
        break
      }
    }
    for (const ref of frontmatterRefs) {
      const targetPath = resolveRelativePath(filePath, ref)
      if (!targetPath) continue

      for (const rule of RULES) {
        if (rule.sourcePattern.test(relativePath) && rule.targetPattern.test(targetPath)) {
          violations.push({
            file: relativePath,
            line: relatedStartLine,
            rule: rule.name,
            message: `${rule.message}（frontmatter related）`,
            link: ref,
          })
        }
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // 跟踪 boundary:ignore 注释
    if (line.includes('<!-- boundary:ignore -->')) {
      ignoreUntilNextHeading = true
      continue
    }
    if (line.startsWith('#') && ignoreUntilNextHeading) {
      ignoreUntilNextHeading = false
    }
    if (ignoreUntilNextHeading) continue

    const links = extractLinks(line)
    for (const link of links) {
      const targetPath = resolveRelativePath(filePath, link)
      if (!targetPath) continue

      // 跳过 _archive 目标
      if (targetPath.includes('_archive')) continue

      for (const rule of RULES) {
        if (rule.sourcePattern.test(relativePath) && rule.targetPattern.test(targetPath)) {
          violations.push({
            file: relativePath,
            line: i + 1,
            rule: rule.name,
            message: rule.message,
            link,
          })
        }
      }
    }
  }

  return violations
}

function scanDirectory(dir: string): Violation[] {
  const violations: Violation[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return violations
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      if (entry === '_archive' || entry === 'node_modules' || entry === '.vitepress') continue
      violations.push(...scanDirectory(fullPath))
    } else if (entry.endsWith('.md')) {
      violations.push(...scanFile(fullPath))
    }
  }

  return violations
}

// ─── 主流程 ──────────────────────────────────────────────

function main() {
  const violations: Violation[] = []

  // 扫描 docs/{product,dev,rfc}/
  for (const topic of ['product', 'dev', 'rfc']) {
    const topicDir = join(DOC_ROOT, topic)
    if (statExists(topicDir)) {
      violations.push(...scanDirectory(topicDir))
    }
  }

  // 扫描 .openxenon/drafts/（含 rfc/）
  const draftsDir = join(OPENXENON_ROOT, 'drafts')
  if (statExists(draftsDir)) {
    violations.push(...scanDirectory(draftsDir))
  }

  if (violations.length === 0) {
    console.log('✅ 文档边界检查通过（0 violations）')
    process.exit(0)
  }

  console.error(`\n🚨 文档边界违规（${violations.length} 处）\n`)
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`)
    console.error(`    规则：${v.rule}`)
    console.error(`    原因：${v.message}`)
    console.error(`    链接：${v.link}`)
    console.error('')
  }

  process.exit(1)
}

function statExists(p: string): boolean {
  try {
    statSync(p)
    return true
  } catch {
    return false
  }
}

main()
