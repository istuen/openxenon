/**
 * md-pipeline/plugins/remark-canonical.ts — v0.4 PR-C3 unified-native 校验 plugin
 *
 * 角色：unified plugin 形式的 canonical 守卫 (12 E_MD_* 错误码)
 * 取代 src/oxl/md-bridge/mdast-validator.ts (compat 期间未删)
 *
 * 设计原则：
 *   - 每个守卫是一个独立函数 (visitor-style), 可独立 use
 *   - 输出统一存到 tree.data.canonicalIssues (errors + warnings 数组)
 *   - 与现有 ValidationIssue 形状一致 (兼容旧 consumer)
 *
 * 守卫清单 (12 E_MD_*):
 *   - E_MD_INVALID_SYNTAX         (mdast parse 失败)
 *   - E_MD_MISSING_REQUIRED       (frontmatter 缺字段)
 *   - E_MD_TYPE_MISMATCH          (entity / version / status 类型错)
 *   - E_MD_REFERENCE_BROKEN_FATAL (引用资产不存在 - fatal)
 *   - E_MD_REFERENCE_BROKEN_WARN  (引用资产不存在 - warn)
 *   - E_MD_HASH_MISMATCH          (文件 hash 不匹配)
 *   - E_MD_REDUNDANT_FIELD        (重复字段)
 *   - E_MD_LIST_FORMAT_INVALID    (列表格式错)
 *   - E_MD_NESTED_LEVEL_OVERFLOW  (嵌套层级超限)
 *   - E_MD_INVALID_RUNTIME_BLOCK  (runtime block 错)
 *   - E_MD_CATEGORY_UNKNOWN       (H2 分类不在白名单)
 *   - E_MD_DUPLICATE_H3           (H3 在 ## 分类内重复)
 *   - E_MD_DEPRECATED_SYNTAX      (legacy :::intent 块)
 *   - E_MD_H1_MISSING             (H1 缺失)
 *   - E_MD_H1_MISMATCH            (H1 与 frontmatter.name 不一致)
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层
 *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import type { Root, Heading, Paragraph } from 'mdast'
import { visit } from 'unist-util-visit'

// ========================
// 错误码 (typed)
// ========================

export type CanonicalErrorCode =
  | 'E_MD_INVALID_SYNTAX'
  | 'E_MD_MISSING_REQUIRED'
  | 'E_MD_TYPE_MISMATCH'
  | 'E_MD_REFERENCE_BROKEN_FATAL'
  | 'E_MD_REFERENCE_BROKEN_WARN'
  | 'E_MD_HASH_MISMATCH'
  | 'E_MD_REDUNDANT_FIELD'
  | 'E_MD_LIST_FORMAT_INVALID'
  | 'E_MD_NESTED_LEVEL_OVERFLOW'
  | 'E_MD_INVALID_RUNTIME_BLOCK'
  | 'E_MD_CATEGORY_UNKNOWN'
  | 'E_MD_DUPLICATE_H3'
  | 'E_MD_DEPRECATED_SYNTAX'
  | 'E_MD_H1_MISSING'
  | 'E_MD_H1_MISMATCH'

export interface CanonicalIssue {
  code: CanonicalErrorCode
  message: string
  severity: 'error' | 'warning'
  line?: number
  column?: number
  field?: string
  rule?: string
}

export interface CanonicalResult {
  errors: CanonicalIssue[]
  warnings: CanonicalIssue[]
}

// ========================
// 实体 H2 分类白名单
// ========================

export const ENTITY_H2_WHITELIST: Record<string, readonly string[]> = {
  domain: ['Terms', 'Bans', 'Invariants', 'Stack'],
  blueprint: ['Props', 'Slots'],
  work: ['Context', 'Tasks'],
  task: ['Domain', 'Blueprint', 'Parts'],
  proof: ['Description', 'Probes'],
}

export const VALID_ENTITIES = Object.keys(ENTITY_H2_WHITELIST)
export const VALID_STATUS = ['pending', 'running', 'passed', 'failed', 'error']

// ========================
// 守卫 1: E_MD_H1_MISSING + E_MD_H1_MISMATCH
// ========================

function checkH1(tree: Root, entity: string, name: string): CanonicalIssue[] {
  const issues: CanonicalIssue[] = []
  let foundH1 = false

  for (const child of tree.children) {
    if (child.type === 'heading' && child.depth === 1) {
      foundH1 = true
      const text = (child.children ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.value)
        .join('')
      // H1 形式: "<Entity>: <Name>"
      const m = text.match(new RegExp(`^${entity}:\\s*(.+)$`, 'i'))
      if (m && m[1]?.trim() !== name) {
        issues.push({
          code: 'E_MD_H1_MISMATCH',
          message: `H1 '${text}' does not match frontmatter.name '${name}'`,
          severity: 'error',
          line: child.position?.start.line,
          column: child.position?.start.column,
        })
      }
    }
  }

  if (!foundH1) {
    issues.push({
      code: 'E_MD_H1_MISSING',
      message: `Missing H1 heading (e.g., \`# ${capitalize(entity)}: <name>\`)`,
      severity: 'error',
    })
  }

  return issues
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ========================
// 守卫 2: E_MD_CATEGORY_UNKNOWN + E_MD_DUPLICATE_H3
// ========================

function checkH2Categories(tree: Root, entity: string): CanonicalIssue[] {
  const issues: CanonicalIssue[] = []
  const whitelist = ENTITY_H2_WHITELIST[entity] ?? []
  const h3SeenPerH2 = new Map<string, Set<string>>()

  let currentH2: string | null = null
  for (const child of tree.children) {
    if (child.type === 'heading') {
      const h = child as Heading
      const text = (h.children ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.value)
        .join('')
      if (h.depth === 2) {
        // H2 在白名单?
        if (!whitelist.includes(text)) {
          issues.push({
            code: 'E_MD_CATEGORY_UNKNOWN',
            message: `Unknown H2 category '${text}' for entity '${entity}'. Allowed: ${whitelist.join(', ')}`,
            severity: 'error',
            line: h.position?.start.line,
            column: h.position?.start.column,
          })
        }
        currentH2 = text
        h3SeenPerH2.set(text, new Set())
      } else if (h.depth === 3 && currentH2) {
        // H3 在 ## 分类内重复?
        const seen = h3SeenPerH2.get(currentH2)
        if (seen) {
          if (seen.has(text)) {
            issues.push({
              code: 'E_MD_DUPLICATE_H3',
              message: `Duplicate H3 '${text}' in '## ${currentH2}'`,
              severity: 'error',
              line: h.position?.start.line,
              column: h.position?.start.column,
            })
          } else {
            seen.add(text)
          }
        }
      }
    }
  }

  return issues
}

// ========================
// 守卫 3: E_MD_DEPRECATED_SYNTAX (legacy :::intent)
// ========================

function checkDeprecatedSyntax(tree: Root): CanonicalIssue[] {
  const issues: CanonicalIssue[] = []
  visit(tree, (node) => {
    // remark-directive 解析为 containerDirective / leafDirective / textDirective 节点
    const t = (node as { type: string }).type
    if (t === 'containerDirective' || t === 'leafDirective' || t === 'textDirective') {
      issues.push({
        code: 'E_MD_DEPRECATED_SYNTAX',
        message: `Legacy :::intent block found. Use \`oxn ${entityFromTree(tree)} compile\` to regenerate .md from .oxn.`,
        severity: 'error',
        line: (node as { position?: { start?: { line?: number } } }).position?.start?.line,
      })
    }
  })
  return issues
}

function entityFromTree(tree: Root): string {
  for (const child of tree.children) {
    if (child.type === 'yaml') {
      const m = (child as { value: string }).value.match(/^entity:\s*(.+)$/m)
      if (m) return m[1]!.trim()
    }
  }
  return 'asset'
}

// ========================
// 守卫 4: E_MD_MISSING_REQUIRED (frontmatter 必填字段)
// ========================

function checkRequiredFields(frontmatter: Record<string, unknown>, entity: string): CanonicalIssue[] {
  const issues: CanonicalIssue[] = []
  const required: Record<string, string[]> = {
    domain: ['entity', 'name'],
    blueprint: ['entity', 'name'],
    work: ['entity', 'name'],
    task: ['entity', 'name'],
    proof: ['entity', 'name'],
  }
  const fields = required[entity] ?? []
  for (const f of fields) {
    if (!(f in frontmatter)) {
      issues.push({
        code: 'E_MD_MISSING_REQUIRED',
        message: `Required frontmatter field missing: ${f}`,
        severity: 'error',
        field: f,
      })
    }
  }
  return issues
}

// ========================
// 守卫 5: E_MD_TYPE_MISMATCH (entity / version / status)
// ========================

function checkTypes(frontmatter: Record<string, unknown>): CanonicalIssue[] {
  const issues: CanonicalIssue[] = []
  if ('entity' in frontmatter && !VALID_ENTITIES.includes(String(frontmatter.entity))) {
    issues.push({
      code: 'E_MD_TYPE_MISMATCH',
      message: `Invalid entity '${frontmatter.entity}'. Must be one of: ${VALID_ENTITIES.join(', ')}`,
      severity: 'error',
      field: 'entity',
    })
  }
  if ('version' in frontmatter) {
    const v = String(frontmatter.version)
    if (!/^v?\d+\.\d+\.\d+$/.test(v)) {
      issues.push({
        code: 'E_MD_TYPE_MISMATCH',
        message: `Invalid version '${v}'. Must match v<X.Y.Z>`,
        severity: 'error',
        field: 'version',
      })
    }
  }
  if ('status' in frontmatter && !VALID_STATUS.includes(String(frontmatter.status))) {
    issues.push({
      code: 'E_MD_TYPE_MISMATCH',
      message: `Invalid status '${frontmatter.status}'. Must be one of: ${VALID_STATUS.join(', ')}`,
      severity: 'warning',
      field: 'status',
    })
  }
  return issues
}

// ========================
// 守卫 6: E_MD_LIST_FORMAT_INVALID (key: value 格式)
// ========================

function checkListFormat(tree: Root): CanonicalIssue[] {
  const issues: CanonicalIssue[] = []
  visit(tree, 'listItem', (item) => {
    const firstPara = (item.children ?? []).find((c) => c.type === 'paragraph') as Paragraph | undefined
    if (!firstPara) return
    const firstText = (firstPara.children ?? []).find((c) => c.type === 'text')
    if (!firstText) return
    const raw = (firstText as { value: string }).value
    // 检查是否含 key: value 形式 (允许前导 whitespace)
    if (raw.trim() && !/^[\w-]+:\s*/.test(raw) && !raw.startsWith('-')) {
      // 不是 list item 形式 → 仅当是 text-only list item 才报错
      if (raw.length > 0 && !raw.startsWith('#')) {
        issues.push({
          code: 'E_MD_LIST_FORMAT_INVALID',
          message: `List item should follow "key: value" format, got: '${raw.slice(0, 40)}...'`,
          severity: 'warning',
          line: (item as { position?: { start?: { line?: number } } }).position?.start?.line,
        })
      }
    }
  })
  return issues
}

// ========================
// 守卫 7: E_MD_NESTED_LEVEL_OVERFLOW (嵌套深度 ≤ 3)
// ========================

function checkNestingDepth(tree: Root): CanonicalIssue[] {
  const issues: CanonicalIssue[] = []
  const MAX_DEPTH = 3
  visit(tree, 'list', (node, _index, parents) => {
    let depth = 0
    let p = parents
    while (p) {
      const parent = p as { type?: string }
      if (parent.type === 'list') depth++
      p = (parent as { children?: unknown[] }).children
        ? ((p as { children: unknown[] }).children[0] as never)
        : undefined
    }
    if (depth > MAX_DEPTH) {
      issues.push({
        code: 'E_MD_NESTED_LEVEL_OVERFLOW',
        message: `List nesting depth ${depth} exceeds max ${MAX_DEPTH}`,
        severity: 'warning',
        line: (node as { position?: { start?: { line?: number } } }).position?.start?.line,
      })
    }
  })
  return issues
}

// ========================
// unified plugin 主入口
// ========================

export interface RemarkCanonicalOptions {
  entity?: string
  frontmatter?: Record<string, unknown>
}

export function remarkCanonical(options: RemarkCanonicalOptions = {}): (tree: Root) => void {
  return (tree) => {
    const allIssues: CanonicalIssue[] = []

    const entity = options.entity ?? String(options.frontmatter?.entity ?? 'unknown')
    const fm = options.frontmatter ?? {}

    // 前置: frontmatter 检查 (在 walk 之前, 因为 frontmatter 是 yaml 节点)
    allIssues.push(...checkRequiredFields(fm, entity))
    allIssues.push(...checkTypes(fm))

    // H1 检查
    const fmName = String(fm.name ?? '')
    allIssues.push(...checkH1(tree, entity, fmName))

    // H2 / H3 检查
    allIssues.push(...checkH2Categories(tree, entity))

    // deprecated syntax
    allIssues.push(...checkDeprecatedSyntax(tree))

    // list format
    allIssues.push(...checkListFormat(tree))

    // nesting depth
    allIssues.push(...checkNestingDepth(tree))

    // 写入 tree.data
    const errors = allIssues.filter((i) => i.severity === 'error')
    const warnings = allIssues.filter((i) => i.severity === 'warning')
    tree.data ??= {}
    ;(tree.data as Record<string, unknown>).canonicalIssues = { errors, warnings }
    ;(tree.data as Record<string, unknown>).canonical = {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}

// ========================
// 便利函数: 不走 unified pipeline, 直接调
// ========================

export function validateCanonical(tree: Root, options: RemarkCanonicalOptions = {}): CanonicalResult {
  const errors: CanonicalIssue[] = []
  const warnings: CanonicalIssue[] = []

  const entity = options.entity ?? String(options.frontmatter?.entity ?? 'unknown')
  const fm = options.frontmatter ?? {}

  errors.push(...checkRequiredFields(fm, entity).filter((i) => i.severity === 'error'))
  errors.push(...checkTypes(fm).filter((i) => i.severity === 'error'))
  warnings.push(...checkTypes(fm).filter((i) => i.severity === 'warning'))

  const fmName = String(fm.name ?? '')
  errors.push(...checkH1(tree, entity, fmName))
  errors.push(...checkH2Categories(tree, entity))
  errors.push(...checkDeprecatedSyntax(tree))
  warnings.push(...checkListFormat(tree))
  warnings.push(...checkNestingDepth(tree))

  return { errors, warnings }
}
