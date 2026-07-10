/**
 * md-bridge/compilers/workflow-compiler.ts — Workflow EntityCompiler 实现
 *
 * v0.6.1-alpha.2 Phase 0 重构：原 Blueprint（slots/deps/observe 执行模板）改名为 Workflow。
 * v0.6.1-alpha.4 Phase 2: 加 ## Externals H2 category（inline 外部引用）。
 *
 * 角色：
 * - 编译：Langium BlueprintDeclaration → .md（H1 Workflow + ## Props / ## Slots / ## Externals + ### 实例 + 嵌套列表）
 * - 解析：mdast → 业务对象（props / slots / externals）
 * - 校验：H1 + H2 白名单 + H3 唯一性 + External kind enum + url/path 互斥
 *
 * 关键不变量：
 * - H2 分类白名单：Props / Slots / Externals
 * - Prop 字段：type / values / required / default
 * - Slot 字段：deps（数组）/ observe（数组）
 * - External 字段：url 或 path（互斥） / kind（enum 6 值）/ ttl / auth / summary
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
import { extractListFields, getScalar, getArray } from '../../md-pipeline/utils.js'
import type { IntentEntityType } from '../pipeline.js'
import { validateExternal, type ExternalEntry } from './external-validate.js'
import { findLegacyIntentBlocks } from './_legacy-detect.js'

const WORKFLOW_CATEGORIES = ['Props', 'Slots', 'Externals'] as const
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
      props?: Array<{
        name: string
        type?: string
        values?: string[]
        required?: boolean
        defaultValue?: string
      }>
      partSlots?: Array<{
        name: string
        deps?: string[]
        observe?: string[]
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

    if (decl.props && decl.props.length > 0) {
      sections.push('## Props')
      sections.push('')
      for (const p of decl.props) {
        sections.push(`### ${p.name}`)
        sections.push(`- type: ${p.type ?? 'string'}`)
        if (p.values && p.values.length > 0) {
          sections.push(`- values: [${p.values.join(', ')}]`)
        }
        if (p.required !== undefined) sections.push(`- required: ${p.required}`)
        if (p.defaultValue !== undefined) sections.push(`- default: ${p.defaultValue}`)
        sections.push('')
      }
    }

    if (decl.partSlots && decl.partSlots.length > 0) {
      sections.push('## Slots')
      sections.push('')
      for (const slot of decl.partSlots) {
        sections.push(`### ${slot.name}`)
        if (slot.deps && slot.deps.length > 0) {
          sections.push(`- deps:`)
          for (const dep of slot.deps) {
            sections.push(`  - ${dep}`)
          }
        } else {
          sections.push(`- deps: []`)
        }
        if (slot.observe && slot.observe.length > 0) {
          sections.push(`- observe:`)
          for (const obs of slot.observe) {
            sections.push(`  - ${obs}`)
          }
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
    const props: Array<{
      id: string
      name: string
      type: string
      values: string[]
      required: boolean
      defaultValue: string
    }> = []
    const slots: Array<{ id: string; name: string; deps: string[]; observe: string[] }> = []
    const externals: ExternalEntry[] = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isWorkflowCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      switch (ctx.h2 as WorkflowCategory) {
        case 'Props':
          props.push({
            id: `prop-${slugify(ctx.h3)}`,
            name: ctx.h3,
            type: getScalar(fields, 'type') ?? 'string',
            values: getArray(fields, 'values'),
            required: getScalar(fields, 'required') === 'true',
            defaultValue: getScalar(fields, 'default') ?? '',
          })
          break
        case 'Slots':
          slots.push({
            id: `slot-${slugify(ctx.h3)}`,
            name: ctx.h3,
            deps: getArray(fields, 'deps'),
            observe: getArray(fields, 'observe'),
          })
          break
        case 'Externals':
          // 🆕 Phase 2: External inline 声明
          externals.push({
            name: ctx.h3,
            url: getScalar(fields, 'url'),
            path: getScalar(fields, 'path'),
            kind: getScalar(fields, 'kind') ?? '',
            ttl: getScalar(fields, 'ttl'),
            auth: getScalar(fields, 'auth'),
            summary: getScalar(fields, 'summary'),
          })
          break
      }
    }

    return {
      entity: 'workflow',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      props,
      slots,
      externals,
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
    const externals: ExternalEntry[] = []
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

      if (ctx.h2 === 'Externals') {
        const fields = ctx.h3List ? extractListFields(ctx.h3List) : []
        externals.push({
          name: ctx.h3,
          url: getScalar(fields, 'url'),
          path: getScalar(fields, 'path'),
          kind: getScalar(fields, 'kind') ?? '',
          ttl: getScalar(fields, 'ttl'),
          auth: getScalar(fields, 'auth'),
          summary: getScalar(fields, 'summary'),
        })
      }
    }

    // 🆕 Phase 2: External 校验
    for (const ext of externals) {
      validateExternal(ext, errors)
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
