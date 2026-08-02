// =============================================================================
// doc-boundary handler (v0.6.2 probe)
//
// 文档三层守门（6 条规则）：
//   - product-no-openxenon:  product/ 不可引 .openxenon/
//   - dev-no-drafts:         dev/ 不可引 .openxenon/drafts/
//   - dev-no-assets:         dev/ 不可引 .openxenon/assets/
//   - rfc-no-drafts-isolated: rfc/ 不可引 .openxenon/drafts/rfc/
//   - drafts-no-rfc:         .openxenon/drafts/（非 rfc/ 子目录） 不可引 .openxenon/drafts/rfc/
//   - drafts-rfc-no-assets:  .openxenon/drafts/rfc/ 不可引 .openxenon/assets/
//
// 与 scripts/check-doc-boundary.ts 逻辑等价（lefthook pre-commit 也跑该脚本）。
// 该 probe 让 OXN work flow 内部可主动调用此验证（不依赖 lefthook）。
// =============================================================================

import { join, relative, resolve } from 'node:path'
import { fs } from '@openxenon/engine/infra/filesystem'
import { readdir } from '@openxenon/engine/infra/filesystem-async'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

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
    description: 'docs/rfc/ 不可引用 .openxenon/drafts/rfc/',
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
]

export interface DocBoundaryParams {
  /** 根目录（默认 process.cwd()） */
  root?: string
}

export interface DocBoundaryViolation {
  file: string
  line: number
  rule: string
  message: string
  link: string
}

export interface DocBoundaryResult {
  /** 无违规 = true */
  passed: boolean
  /** 违规数 */
  violationCount: number
  /** 违规详情 */
  violations: DocBoundaryViolation[]
}

function resolveRelativePath(ROOT: string, sourceFile: string, link: string): string | null {
  if (link.startsWith('/')) {
    const cleaned = link.replace(/^\.html$/, '')
    return relative(ROOT, join(ROOT, 'docs', cleaned.slice(1)))
  }
  const sourceDir = join(sourceFile, '..')
  const resolved = resolve(sourceDir, link)
  return relative(ROOT, resolved)
}

function extractLinks(content: string): string[] {
  const links: string[] = []
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  let match
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[2]!)
  }
  return links
}

function extractFrontmatterRefs(content: string): string[] {
  const refs: string[] = []
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return refs
  const fm = fmMatch[1]!
  const pathRegex = /:\s*(.+)$/gm
  let match
  while ((match = pathRegex.exec(fm)) !== null) {
    const value = match[1]!.trim()
    if (!value || value === '~' || value === 'null' || value.startsWith('[')) continue
    if (value.match(/^[a-zA-Z0-9_\-./]+\.(md|html)$/) || value.startsWith('./') || value.startsWith('../')) {
      refs.push(value)
    }
  }
  return refs
}

function scanFile(ROOT: string, filePath: string): DocBoundaryViolation[] {
  const violations: DocBoundaryViolation[] = []
  const relativePath = relative(ROOT, filePath)

  if (relativePath.includes('_archive') || relativePath.startsWith('docs/.vitepress/')) {
    return violations
  }

  const content = fs.read(filePath)
  if (content === null) return violations
  const lines = content.split('\n')

  let ignoreUntilNextHeading = false

  // ── frontmatter related 字段 ──
  const frontmatterRefs = extractFrontmatterRefs(content)
  if (frontmatterRefs.length > 0) {
    let relatedStartLine = 1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.match(/^related:\s*$/)) {
        relatedStartLine = i + 1
        break
      }
    }
    for (const ref of frontmatterRefs) {
      const targetPath = resolveRelativePath(ROOT, filePath, ref)
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

  // ── body markdown 链接 ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
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
      const targetPath = resolveRelativePath(ROOT, filePath, link)
      if (!targetPath) continue
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

async function scanDirectory(ROOT: string, dir: string): Promise<DocBoundaryViolation[]> {
  const violations: DocBoundaryViolation[] = []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return violations
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    if (fs.isDirectory(fullPath)) {
      if (entry === '_archive' || entry === 'node_modules' || entry === '.vitepress') continue
      violations.push(...(await scanDirectory(ROOT, fullPath)))
    } else if (fs.isFile(fullPath) && entry.endsWith('.md')) {
      violations.push(...scanFile(ROOT, fullPath))
    }
  }
  return violations
}

export async function executeDocBoundary(
  params: DocBoundaryParams,
  _context: ProbeContext,
): Promise<DocBoundaryResult> {
  const ROOT = params.root ?? process.cwd()
  const DOC_ROOT = join(ROOT, 'docs')
  const OPENXENON_ROOT = join(ROOT, '.openxenon')

  const violations: DocBoundaryViolation[] = []

  for (const topic of ['product', 'dev', 'rfc']) {
    const topicDir = join(DOC_ROOT, topic)
    if (fs.isDirectory(topicDir)) {
      violations.push(...(await scanDirectory(ROOT, topicDir)))
    }
  }

  const draftsDir = join(OPENXENON_ROOT, 'drafts')
  if (fs.isDirectory(draftsDir)) {
    violations.push(...(await scanDirectory(ROOT, draftsDir)))
  }

  return {
    passed: violations.length === 0,
    violationCount: violations.length,
    violations,
  }
}
