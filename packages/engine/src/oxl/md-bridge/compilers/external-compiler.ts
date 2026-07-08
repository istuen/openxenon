/**
 * md-bridge/compilers/external-compiler.ts — External EntityCompiler 实现
 *
 * v0.6.1-alpha.1 Batch 2
 *
 * 角色：
 * - 编译：Langium ExternalDeclaration → .md（H1 External + ## Links + ### 实例 + 列表）
 * - 解析：mdast → 业务对象（links[]）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Links
 * - 每个 H3 实例是一个 link（API/服务）
 * - H3 内 key-value 列表：url / kind / ttl / auth / summary
 * - frontmatter Asset Paper 4 字段：abstract / references / citations
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 * - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import type {
  EntityCompiler,
  CompileInput,
  CompileOutput,
  ParseInput,
  ValidationInput,
  ValidationError,
} from '../entity-compiler.js'
import { extractHeadingContexts, findH1 } from '../../md-pipeline/utils.js'
import { extractListFields, getScalar } from '../../md-pipeline/utils.js'
import type { IntentEntityType } from '../pipeline.js'
import { findLegacyIntentBlocks } from './_legacy-detect.js'

/** External H2 分类白名单
 *
 * v0.6.1-alpha.1 Batch 2
 * - Links: 外部资源链接（API/服务地址）
 */
const EXTERNAL_CATEGORIES = ['Links'] as const
type ExternalCategory = (typeof EXTERNAL_CATEGORIES)[number]

interface ExternalLink {
  name: string
  url: string
  kind: string
  ttl: string
  auth: string
  summary: string
}

export class ExternalCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'external'

  // ====================
  // compile
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      abstract?: string
      version?: number
      references?: string[]
      citations?: number
      descriptions?: Array<{ value?: string }>
      links?: Array<{
        name: string
        url?: string
        kind?: string
        ttl?: string
        auth?: string
        summary?: string
      }>
    }

    if (decl?.$type !== 'ExternalDeclaration') {
      throw new Error(`ExternalCompiler.compile: expected ExternalDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = String(decl.version ?? input.options?.version ?? '0.3.0')
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: external')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      if (decl.abstract) {
        sections.push('abstract: |')
        for (const line of decl.abstract.split('\n')) {
          sections.push(`  ${line}`)
        }
      }
      if (decl.references && decl.references.length > 0) {
        sections.push('references:')
        for (const ref of decl.references) {
          sections.push(`  - ${ref}`)
        }
      }
      if (decl.citations !== undefined) {
        sections.push(`citations: ${decl.citations}`)
      }
      sections.push('---')
      sections.push('')
    }

    sections.push(`# External: ${name}`)
    sections.push('')

    if (decl.descriptions && decl.descriptions.length > 0) {
      const desc = decl.descriptions
        .map((d) => d.value ?? '')
        .join(' ')
        .trim()
      if (desc) {
        sections.push(`> ${desc}`)
        sections.push('')
      }
    }

    if (decl.links && decl.links.length > 0) {
      sections.push('## Links')
      sections.push('')
      for (const link of decl.links) {
        sections.push(`### ${link.name}`)
        if (link.url) sections.push(`- url: ${link.url}`)
        if (link.kind) sections.push(`- kind: ${link.kind}`)
        if (link.ttl) sections.push(`- ttl: ${link.ttl}`)
        if (link.auth) sections.push(`- auth: ${link.auth}`)
        if (link.summary) sections.push(`- summary: ${link.summary}`)
        sections.push('')
      }
    }

    return {
      md: sections.join('\n'),
      name,
      warnings,
    }
  }

  // ====================
  // parse
  // ====================

  parse(input: ParseInput): Record<string, unknown> {
    const { mdast, frontmatter, options } = input

    if (options?.allowLegacyDirective !== true) {
      const legacy = findLegacyIntentBlocks(mdast)
      if (legacy.length > 0) {
        throw new Error(
          `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found. ` +
            `Syntax deprecated in v0.3.0. Please use \`oxn external compile\` to generate fresh .md.`,
        )
      }
    }

    const contexts = extractHeadingContexts(mdast)

    const links: ExternalLink[] = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isExternalCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      links.push({
        name: ctx.h3,
        url: getScalar(fields, 'url') ?? '',
        kind: getScalar(fields, 'kind') ?? '',
        ttl: getScalar(fields, 'ttl') ?? '',
        auth: getScalar(fields, 'auth') ?? '',
        summary: getScalar(fields, 'summary') ?? '',
      })
    }

    return {
      entity: 'external',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      abstract: typeof frontmatter.abstract === 'string' ? frontmatter.abstract : undefined,
      references: Array.isArray(frontmatter.references) ? (frontmatter.references as string[]) : [],
      citations: typeof frontmatter.citations === 'number' ? frontmatter.citations : 0,
      links,
    }
  }

  // ====================
  // validate
  // ====================

  validate(input: ValidationInput): ValidationError[] {
    const errors: ValidationError[] = []
    const { mdast, frontmatter } = input

    const h1 = findH1(mdast)
    if (!h1) {
      errors.push({
        code: 'E_MD_H1_MISSING',
        message: 'Missing H1 heading (e.g., `# External: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'External' && h1.name !== fmName) {
      errors.push({
        code: 'E_MD_H1_MISMATCH',
        message: `H1 '${h1.text}' does not match frontmatter.name '${fmName}'`,
        severity: 'error',
        line: h1.position?.line,
        column: h1.position?.column,
      })
    }

    const contexts = extractHeadingContexts(mdast)
    for (const ctx of contexts) {
      if (ctx.h2 && !isExternalCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'external'. ` +
            `Allowed: ${EXTERNAL_CATEGORIES.join(', ')}`,
          severity: 'error',
          line: ctx.h3Position?.line,
        })
      }
    }

    const h3Seen = new Map<string, { name: string; line: number }>()
    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      const key = `${ctx.h2}::${ctx.h3}`
      if (h3Seen.has(key)) {
        const first = h3Seen.get(key)!
        errors.push({
          code: 'E_MD_DUPLICATE_H3',
          message: `Duplicate H3 '${ctx.h3}' in '## ${ctx.h2}' (first seen at line ${first.line})`,
          severity: 'error',
          line: ctx.h3Position?.line,
        })
      } else {
        h3Seen.set(key, { name: ctx.h3, line: ctx.h3Position?.line ?? 0 })
      }
    }

    return errors
  }
}

// ========================
// 辅助
// ========================

function isExternalCategory(cat: string): cat is ExternalCategory {
  return (EXTERNAL_CATEGORIES as readonly string[]).includes(cat)
}
