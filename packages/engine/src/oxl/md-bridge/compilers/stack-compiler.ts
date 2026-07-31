/**
 * md-bridge/compilers/stack-compiler.ts — Stack EntityCompiler 实现
 *
 * v0.7 重构（PR-1）：
 * - H2 分类白名单：Tools（合并 Runtimes / Linters / Tests）
 * - 删除 Externals（external 并入 frontmatter references）
 * - StackItem 保持 name + props 结构，无 role 分类
 *
 * 角色：
 * - 编译：StackDeclaration → .md（H1 Stack + ## Tools + ### 实例 + 列表）
 * - 解析：mdast → 业务对象（tools）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Tools
 * - 每个 H3 实例是一个 tool 名（如 typescript / biome / bun-test）
 * - H3 内 key-value 列表（version / config / command 等）
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
import { extractListFields } from '../../md-pipeline/utils.js'
import type { IntentEntityType } from '../pipeline.js'
import { findLegacyIntentBlocks } from './_legacy-detect.js'

/** Stack H2 分类白名单
 *
 * v0.7 重构：合并 Runtimes / Linters / Tests 为 Tools（无 role 分类）
 */
const STACK_CATEGORIES = ['Tools'] as const
type StackCategory = (typeof STACK_CATEGORIES)[number]

interface StackItem {
  name: string
  props: Record<string, string>
}

export class StackCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'stack'

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
      // 🆕 v0.7: tools 合并 runtimes + linters + testers
      tools?: Array<{
        name: string
        props?: Array<{ name: string; $type: string }>
      }>
    }

    if (decl?.$type !== 'StackDeclaration') {
      throw new Error(`StackCompiler.compile: expected StackDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = String(decl.version ?? input.options?.version ?? '0.3.0')
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: stack')
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

    sections.push(`# Stack: ${name}`)
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

    // ## Tools（合并所有 tool 类型）
    if (decl.tools && decl.tools.length > 0) {
      sections.push('## Tools')
      sections.push('')
      for (const tool of decl.tools) {
        sections.push(`### ${tool.name}`)
        if (tool.props) {
          for (const p of tool.props) {
            sections.push(`- ${p.name}: "TODO"`)
          }
        }
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
    const { mdast, frontmatter } = input

    const legacy = findLegacyIntentBlocks(mdast)
    if (legacy.length > 0) {
      throw new Error(
        `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found. ` +
          `Syntax deprecated in v0.3.0. Please use \`oxn stack compile\` to generate fresh .md.`,
      )
    }

    const contexts = extractHeadingContexts(mdast)

    // 🆕 v0.7: tools 合并 runtimes + linters + testers
    const tools: StackItem[] = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isStackCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []
      const props: Record<string, string> = {}
      for (const f of fields) {
        if (f.key) {
          const v = f.value
          props[f.key] = Array.isArray(v) ? v.join(', ') : (v ?? '')
        }
      }

      const item: StackItem = { name: ctx.h3, props }
      if (ctx.h2 === 'Tools') {
        tools.push(item)
      }
    }

    return {
      entity: 'stack',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      abstract: typeof frontmatter.abstract === 'string' ? frontmatter.abstract : undefined,
      references: Array.isArray(frontmatter.references) ? (frontmatter.references as string[]) : [],
      citations: typeof frontmatter.citations === 'number' ? frontmatter.citations : 0,
      tools,
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
        message: 'Missing H1 heading (e.g., `# Stack: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Stack' && h1.name !== fmName) {
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
      if (ctx.h2 && !isStackCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'stack'. ` + `Allowed: ${STACK_CATEGORIES.join(', ')}`,
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

function isStackCategory(cat: string): cat is StackCategory {
  return (STACK_CATEGORIES as readonly string[]).includes(cat)
}
