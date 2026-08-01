/**
 * md-bridge/compilers/blueprint-compiler.ts — Blueprint EntityCompiler 实现
 *
 * v0.7 重构（PR-1）：
 * - H2 分类白名单：Use / Boundaries（替代 Props / Slots）
 * - Props 已删除（设计决定）
 * - Use: 引用三边界（domain / workflow / stack），替代 Refs
 * - Boundaries: 编排单元（refs + observe + deps）
 *
 * 角色：
 * - 编译：BlueprintDeclaration → .md（## Use / ## Boundaries + ### 实例 + 嵌套列表）
 * - 解析：mdast → 业务对象（use + boundaries）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
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

/** Blueprint H2 分类白名单 */
const BLUEPRINT_CATEGORIES = ['Use', 'Boundaries'] as const
type BlueprintCategory = (typeof BLUEPRINT_CATEGORIES)[number]

export class BlueprintCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'blueprint'

  // ====================
  // compile
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      descriptions?: Array<{ value?: string }>
      version?: number
      // 🆕 v0.7: use + boundaries 替代 props + partSlots
      use?: {
        domain?: Array<{ name: string; ref: string }>
        workflow?: Array<{ name: string; ref: string }>
        stack?: Array<{ name: string; ref: string }>
      }
      boundaries?: Array<{
        name: string
        refs?: Array<{ kind: 'domain' | 'workflow' | 'stack'; ref: string }>
        observe?: string[]
        deps?: string[]
      }>
    }

    if (decl?.$type !== 'BlueprintDeclaration') {
      throw new Error(`BlueprintCompiler.compile: expected BlueprintDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = String(decl.version ?? input.options?.version ?? '0.3.0')
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: blueprint')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      sections.push('---')
      sections.push('')
    }

    sections.push(`# Blueprint: ${name}`)
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

    // ## Use（引用三边界）
    if (decl.use && (decl.use.domain?.length || decl.use.workflow?.length || decl.use.stack?.length)) {
      sections.push('## Use')
      sections.push('')
      const allUseEntries = [
        ...(decl.use.domain ?? []).map((e) => ({ kind: 'domain' as const, ...e })),
        ...(decl.use.workflow ?? []).map((e) => ({ kind: 'workflow' as const, ...e })),
        ...(decl.use.stack ?? []).map((e) => ({ kind: 'stack' as const, ...e })),
      ]
      for (const entry of allUseEntries) {
        sections.push(`### ${entry.name}`)
        sections.push(`- ${entry.kind}: ${entry.ref}`)
        sections.push('')
      }
    }

    // ## Boundaries（编排单元）
    if (decl.boundaries && decl.boundaries.length > 0) {
      sections.push('## Boundaries')
      sections.push('')
      for (const b of decl.boundaries) {
        sections.push(`### ${b.name}`)
        if (b.refs && b.refs.length > 0) {
          sections.push('- refs:')
          for (const r of b.refs) {
            sections.push(`  - ${r.kind}: ${r.ref}`)
          }
        }
        if (b.observe && b.observe.length > 0) {
          sections.push('- observe:')
          for (const o of b.observe) {
            sections.push(`  - ${o}`)
          }
        }
        if (b.deps && b.deps.length > 0) {
          sections.push('- deps:')
          for (const d of b.deps) {
            sections.push(`  - ${d}`)
          }
        } else {
          sections.push('- deps: []')
        }
        sections.push('')
      }
    }

    const md = `${sections
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd()}\n`

    return { md, name, warnings }
  }

  // ====================
  // parse（实路径）
  // ====================

  parse(input: ParseInput): Record<string, unknown> {
    const { mdast, frontmatter, filePath: _filePath } = input

    // v0.6.1 PR-1: 安全网移除，无条件抛 E_MD_DEPRECATED_SYNTAX
    const legacy = findLegacyIntentBlocks(mdast)
    if (legacy.length > 0) {
      throw new Error(
        `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found. ` +
          `Syntax deprecated in v0.3.0. Please use \`oxn blueprint compile\` to generate fresh .md.`,
      )
    }

    const contexts = extractHeadingContexts(mdast)

    const use = {
      domain: [] as Array<{ name: string; ref: string }>,
      workflow: [] as Array<{ name: string; ref: string }>,
      stack: [] as Array<{ name: string; ref: string }>,
    }
    const boundaries: Array<{
      name: string
      refs: Array<{ kind: string; ref: string }>
      observe: string[]
      deps: string[]
    }> = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isBlueprintCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      switch (ctx.h2 as BlueprintCategory) {
        case 'Use': {
          // ### <name> / - domain: X @path / - workflow: Y / - stack: Z
          for (const f of fields) {
            if (f.key === 'domain' && typeof f.value === 'string') {
              use.domain.push({ name: ctx.h3, ref: f.value })
            } else if (f.key === 'workflow' && typeof f.value === 'string') {
              use.workflow.push({ name: ctx.h3, ref: f.value })
            } else if (f.key === 'stack' && typeof f.value === 'string') {
              use.stack.push({ name: ctx.h3, ref: f.value })
            }
          }
          break
        }
        case 'Boundaries': {
          const refs: Array<{ kind: string; ref: string }> = []
          const observe: string[] = []
          const deps: string[] = []
          for (const f of fields) {
            if (f.key === 'refs') {
              // refs 可能是嵌套 list（数组）或 scalar 字符串
              if (Array.isArray(f.value)) {
                for (const v of f.value as string[]) {
                  const m = String(v).match(/^(\w+):\s*(.+)$/)
                  if (m) refs.push({ kind: m[1]!, ref: m[2]!.trim() })
                }
              } else if (typeof f.value === 'string' && f.value.length > 0 && f.value !== '[]') {
                // 兼容 scalar 形式
                const m = f.value.match(/^(\w+):\s*(.+)$/)
                if (m) refs.push({ kind: m[1]!, ref: m[2]!.trim() })
              }
            } else if (f.key === 'observe') {
              if (Array.isArray(f.value)) {
                observe.push(...(f.value as string[]))
              } else if (typeof f.value === 'string' && f.value.length > 0 && f.value !== '[]') {
                observe.push(f.value)
              }
            } else if (f.key === 'deps') {
              if (Array.isArray(f.value)) {
                deps.push(...(f.value as string[]))
              } else if (typeof f.value === 'string' && f.value.length > 0 && f.value !== '[]') {
                deps.push(f.value)
              }
            }
          }
          boundaries.push({ name: ctx.h3, refs, observe, deps })
          break
        }
      }
    }

    return {
      entity: 'blueprint',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      use,
      boundaries,
    }
  }

  // ====================
  // validate（实路径）
  // ====================

  validate(input: ValidationInput): ValidationError[] {
    const errors: ValidationError[] = []
    const { mdast, frontmatter, filePath: _filePath } = input

    const h1 = findH1(mdast)
    if (!h1) {
      errors.push({
        code: 'E_MD_H1_MISSING',
        message: 'Missing H1 heading (e.g., `# Blueprint: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Blueprint' && h1.name !== fmName) {
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
      if (ctx.h2 && !isBlueprintCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'blueprint'. ` +
            `Allowed: ${BLUEPRINT_CATEGORIES.join(', ')}`,
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

function isBlueprintCategory(cat: string): cat is BlueprintCategory {
  return (BLUEPRINT_CATEGORIES as readonly string[]).includes(cat)
}

/**
 * 查找遗留 :::intent 容器指令（v0.3 改革前的旧语法）
 * v0.3 PR-B：统一在 pipeline.ts 检测
 */
import { findLegacyIntentBlocks } from './_legacy-detect.js'
export { findLegacyIntentBlocks }
