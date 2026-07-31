/**
 * md-bridge/compilers/workflow-compiler.ts — Workflow EntityCompiler 实现
 *
 * v0.6.1-alpha.2 Phase 0 重构：原 Blueprint（slots/deps/observe 执行模板）改名为 Workflow。
 * v0.6.1-alpha.4 Phase 2: 加 ## Externals H2 category（inline 外部引用）。
 * v0.7 重构（PR-1）：
 * - 删除 Props（设计决定）
 * - 删除 Externals（H2 分类白名单移除；external 并入 frontmatter references）
 * - Slot 简化为 name + desc（去 deps 和 observe——已移到 Blueprint Boundary）
 *
 * 角色：
 * - 编译：BlueprintDeclaration → .md（H1 Workflow + ## Slots + ### 实例 + 列表）
 * - 解析：mdast → 业务对象（slots）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Slots
 * - Slot 字段：desc（仅此一个，deps 和 observe 移到 Blueprint Boundary）
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
import { extractListFields, getScalar } from '../../md-pipeline/utils.js'
import type { IntentEntityType } from '../pipeline.js'
import { findLegacyIntentBlocks } from './_legacy-detect.js'

const WORKFLOW_CATEGORIES = ['Slots'] as const
type WorkflowCategory = (typeof WORKFLOW_CATEGORIES)[number]

export class WorkflowCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'workflow'

  // ====================
  // compile
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      descriptions?: Array<{ value?: string }>
      version?: number
      // 🆕 v0.7: slots 只剩 name + desc（去 deps + observe）
      partSlots?: Array<{
        name: string
        desc?: string
      }>
    }

    if (decl?.$type !== 'BlueprintDeclaration') {
      throw new Error(
        `WorkflowCompiler.compile: expected BlueprintDeclaration (Langium 仍是 blueprint 关键字), got ${decl?.$type}`,
      )
    }

    const name = decl.name ?? 'unnamed'
    const version = input.options?.version ?? '0.3.0'
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: workflow')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      sections.push('---')
      sections.push('')
    }

    sections.push(`# Workflow: ${name}`)
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

    // v0.7: ## Props 已删除（Langium BlueprintDeclaration 不再有 props 字段）
    // 旧版 Props section 保留在 git 历史中；新 Workflow 不再 emit ## Props

    if (decl.partSlots && decl.partSlots.length > 0) {
      sections.push('## Slots')
      sections.push('')
      for (const slot of decl.partSlots) {
        sections.push(`### ${slot.name}`)
        // 🆕 v0.7: 只输出 desc（deps 和 observe 移到 Blueprint Boundary）
        const slotDesc = (slot as { desc?: string }).desc
        if (slotDesc) {
          sections.push(`- desc: ${slotDesc}`)
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
  // parse
  // ====================

  parse(input: ParseInput): Record<string, unknown> {
    const { mdast, frontmatter, filePath: _filePath } = input

    const legacy = findLegacyIntentBlocks(mdast)
    if (legacy.length > 0) {
      throw new Error(
        `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found at line ` +
          `${legacy[0]?.position?.start.line ?? '?'}. ` +
          `Syntax deprecated in v0.3.0.`,
      )
    }

    const contexts = extractHeadingContexts(mdast)
    // 🆕 v0.7: props 删除，externals 删除，slot 只保留 desc
    const slots: Array<{ id: string; name: string; desc: string }> = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isWorkflowCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      switch (ctx.h2 as WorkflowCategory) {
        case 'Slots':
          slots.push({
            id: `slot-${slugify(ctx.h3)}`,
            name: ctx.h3,
            desc: getScalar(fields, 'desc') ?? '',
          })
          break
      }
    }

    return {
      entity: 'workflow',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      slots,
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
        message: 'Missing H1 heading (e.g., `# Workflow: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Workflow' && h1.name !== fmName) {
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
      if (ctx.h2 && !isWorkflowCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'workflow'. ` +
            `Allowed: ${WORKFLOW_CATEGORIES.join(', ')}`,
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

function isWorkflowCategory(cat: string): cat is WorkflowCategory {
  return (WORKFLOW_CATEGORIES as readonly string[]).includes(cat)
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'unnamed'
  )
}
