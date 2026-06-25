/**
 * md-bridge/compilers/work-compiler.ts — Work EntityCompiler 实现
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 编译：Langium WorkDeclaration → .md（## Context / ## Tasks + ### 实例 + 嵌套 part/probe 列表）
 * - 解析：mdast → 业务对象（context / tasks）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Context / Tasks
 * - Context 字段：goal / max_iterations / constraints
 * - Task 字段：blueprint / domain / 嵌套 part（含 skill_context + probe）
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
import type { List } from 'mdast'

/** Work H2 分类白名单 */
const WORK_CATEGORIES = ['Context', 'Tasks'] as const
type WorkCategory = (typeof WORK_CATEGORIES)[number]

export class WorkCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'work'

  // ====================
  // compile（PR-B 完整实现；PR-A 仅占位）
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      context?: { goal?: string; loopPolicy?: { maxIterations?: number }; constraints?: string[] }
      tasks?: Array<{
        name: string
        body?: Array<{
          $type: string
          blueprint?: string
          domain?: string
          name?: string
          skill_context?: string
          probes?: Array<{ name?: string; scheme?: string; expect?: string }>
        }>
      }>
    }

    if (!decl || decl.$type !== 'WorkDeclaration') {
      throw new Error(`WorkCompiler.compile: expected WorkDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = input.options?.version ?? '0.3.0'
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: work')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      sections.push('---')
      sections.push('')
    }

    sections.push(`# Work: ${name}`)
    sections.push('')

    // ## Context
    if (decl.context) {
      sections.push('## Context')
      sections.push('')
      sections.push('### primary')
      if (decl.context.goal) sections.push(`- goal: ${decl.context.goal}`)
      if (decl.context.loopPolicy?.maxIterations !== undefined) {
        sections.push(`- max_iterations: ${decl.context.loopPolicy.maxIterations}`)
      }
      if (decl.context.constraints && decl.context.constraints.length > 0) {
        sections.push('- constraints:')
        for (const c of decl.context.constraints) {
          sections.push(`  - ${c}`)
        }
      }
      sections.push('')
    }

    // ## Tasks
    if (decl.tasks && decl.tasks.length > 0) {
      sections.push('## Tasks')
      sections.push('')
      for (const task of decl.tasks) {
        sections.push(`### ${task.name}`)

        // 从 task.body[] 提取 blueprint / domain / parts
        const taskBody = (task.body ?? []) as Array<{
          $type: string
          blueprint?: string
          domain?: string
          name?: string
          skill_context?: string
          probes?: Array<{ name?: string; scheme?: string; expect?: string }>
        }>
        const taskBlueprint = taskBody.find((el) => el.$type === 'TaskBlueprintField')?.blueprint
        const taskDomain = taskBody.find((el) => el.$type === 'TaskDomainField')?.domain
        const taskParts = taskBody.filter((el) => el.$type === 'TaskPartDecl') as Array<{
          name: string
          skill_context?: string
          probes?: Array<{ name?: string; scheme?: string; expect?: string }>
        }>

        if (taskBlueprint) sections.push(`- blueprint: ${taskBlueprint}`)
        if (taskDomain) sections.push(`- domain: ${taskDomain}`)

        for (const part of taskParts) {
          sections.push(`- part: ${part.name}`)
          if (part.skill_context) {
            sections.push(`  - skill_context: ${part.skill_context}`)
          }
          for (const probe of part.probes ?? []) {
            sections.push(`  - probe: ${probe.name ?? 'unnamed'}`)
            if (probe.scheme) sections.push(`    - scheme: ${probe.scheme}`)
            if (probe.expect) sections.push(`    - expect: ${probe.expect}`)
          }
        }
        sections.push('')
      }
    }

    const md =
      sections
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n'

    return { md, name, warnings }
  }

  // ====================
  // parse（实路径）
  // ====================

  parse(input: ParseInput): Record<string, unknown> {
    const { mdast, frontmatter, options, filePath: _filePath } = input

    if (options?.allowLegacyDirective !== true) {
      const legacy = findLegacyIntentBlocks(mdast)
      if (legacy.length > 0) {
        throw new Error(
          `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found. ` +
            `Syntax deprecated in v0.3.0. Please use \`oxn work compile\` to generate fresh .md.`,
        )
      }
    }

    const contexts = extractHeadingContexts(mdast)

    let contextObj: { goal: string; max_iterations: number; constraints: string[] } | null = null
    const tasks: Array<{
      name: string
      blueprint: string
      domain: string
      parts: Array<{
        name: string
        skill_context: string
        probes: Array<{ name: string; scheme: string; expect: string }>
      }>
    }> = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isWorkCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      switch (ctx.h2 as WorkCategory) {
        case 'Context':
          contextObj = {
            goal: getScalar(fields, 'goal') ?? '',
            max_iterations: Number(getScalar(fields, 'max_iterations') ?? '0') || 0,
            constraints: getArray(fields, 'constraints'),
          }
          break
        case 'Tasks': {
          // Task 下嵌套 part（含 skill_context + probe）
          // 使用 raw mdast 提取（处理嵌套 probe 形如 "- probe: <name>\n    - scheme: ...")
          const partItems = ctx.h3List ? extractPartItemsFromList(ctx.h3List) : []
          tasks.push({
            name: ctx.h3,
            blueprint: getScalar(fields, 'blueprint') ?? '',
            domain: getScalar(fields, 'domain') ?? '',
            parts: partItems,
          })
          break
        }
      }
    }

    return {
      entity: 'work',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      context: contextObj ?? { goal: '', max_iterations: 0, constraints: [] },
      tasks,
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
        message: 'Missing H1 heading (e.g., `# Work: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Work' && h1.name !== fmName) {
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
      if (ctx.h2 && !isWorkCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'work'. ` + `Allowed: ${WORK_CATEGORIES.join(', ')}`,
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

function isWorkCategory(cat: string): cat is WorkCategory {
  return (WORK_CATEGORIES as readonly string[]).includes(cat)
}

/**
 * 从 List 节点提取 part items（处理 "- part: <name>\n  - <attr>: ..." 结构）
 *
 * 返回每个 part 的：name（来自 "- part: <name>" 的 remainder）+ skill_context + probes 数组
 */
function extractPartItemsFromList(
  list: List,
): Array<{ name: string; skill_context: string; probes: Array<{ name: string; scheme: string; expect: string }> }> {
  const parts: Array<{
    name: string
    skill_context: string
    probes: Array<{ name: string; scheme: string; expect: string }>
  }> = []

  for (const item of list.children) {
    if (item.type !== 'listItem') continue

    // 从第一个 paragraph 提取 key + remainder
    const firstChild = item.children[0]
    if (!firstChild || firstChild.type !== 'paragraph') continue

    const { key, remainder } = extractKeyFromParagraph(firstChild)
    if (key !== 'part') continue // 只处理 part listItem

    const partName = remainder.trim()

    // 找子 list
    const childList = item.children.find((c) => c.type === 'list') as List | undefined
    const skillContext = childList ? extractScalarFromList(childList, 'skill_context') : ''

    // 提取 probes（从 childList 中）
    const probes: Array<{ name: string; scheme: string; expect: string }> = []
    if (childList) {
      for (const probeItem of childList.children) {
        if (probeItem.type !== 'listItem') continue
        const p = probeItem.children[0]
        if (!p || p.type !== 'paragraph') continue
        const { key: probeKey, remainder: probeRemainder } = extractKeyFromParagraph(p)
        if (probeKey !== 'probe') continue
        const probeName = probeRemainder.trim()
        // 找 probe 的子 list（scheme / expect）
        const probeChildList = probeItem.children.find((c) => c.type === 'list') as List | undefined
        const scheme = probeChildList ? extractScalarFromList(probeChildList, 'scheme') : ''
        const expect = probeChildList ? extractScalarFromList(probeChildList, 'expect') : ''
        probes.push({ name: probeName, scheme, expect })
      }
    }

    parts.push({ name: partName, skill_context: skillContext, probes })
  }

  return parts
}

/** 提取 listItem 第一段落的 key + remainder */
function extractKeyFromParagraph(p: import('mdast').Paragraph): { key: string; remainder: string } {
  const fullText = p.children
    .map((c) => {
      if (c.type === 'text' || c.type === 'inlineCode') return c.value
      if ('children' in c && Array.isArray(c.children)) {
        return c.children.map((cc) => (cc.type === 'text' || cc.type === 'inlineCode' ? cc.value : '')).join('')
      }
      return ''
    })
    .join('')
  const colonIdx = fullText.indexOf(':')
  if (colonIdx === -1) return { key: '', remainder: fullText }
  return { key: fullText.slice(0, colonIdx).trim(), remainder: fullText.slice(colonIdx + 1).trim() }
}

/** 从 List 中提取指定 key 的标量值（单层） */
function extractScalarFromList(list: List, key: string): string {
  for (const item of list.children) {
    if (item.type !== 'listItem') continue
    const p = item.children[0]
    if (!p || p.type !== 'paragraph') continue
    const { key: k, remainder } = extractKeyFromParagraph(p)
    if (k === key) return remainder.trim()
  }
  return ''
}

/**
 * 查找遗留 :::intent 容器指令（v0.3 改革前的旧语法）
 * v0.3 PR-B：统一在 pipeline.ts 检测
 */
import { findLegacyIntentBlocks } from './_legacy-detect.js'
export { findLegacyIntentBlocks }
