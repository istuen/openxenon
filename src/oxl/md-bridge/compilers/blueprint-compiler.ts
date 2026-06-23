/**
 * md-bridge/compilers/blueprint-compiler.ts — Blueprint EntityCompiler 实现
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 编译：Langium BlueprintDeclaration → .md（## Props / ## Slots + ### 实例 + 嵌套列表）
 * - 解析：mdast → 业务对象（props / slots）
 * - 校验：H1 + H2 白名单 + H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Props / Slots
 * - Prop 字段：type / values / required / default
 * - Slot 字段：deps（数组）/ observe（数组）
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
import { extractHeadingContexts, findH1 } from '../extract-headings.js'
import { extractListFields, getScalar, getArray, type ListField } from '../extract-list-fields.js'
import type { IntentEntityType } from '../pipeline.js'

/** Blueprint H2 分类白名单 */
const BLUEPRINT_CATEGORIES = ['Props', 'Slots'] as const
type BlueprintCategory = (typeof BLUEPRINT_CATEGORIES)[number]

export class BlueprintCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'blueprint'

  // ====================
  // compile（PR-B 完整实现；PR-A 仅占位）
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      descriptions?: Array<{ value?: string }>
      version?: number
      props?: Array<{
        name: string
        type?: unknown
        required?: { value?: unknown }
        default?: { value?: unknown }
      }>
      partSlots?: Array<{ name: string; deps?: string[]; observe?: Array<{ observes: string[] }> }>
    }

    if (!decl || decl.$type !== 'BlueprintDeclaration') {
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

    // ## Props
    if (decl.props && decl.props.length > 0) {
      sections.push('## Props')
      sections.push('')
      for (const prop of decl.props) {
        const typeName = extractTypeName(prop.type)
        sections.push(`### ${prop.name}`)
        sections.push(`- type: ${typeName}`)
        // enum 类型：- values: [a, b, c]
        if (typeName.startsWith('enum(')) {
          const enumType = prop.type as { values?: string[] }
          if (enumType.values && enumType.values.length > 0) {
            sections.push(`- values: [${enumType.values.join(', ')}]`)
          }
        }
        // required 修饰符：value 是 BooleanLiteral AST 节点
        if (prop.required?.value) {
          if (typeof prop.required.value === 'object' && '$type' in (prop.required.value as object)) {
            // 通过 $cstNode.text 提取原始文本
            const cstText = (prop.required.value as { $cstNode?: { text?: string } }).$cstNode?.text
            if (cstText === 'true') sections.push('- required: true')
          } else if (prop.required.value === true) {
            sections.push('- required: true')
          }
        }
        if (prop.default !== undefined) {
          const defaultStr = expressionToString(prop.default.value)
          if (defaultStr) sections.push(`- default: ${defaultStr}`)
        }
        sections.push('')
      }
    }

    // ## Slots
    if (decl.partSlots && decl.partSlots.length > 0) {
      sections.push('## Slots')
      sections.push('')
      for (const slot of decl.partSlots) {
        sections.push(`### ${slot.name}`)
        if (!slot.deps || slot.deps.length === 0) {
          sections.push('- deps: []')
        } else {
          sections.push('- deps:')
          for (const dep of slot.deps) {
            sections.push(`  - ${dep}`)
          }
        }
        const observe = (slot.observe ?? []).flatMap((o) => o.observes)
        if (observe.length === 0) {
          sections.push('- observe: []')
        } else {
          sections.push('- observe:')
          for (const o of observe) {
            sections.push(`  - ${o}`)
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
            `Syntax deprecated in v0.3.0. Please use \`oxn blueprint compile\` to generate fresh .md.`,
        )
      }
    }

    const contexts = extractHeadingContexts(mdast)

    const props: Array<{ name: string; type: string; values: string[]; required: boolean; default: string | null }> = []
    const slots: Array<{ name: string; deps: string[]; observe: string[] }> = []

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isBlueprintCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      switch (ctx.h2 as BlueprintCategory) {
        case 'Props':
          props.push({
            name: ctx.h3,
            type: getScalar(fields, 'type') ?? 'string',
            values: parseValuesField(fields),
            required: getScalar(fields, 'required') === 'true',
            default: getScalar(fields, 'default') ?? null,
          })
          break
        case 'Slots':
          slots.push({
            name: ctx.h3,
            deps: getArray(fields, 'deps'),
            observe: getArray(fields, 'observe'),
          })
          break
      }
    }

    return {
      entity: 'blueprint',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      props,
      slots,
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

function extractTypeName(typeRef: unknown): string {
  if (typeRef === undefined || typeRef === null) return 'string'
  if (typeof typeRef === 'string') return typeRef
  const t = typeRef as {
    $type?: string
    values?: string[]
    container?: string
    inner?: unknown
    $cstNode?: { text?: string }
  }
  // TypeReference 包装节点（PrimitiveType 经 Langium 包装后）
  if (t.$type === 'TypeReference') {
    const cstText = t.$cstNode?.text
    if (cstText) return cstText
    return 'string'
  }
  if (t.$type === 'EnumType' && t.values) {
    return `enum(${t.values.join('|')})`
  }
  if (t.$type === 'GenericType' && t.container) {
    return `${t.container}<${extractTypeName(t.inner)}>`
  }
  if (t.$type === 'AnyTypeRef' || t.$type === 'AnyType') {
    return 'any'
  }
  return 'string'
}

/**
 * 提取 Expression 的可读字符串表示
 *
 * Langium 对 PrimitiveType literal 的处理是「lossy」：LiteralExpr 节点本身不存 value，
 * 实际值存在 $cstNode.text（CST 原文）。这里通过 $cstNode 取回原文。
 */
function expressionToString(expr: unknown): string {
  if (expr === null || expr === undefined) return ''
  if (typeof expr === 'string') return expr
  if (typeof expr === 'number' || typeof expr === 'boolean') return String(expr)
  if (typeof expr !== 'object') return String(expr)

  const e = expr as { $type?: string; value?: unknown; $cstNode?: { text?: string } }
  // TemplateString（v0.2 支持 "包含 ${var} 模板"）
  if (e.$type === 'TemplateString' && typeof e.value === 'string') {
    return e.value
  }
  // LiteralExpr：fallback 到 CST 原文
  if (e.$type === 'LiteralExpr') {
    const text = e.$cstNode?.text
    if (text !== undefined) {
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1)
      }
      return text
    }
  }
  // VariableRef（不展开，仅显示 ref 路径）
  if (e.$type === 'VariableRef') {
    const qn = (expr as { path?: { name?: string; segments?: string[] } }).path
    if (qn) {
      return qn.segments?.length ? `${qn.name}.${qn.segments.join('.')}` : (qn.name ?? '')
    }
  }
  return String(expr)
}

/**
 * 解析 values 字段（"- values: [dev, staging, prod]" 形式）
 * - 优先用数组形式（嵌套 list）
 * - fallback 用字符串形式（"[dev, staging, prod]"）按 "," 分割
 */
function parseValuesField(fields: ListField[]): string[] {
  const arr = getArray(fields, 'values')
  if (arr.length > 0) return arr
  const scalar = getScalar(fields, 'values')
  if (scalar) {
    // 去掉首尾的 [ ]
    const cleaned = scalar.replace(/^\[|]$/g, '').trim()
    if (cleaned) {
      return cleaned
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }
  }
  return []
}

/**
 * 查找遗留 :::intent 容器指令（v0.3 改革前的旧语法）
 * v0.3 PR-B：统一在 pipeline.ts 检测
 */
import { findLegacyIntentBlocks } from './_legacy-detect.js'
export { findLegacyIntentBlocks }
