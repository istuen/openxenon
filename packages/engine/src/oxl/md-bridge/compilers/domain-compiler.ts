/**
 * md-bridge/compilers/domain-compiler.ts — Domain EntityCompiler 实现
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 编译：Langium DomainDeclaration → .md（H1 + ## Terms / ## Bans / ## Invariants + ### 实例 + 列表）
 * - 解析：mdast → 业务对象（terms / bans / invariants）
 * - 校验：H1 必填、H2 白名单、H3 唯一性
 *
 * 关键不变量：
 * - H2 分类白名单：Terms / Bans / Invariants
 * - H3 文本在 ## 分类内唯一（E_MD_DUPLICATE_H3 报错）
 * - H1 文本必须 = "Domain: " + frontmatter.name（E_MD_H1_MISMATCH）
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 * - 不 import L0-Processor / L1-Infra / L2-Work / L3
 *
 * 临时约束（PR-A）：
 * - compile() 仅抛 "not implemented" 桩；PR-B 由 oxl-md-decompiler.ts 调用
 * - parse() / validate() 走实路径
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
import { extractListFields, getScalar, getArray, type ListField } from '../../md-pipeline/utils.js'
import type { IntentEntityType } from '../pipeline.js'

/** Domain H2 分类白名单
 *
 * v0.7 重构（PR-1）：
 * - 删除 'Stack' 类别（v0.4 PR-A 软推荐已废弃——Stack 由独立 Asset 处理）
 * - 删除 'Externals'（external 并入 frontmatter references）
 */
const DOMAIN_CATEGORIES = ['Terms', 'Bans', 'Invariants'] as const
// v0.6.2 扩展：Terms 段允许带 ": <subtopic>" 后缀（如 "## Terms: Asset" / "## Terms: 文档情态"）
// 实际 9 个 domain 文件全部使用此格式，原白名单过严导致全报 E_MD_CATEGORY_UNKNOWN
const DOMAIN_CATEGORY_PREFIXES = ['Terms', 'Bans', 'Invariants'] as const
type DomainCategory = (typeof DOMAIN_CATEGORIES)[number]

/**
 * DomainCompiler — Domain 实体编译器
 */
export class DomainCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'domain'

  // ====================
  // compile（PR-B 完整实现；PR-A 仅占位）
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      descriptions?: Array<{ value?: string }>
      body?: Array<{
        $type: string
        terms?: Array<{ name: string; desc?: string }>
        bans?: string[]
        invariants?: Array<{ value?: string; script?: string; manual?: string; scope?: string }>
      }>
    }

    if (decl?.$type !== 'DomainDeclaration') {
      throw new Error(`DomainCompiler.compile: expected DomainDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = input.options?.version ?? '0.3.0'
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    // 提取 body 内的 TermBlock / BanBlock / InvariantBlock
    const body = decl.body ?? []
    const allTerms = body.flatMap((b) => (b.$type === 'TermBlock' ? (b.terms ?? []) : []))
    const banBlock = body.find((b) => b.$type === 'BanBlock') as { bans?: string[] } | undefined
    const allBanItems = banBlock?.bans ?? []
    const allInvariants = body.flatMap((b) => (b.$type === 'InvariantBlock' ? (b.invariants ?? []) : []))

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: domain')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      sections.push('---')
      sections.push('')
    }

    sections.push(`# Domain: ${name}`)
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

    // ## Terms
    if (allTerms.length > 0) {
      sections.push('## Terms')
      sections.push('')
      for (const term of allTerms) {
        sections.push(`### ${term.name}`)
        if (term.desc) sections.push(`- desc: ${term.desc}`)
        sections.push('')
      }
    }

    // ## Bans
    if (allBanItems.length > 0) {
      sections.push('## Bans')
      sections.push('')
      // 合并所有 ban items 为单块
      const allItems = allBanItems
      if (allItems.length > 0) {
        sections.push(`### forbidden-constructs`)
        sections.push(`- items:`)
        for (const item of allItems) {
          sections.push(`  - ${item}`)
        }
        sections.push(`- desc: ${allItems.join(', ')}`)
        sections.push('')
      }
    }

    // ## Invariants
    if (allInvariants.length > 0) {
      sections.push('## Invariants')
      sections.push('')
      allInvariants.forEach((inv, idx) => {
        const slug = String(idx + 1)
        sections.push(`### inv-${slug}`)
        // 优先用 value / script / manual / scope 的实际字段名（保持原始语义）
        if (inv.value !== undefined) sections.push(`- value: ${unwrapStringValue(inv.value)}`)
        if (inv.script !== undefined) sections.push(`- script: ${unwrapStringValue(inv.script)}`)
        if (inv.manual !== undefined) sections.push(`- manual: ${unwrapStringValue(inv.manual)}`)
        if (inv.scope !== undefined) sections.push(`- scope: ${unwrapStringValue(inv.scope)}`)
        sections.push('')
      })
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

    // 1. 校验旧 :::intent 块（v0.6.1 PR-1：安全网移除，无条件抛错）
    const legacy = findLegacyIntentBlocks(mdast)
    if (legacy.length > 0) {
      throw new Error(
        `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found at line ` +
          `${legacy[0]?.position?.start.line ?? '?'}. ` +
          `Syntax deprecated in v0.3.0. Please use \`oxn domain compile\` to generate fresh .md from your .oxn files.`,
      )
    }

    // 2. 提取 heading contexts
    const contexts = extractHeadingContexts(mdast)

    // 3. 按 H2 分类聚合
    const terms: Array<{ id: string; name: string; desc: string }> = []
    const bans: Array<{ id: string; items: string[]; desc: string }> = []
    const invariants: Array<{ id: string; value: string; desc: string }> = []

    let termIdx = 0
    let banIdx = 0
    let invIdx = 0

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isDomainCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []
      const desc = getScalar(fields, 'desc') ?? ''

      switch (ctx.h2 as DomainCategory) {
        case 'Terms':
          termIdx++
          terms.push({
            id: `term-${slugify(ctx.h3)}`,
            name: ctx.h3,
            desc,
          })
          break
        case 'Bans':
          banIdx++
          bans.push({
            id: `ban-${banIdx}`,
            items: parseBanItems(fields, desc),
            desc,
          })
          break
        case 'Invariants':
          invIdx++
          invariants.push({
            id: `inv-${slugify(ctx.h3)}`,
            value: getScalar(fields, 'value') ?? desc,
            desc,
          })
          break
      }
    }

    return {
      entity: 'domain',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      terms,
      bans,
      invariants,
      _counters: { termIdx, banIdx, invIdx },
    }
  }

  // ====================
  // validate（实路径）
  // ====================

  validate(input: ValidationInput): ValidationError[] {
    const errors: ValidationError[] = []
    const { mdast, frontmatter, filePath: _filePath } = input

    // 1. H1 必填
    const h1 = findH1(mdast)
    if (!h1) {
      errors.push({
        code: 'E_MD_H1_MISSING',
        message: 'Missing H1 heading (e.g., `# Domain: Name`)',
        severity: 'error',
      })
      return errors
    }

    // 2. H1 必须匹配 frontmatter.name
    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Domain' && h1.name !== fmName) {
      errors.push({
        code: 'E_MD_H1_MISMATCH',
        message: `H1 '${h1.text}' does not match frontmatter.name '${fmName}'`,
        severity: 'error',
        line: h1.position?.line,
        column: h1.position?.column,
      })
    }

    // 3. H2 分类白名单
    const contexts = extractHeadingContexts(mdast)
    for (const ctx of contexts) {
      if (ctx.h2 && !isDomainCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'domain'. ` + `Allowed: ${DOMAIN_CATEGORIES.join(', ')}`,
          severity: 'error',
          line: ctx.h3Position?.line,
        })
      }
    }

    // 4. H3 唯一性检查（按 H2 分类内）
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
// 辅助函数
// ========================

function isDomainCategory(cat: string): cat is DomainCategory {
  if ((DOMAIN_CATEGORIES as readonly string[]).includes(cat)) return true
  // 支持 "Terms: <subtopic>" / "Bans: <subtopic>" 等带后缀写法
  return DOMAIN_CATEGORY_PREFIXES.some(
    (prefix) =>
      cat === prefix || cat.startsWith(`${prefix}:`) || cat.startsWith(`${prefix}： `) || cat.startsWith(`${prefix}: `),
  )
}

/** 去除字符串两侧的引号（Langium STRING 终端包含引号）*/
function unwrapStringValue(s: unknown): string {
  if (typeof s !== 'string') return String(s ?? '')
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1)
  }
  return s
}

/**
 * 解析 ban items
 * - 优先用 items 字段（数组）
 * - fallback 用 items 字段（scalar 字符串含 "," 时按 "," 分割）
 * - fallback 用 desc 字段按 "," 分割
 */
function parseBanItems(fields: ListField[], desc: string): string[] {
  const arr = getArray(fields, 'items')
  if (arr.length > 0) return arr
  const scalar = getScalar(fields, 'items')
  if (scalar?.includes(',')) {
    return scalar
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  if (scalar) return [scalar.trim()]
  if (desc?.includes(',')) {
    return desc
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  return []
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

/**
 * 查找遗留 :::intent 容器指令（v0.3 改革前的旧语法）
 *
 * v0.3 PR-B：统一在 pipeline.ts 检测，此处保留 stub
 */
import { findLegacyIntentBlocks } from './_legacy-detect.js'
// re-export for backward compatibility
export { findLegacyIntentBlocks }
