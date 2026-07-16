#!/usr/bin/env bun
/**
 * check-doc-boundary — 文档三层守门
 *
 * 规则矩阵（禁反向引用）：
 *   docs/zh-cn/product/*  → 禁止  .openxenon/**
 *   docs/zh-cn/dev/*      → 禁止  .openxenon/pools/**
 *   .openxenon/docs/*     → 禁止  docs/zh-cn/product/**
 *   .openxenon/pools/*    → 禁止  .openxenon/docs/** + docs/zh-cn/**
 *
 * 允许：
 *   dev/ → product/、.openxenon/docs/{adrs,rfcs}/
 *   product/ → dev/（脚注引用）、同 product/ 内部
 *   adrs/ → 其他 adrs/、rfcs/、docs/zh-cn/dev/
 *
 * 跳过规则：
 *   docs/_archive/**
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
    name: 'dev-no-pools',
    description: 'dev/ 不可引用 .openxenon/pools/',
    sourcePattern: /^docs\/zh-cn\/dev\//,
    targetPattern: /^\.openxenon\/pools\//,
    message: '开发手册不可引用动态文稿（.openxenon/pools/）',
  },
  {
    name: 'openxenon-docs-no-product',
    description: '.openxenon/docs/ 不可反向引用 docs/zh-cn/product/',
    sourcePattern: /^\.openxenon\/docs\//,
    targetPattern: /^docs\/zh-cn\/product\//,
    message: '内部手册不可反向引用产品手册',
  },
  {
    name: 'pools-no-docs',
    description: '.openxenon/pools/ 不可引用 docs/zh-cn/',
    sourcePattern: /^\.openxenon\/pools\//,
    targetPattern: /^docs\/zh-cn\//,
    message: '动态文稿不可引用文档手册',
  },
  {
    name: 'pools-no-openxenon-docs',
    description: '.openxenon/pools/ 不可引用 .openxenon/docs/',
    sourcePattern: /^\.openxenon\/pools\//,
    targetPattern: /^\.openxenon\/docs\//,
    message: '动态文稿不可引用内部手册',
  },
]

// ─── 路径解析 ──────────────────────────────────────────────

function resolveRelativePath(sourceFile: string, link: string): string | null {
  // 绝对路径
  if (link.startsWith('/')) {
    return relative(ROOT, join(ROOT, 'docs', link.slice(1)))
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
  // import "path"
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g
  while ((match = importRegex.exec(content)) !== null) {
    links.push(match[1]!)
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

  // 跳过 _archive
  if (relativePath.includes('_archive')) return violations

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
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (entry === '_archive' || entry === 'node_modules') continue
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

  // 扫描 docs/zh-cn/
  const zhCnDir = join(DOC_ROOT, 'zh-cn')
  if (statSync(zhCnDir).isDirectory()) {
    violations.push(...scanDirectory(zhCnDir))
  }

  // 扫描 .openxenon/docs/
  const adrsDir = join(OPENXENON_ROOT, 'docs')
  if (statSync(adrsDir).isDirectory()) {
    violations.push(...scanDirectory(adrsDir))
  }

  // 扫描 .openxenon/pools/
  const poolsDir = join(OPENXENON_ROOT, 'pools')
  if (statSync(poolsDir).isDirectory()) {
    violations.push(...scanDirectory(poolsDir))
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

main()
