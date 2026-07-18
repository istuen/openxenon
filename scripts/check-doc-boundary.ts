#!/usr/bin/env bun
/**
 * check-doc-boundary — 文档三层守门（v0.7 重构）
 *
 * 规则矩阵（v0.7 topic-first）：
 *   docs/product/{zh-cn,en}/*  → 禁止  .openxenon/**
 *   docs/dev/{zh-cn,en}/*       → 禁止  .openxenon/drafts/**
 *   docs/rfc/{zh-cn,en}/*       → 禁止  .openxenon/drafts/**
 *   .openxenon/drafts/rfc/*     → 禁止  docs/product/**
 *   .openxenon/drafts/*         → 禁止  .openxenon/drafts/rfc/**
 *
 * 允许：
 *   docs/{product,dev,rfc}/ 同树互引
 *   .openxenon/drafts/ → docs/（仅通过 promote workflow，不在路径上禁止）
 *   .openxenon/drafts/rfc/ → docs/dev/（探索引用沉淀）
 *
 * 跳过规则：
 *   docs/_archive/**
 *   docs/.vitepress/**
 *   .openxenon/.archived/**
 *   包含 '<!-- boundary:ignore -->' 注释的段落
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
    targetPattern: /^\.openxenon\//,
    message: '产品手册不可引用 .openxenon/ 内部（严格隔离）',
  },
  {
    name: 'dev-no-drafts',
    description: 'dev/ 不可引用 .openxenon/drafts/',
    sourcePattern: /^docs\/dev\//,
    targetPattern: /^\.openxenon\/drafts\//,
    message: '开发手册不可引用 .openxenon/drafts/ 内部（仅 docs/rfc/ 可互引）',
  },
  {
    name: 'rfc-no-drafts-isolated',
    description: 'docs/rfc/ 不可引用 .openxenon/drafts/rfc/（drafts/rfc/ 待审视，不混进 rfc/）',
    sourcePattern: /^docs\/rfc\//,
    targetPattern: /^\.openxenon\/drafts\/rfc\//,
    message: 'docs/rfc/ 已 accepted 的 OXP 不引用 drafts/rfc/ 待审视文档',
  },
  {
    name: 'drafts-no-rfc',
    description: '.openxenon/drafts/（非 rfc/ 子目录） 不可引用 .openxenon/drafts/rfc/',
    sourcePattern: /^\.openxenon\/drafts\/(?!rfc\/)/,
    targetPattern: /^\.openxenon\/drafts\/rfc\//,
    message: '项目工作草稿不可引用 ADR/RFC 暂存区',
  },
  {
    name: 'drafts-rfc-no-assets',
    description: '.openxenon/drafts/rfc/ 不可引用 .openxenon/assets/ 直接（Domain 是 vocabulary，应通过 docs/）',
    sourcePattern: /^\.openxenon\/drafts\/rfc\//,
    targetPattern: /^\.openxenon\/assets\//,
    message: 'ADR/RFC 暂存不应直接引用项目资产（应通过 docs/ 概念页）',
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

  // 跳过 _archive 与 .vitepress 与 .archived
  if (relativePath.includes('_archive') || relativePath.startsWith('docs/.vitepress/')) {
    return violations
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  // 检查是否被 boundary:ignore 注释豁免
  let ignoreUntilNextHeading = false

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
      if (targetPath.includes('.archived')) continue

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
