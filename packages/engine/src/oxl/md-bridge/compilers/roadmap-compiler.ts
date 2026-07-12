/**
 * md-bridge/compilers/roadmap-compiler.ts — Roadmap EntityCompiler 实现
 *
 * v0.6.1-alpha.1 (Asset 缺口全补 — Phase 1 Roadmap)
 *
 * 角色：
 * - 编译：Langium RoadmapDeclaration → .md（H1 Roadmap + ## Links + ### link-name + target scalar）
 * - 解析：mdast → 业务对象（links[]）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Links（Roadmap 是简化版 Asset，只含 Links 分类）
 * - 每个 H3 实例是一条 roadmap link（target 引用其他 Asset 路径）
 * - H3 内 scalar field：target（必填，引用其他 Asset）
 * - frontmatter 字段：abstract / citations（references 字段不参与 — grammar 已排除）
 * - Roadmap 不参与 Asset-to-Asset references DAG 校验
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

/** Roadmap H2 分类白名单
 *
 * v0.6.1-alpha.1 Roadmap 简化版：仅 Links 分类
 * - Links: 指向其他 Asset 的引用列表（target: string）
 *
 * 注意：Roadmap 不含 Themes/Milestones/Risks 等复杂 H2 分类
 * RoadmapDeclaration AST 仅含 links[] 字段（oxn.langium:281-294）
 */
const ROADMAP_CATEGORIES = ['Links'] as const
type RoadmapCategory = (typeof ROADMAP_CATEGORIES)[number]

interface RoadmapLink {
  /** link 实例名（H3 文本）*/
  name: string
  /** 引用的 Asset 路径（target 字段，scalar string）*/
  target: string
}

export class RoadmapCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'roadmap'

  // ====================
  // compile
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      abstract?: string
      version?: number
      citations?: number
      descriptions?: Array<{ value?: string }>
      links?: Array<{ target?: string }>
    }

    if (decl?.$type !== 'RoadmapDeclaration') {
      throw new Error(`RoadmapCompiler.compile: expected RoadmapDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = String(decl.version ?? input.options?.version ?? '0.3.0')
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: roadmap')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      if (decl.abstract) {
        sections.push('abstract: |')
        for (const line of decl.abstract.split('\n')) {
          sections.push(`  ${line}`)
        }
      }
      if (decl.citations !== undefined) {
        sections.push(`citations: ${decl.citations}`)
      }
      sections.push('---')
      sections.push('')
    }

    sections.push(`# Roadmap: ${name}`)
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
      decl.links.forEach((link, idx) => {
        const linkName = `link-${idx + 1}`
        sections.push(`### ${linkName}`)
        if (link.target) {
          sections.push(`- target: ${link.target}`)
        }
        sections.push('')
      })
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
    const { mdast, frontmatter } = input

    const legacy = findLegacyIntentBlocks(mdast)
    if (legacy.length > 0) {
      throw new Error(
        `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found. ` +
          `Syntax deprecated in v0.3.0. Please use \`oxn roadmap compile\` to generate fresh .md.`,
      )
    }

    const contexts = extractHeadingContexts(mdast)

    const links: RoadmapLink[] = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isRoadmapCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []
      const target = getScalar(fields, 'target') ?? ''

      links.push({
        name: ctx.h3,
        target,
      })
    }

    return {
      entity: 'roadmap',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      abstract: typeof frontmatter.abstract === 'string' ? frontmatter.abstract : undefined,
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
        message: 'Missing H1 heading (e.g., `# Roadmap: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Roadmap' && h1.name !== fmName) {
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
      if (ctx.h2 && !isRoadmapCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'roadmap'. ` + `Allowed: ${ROADMAP_CATEGORIES.join(', ')}`,
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

function isRoadmapCategory(cat: string): cat is RoadmapCategory {
  return (ROADMAP_CATEGORIES as readonly string[]).includes(cat)
}
