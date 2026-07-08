/**
 * md-bridge/compilers/task-compiler.ts — Task EntityCompiler 实现（独立 task.oxn 文件）
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 编译：Langium TaskDeclaration → .md（## Parts / ## Probes + ### 实例 + 列表）
 * - 解析：mdast → 业务对象（parts / probes）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Parts / Probes
 * - Part 字段：skill_context
 * - Probe 字段：scheme / expect
 *
 * 注：work 内的 task 块由 work-compiler 处理；本 compiler 处理独立 task.oxn 文件
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

/** Task H2 分类白名单 */
const TASK_CATEGORIES = ['Parts', 'Probes'] as const
type TaskCategory = (typeof TASK_CATEGORIES)[number]

export class TaskCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'task'

  // ====================
  // compile（PR-B 完整实现；PR-A 仅占位）
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      body?: Array<{ $type: string; skill_context?: string; name?: string; scheme?: string; expect?: string }>
    }

    if (decl?.$type !== 'TaskDeclaration') {
      throw new Error(`TaskCompiler.compile: expected TaskDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = input.options?.version ?? '0.3.0'
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: task')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      sections.push('---')
      sections.push('')
    }

    sections.push(`# Task: ${name}`)
    sections.push('')

    const body = decl.body ?? []
    const parts = body.filter((el) => el.$type === 'TaskPartDecl')
    const probes = body.filter((el) => el.$type === 'TaskProbeDecl')

    if (parts.length > 0) {
      sections.push('## Parts')
      sections.push('')
      for (const part of parts) {
        const p = part as { name: string; skill_context?: string }
        sections.push(`### ${p.name}`)
        if (p.skill_context) sections.push(`- skill_context: ${p.skill_context}`)
        sections.push('')
      }
    }

    if (probes.length > 0) {
      sections.push('## Probes')
      sections.push('')
      for (const probe of probes) {
        const p = probe as { name: string; scheme?: string; expect?: string }
        sections.push(`### ${p.name}`)
        if (p.scheme) sections.push(`- scheme: ${p.scheme}`)
        if (p.expect) sections.push(`- expect: ${p.expect}`)
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
          `Syntax deprecated in v0.3.0. Please use \`oxn task compile\` to generate fresh .md.`,
      )
    }

    const contexts = extractHeadingContexts(mdast)

    const parts: Array<{ name: string; skill_context: string }> = []
    const probes: Array<{ name: string; scheme: string; expect: string }> = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isTaskCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      switch (ctx.h2 as TaskCategory) {
        case 'Parts':
          parts.push({
            name: ctx.h3,
            skill_context: getScalar(fields, 'skill_context') ?? '',
          })
          break
        case 'Probes':
          probes.push({
            name: ctx.h3,
            scheme: getScalar(fields, 'scheme') ?? '',
            expect: getScalar(fields, 'expect') ?? '',
          })
          break
      }
    }

    return {
      entity: 'task',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      parts,
      probes,
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
        message: 'Missing H1 heading (e.g., `# Task: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Task' && h1.name !== fmName) {
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
      if (ctx.h2 && !isTaskCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'task'. ` + `Allowed: ${TASK_CATEGORIES.join(', ')}`,
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

function isTaskCategory(cat: string): cat is TaskCategory {
  return (TASK_CATEGORIES as readonly string[]).includes(cat)
}

/**
 * 查找遗留 :::intent 容器指令（v0.3 改革前的旧语法）
 * v0.3 PR-B：统一在 pipeline.ts 检测
 */
import { findLegacyIntentBlocks } from './_legacy-detect.js'
export { findLegacyIntentBlocks }
