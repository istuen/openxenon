/**
 * Asset module — validate use case (v0.6 PR-5a)
 *
 * Validates a Domain / Blueprint / Stack asset file via md-native parser.
 * v0.6.1-alpha.1 (Asset 缺口全补 Phase 2): 集成 checkAssetDAG —
 * Asset-to-Asset references 自环 / 循环 / 孤儿校验。
 * v0.7.0: Only .md files supported (Langium removed).
 * v0.6.2-alpha.2 (I-3 hotfix): 派发 5-way EntityCompiler.validate() 真实校验
 *   (E_MD_H1_MISSING / E_MD_DUPLICATE_H3 / E_MD_CATEGORY_UNKNOWN / ...)
 */
import { readFileSync, existsSync, readdirSync } from '@openxenon/engine/infra/filesystem'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { resolveAssetFile } from './internal/resolver'
import { resolveAssetDir, ALL_ASSET_KINDS } from '@openxenon/engine/infra/paths'
import type { AssetKind } from '@openxenon/engine/infra/paths'
import type { ValidateInput, ValidateResult } from './types'
import { checkAssetDAG, type AssetNode, type DagValidationResult } from './dag-validator.js'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
// Asset validate() 派发 5-way EntityCompiler:
//   - getEntityCompiler 按 IntentEntityType 拿对应 compiler
//   - 通过 dynamic import 触发 5 个 compiler 注册, 避开 tsc 静态类型严格检查
//   - AssetKind (5 种) 是 IntentEntityType 的子集, 可直接传
//   - 注意: dynamic import 让 compiler 模块只在运行时加载, 不参与 typecheck
import type { getEntityCompiler as GetEntityCompilerFn } from '@openxenon/engine/oxl/md-bridge/entity-registry'

export async function validate(input: ValidateInput): Promise<ValidateResult> {
  const filePath = resolveAssetFile(input.projectRoot, input.kind, input.name)

  if (!existsSync(filePath)) {
    throw new IAPError('INFRA', 'KIND_UNSUPPORTED', IAPAction.YIELD_TO_HUMAN, `Asset file not found: ${filePath}`, {
      kind: input.kind,
      name: input.name,
      path: filePath,
    })
  }

  if (!filePath.endsWith('.md')) {
    return {
      ok: false,
      errors: [`Unsupported format: ${filePath}. Only .md files are supported in v0.7.0+.`],
    }
  }

  const content = readFileSync(filePath, 'utf-8')
  let parsed: ReturnType<typeof parseMarkdown>
  try {
    parsed = parseMarkdown(content)
  } catch (e) {
    return {
      ok: false,
      errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`],
    }
  }

  try {
    // Dynamic import 触发 5 个 compiler 注册 (side effect) + 拿 getEntityCompiler
    // 避开 tsc 对 compilers/index.js 的严格类型检查 (那些是 pre-existing 错误)
    const [{ getEntityCompiler }] = await Promise.all([
      import('@openxenon/engine/oxl/md-bridge/entity-registry') as Promise<{
        getEntityCompiler: typeof GetEntityCompilerFn
      }>,
      import('@openxenon/engine/oxl/md-bridge/compilers/index.js'),
    ])
    // 派发到对应 kind 的 EntityCompiler.validate() 真实校验
    const compiler = getEntityCompiler(input.kind)
    const validationErrors = compiler.validate({
      mdast: parsed.tree,
      frontmatter: parsed.frontmatter,
      filePath,
    })
    // 转 string[] (测试期望 errors[i] 含 E_MD_H1_MISSING / E_MD_DUPLICATE_H3 子串)
    // 仅 error severity 进 errors (warning 不阻断 ok)
    const errorStrings = validationErrors
      .filter((e) => e.severity === 'error')
      .map((e) => `${e.code}: ${e.message}${e.line ? ` (line ${e.line})` : ''}`)
    return {
      ok: errorStrings.length === 0,
      errors: errorStrings,
    }
  } catch (e) {
    return {
      ok: false,
      errors: [`compiler validate failed: ${e instanceof Error ? e.message : String(e)}`],
    }
  }
}

/**
 * v0.6.1-alpha.1 (Asset 缺口全补 Phase 2)
 *
 * 校验项目内所有 Asset 的 references DAG（无环 + 无自环 + 无孤儿）
 *
 * 流程：
 * 1. 扫描 5 种 AssetKind 目录（domain / workflow / stack / blueprint / roadmap）
 * 2. regex 提取每个 .md 的 references[] 字段
 * 3. 调 checkAssetDAG 校验
 * 4. 返回结果（失败时不抛错，由调用方决定如何展示）
 *
 * 注：Roadmap 不含 references 字段，自动跳过。
 *
 * @param projectRoot OXN 项目根目录（含 .openxenon/）
 * @returns DAG 校验结果
 */
export function validateAssetReferences(projectRoot: string): DagValidationResult {
  const kinds: readonly AssetKind[] = ALL_ASSET_KINDS
  const nodes: AssetNode[] = []
  const config = loadProjectConfig(projectRoot)

  for (const kind of kinds) {
    const dir = resolveAssetDir(projectRoot, kind, config)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const name = file.replace(/\.md$/, '')
      const filePath = `${dir}/${file}`
      const content = readFileSync(filePath, 'utf-8')
      const references = extractReferences(content)
      nodes.push({ kind, name, references })
    }
  }

  return checkAssetDAG(nodes)
}

/**
 * 从 Asset 内容中提取 references[] 字段（regex）
 *
 * 支持 3 种语法形式：
 * - references = ["X", "Y"]          （.oxn 语法，向后兼容）
 * - references = ["X","Y"]           （.oxn 语法，无空格，向后兼容）
 * - references = ["X"]               （.oxn 语法，向后兼容）
 * - - references: X                  （.md 列表项语法）
 * - - references: [X, Y]             （.md 列表项语法）
 *
 * 不解析 Langium AST（避免对 engine kernel 强依赖）
 */
function extractReferences(content: string): string[] {
  // .oxn 语法（向后兼容）: references = [...]
  const oxnMatch = content.match(/references\s*=\s*\[([^\]]*)\]/m)
  if (oxnMatch?.[1]) {
    const inner = oxnMatch[1].trim()
    if (!inner) return []
    const refs: string[] = []
    const strRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g
    let m: RegExpExecArray | null
    while ((m = strRegex.exec(inner)) !== null) {
      if (m[1]) refs.push(m[1])
    }
    return refs
  }

  // .md 语法: - references: X 或 - references: [X, Y]
  const mdMatch = content.match(/references:\s*(.+)/m)
  if (mdMatch?.[1]) {
    const value = mdMatch[1].trim()
    // Array format: [X, Y]
    const arrayMatch = value.match(/\[([^\]]*)\]/)
    if (arrayMatch?.[1]) {
      return arrayMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/"/g, ''))
        .filter(Boolean)
    }
    // Single value: X
    if (value && !value.startsWith('[')) {
      return [value.replace(/"/g, '')]
    }
  }

  return []
}

// =============================================================================
// v0.6.1-alpha.1 Asset Lifecycle: AssetPaper 4 字段强校验
// =============================================================================

export interface AssetPaper4Fields {
  abstract: string | undefined
  references: string[] | undefined
  citations: number | undefined
  /** auditTrail 可能不在所有 Asset 存在（roadmap 除外） */
  auditTrail: string | undefined
}

export interface AssetPaperValidationResult {
  ok: boolean
  /** 缺失字段警告（fail-open 模式：仅 warn 不阻断） */
  warnings: string[]
  /** 4 字段实际值（debug 用） */
  fields: AssetPaper4Fields
}

/**
 * 校验 Asset 的 4 字段（abstract / references / citations / auditTrail）
 *
 * 设计哲学：fail-open（默认） — 仅 warn 不阻断，允许存量资产渐进修复
 *              fail-closed (strict=true) — 缺失任何字段 → IAPError
 *
 * 字段提取用 regex（避免 Langium kernel 强依赖）：
 * - abstract = "..."
 * - references = ["..."] (允许空数组)
 * - citations = N
 * - // auditTrail: ... (注释形式)
 *
 * @param projectRoot OXN 项目根目录
 * @param kind AssetKind
 * @param name Asset name
 * @param strict true = 缺失任意字段 → IAPError; false = 仅警告
 * @returns 校验结果
 */
export async function validateAssetPaper4Fields(
  projectRoot: string,
  kind: AssetKind,
  name: string,
  strict: boolean = false,
): Promise<AssetPaperValidationResult> {
  const filePath = resolveAssetFile(projectRoot, kind, name)
  if (!existsSync(filePath)) {
    throw new IAPError('INFRA', 'PATH_CONFLICT', IAPAction.YIELD_TO_HUMAN, `Asset not found: ${filePath}`, {
      kind,
      name,
      path: filePath,
    })
  }

  const content = readFileSync(filePath, 'utf-8')

  // Extract 4 fields via regex (support .md format with .oxn backward compat)
  // abstract: .md frontmatter: abstract: ...  /  .oxn legacy: abstract = "..."
  const abstractMatch = content.match(/abstract\s*[=:]\s*"((?:[^"\\]|\\.)*)"/m)
  const abstract = abstractMatch?.[1]?.replace(/\\"/g, '"')
  // references: 区分"未设置"与"显式 = []" — 搜 references\s*= 或 references: 字段存在性
  const hasReferencesField = /references\s*[=:]/m.test(content)
  const references = hasReferencesField ? extractReferences(content) : undefined
  // .oxn legacy: citations = N  /  .md frontmatter: citations: N
  const citationsMatch = content.match(/citations\s*[=:]\s*(\d+)/m)
  const citations = citationsMatch?.[1] ? Number(citationsMatch[1]) : undefined
  // auditTrail: .md frontmatter `auditTrail: ...`
  const auditTrailMatch = content.match(/(?:\/\/\s*|^\s*)auditTrail\s*:\s*(.+)/m)
  const auditTrail = auditTrailMatch?.[1]?.trim()

  const fields: AssetPaper4Fields = { abstract, references, citations, auditTrail }

  const warnings: string[] = []
  if (!abstract) warnings.push(`abstract field missing (recommended: 1-line business boundary description)`)
  // Roadmap intentionally omits references field
  // Roadmap's "navigation" role is fulfilled by its own links[] (per grammar comment 2026-07-08).
  if (references === undefined && kind !== 'roadmap')
    warnings.push(`references field missing (use references = ["X", "Y"] or references = [])`)
  if (citations === undefined && kind !== 'roadmap')
    warnings.push(`citations field missing (set initial value, e.g. citations = 0)`)
  if (!auditTrail && kind !== 'roadmap')
    warnings.push(`auditTrail comment missing (add // auditTrail: created by <name> at <time>)`)

  const ok = warnings.length === 0

  if (strict && warnings.length > 0) {
    throw new IAPError(
      'INTENT',
      'INCOMPLETE_ASSET_PAPER',
      IAPAction.YIELD_TO_HUMAN,
      `Asset '${name}' (${kind}) has ${warnings.length} missing Asset Paper 4 fields: ${warnings.join('; ')}`,
      { kind, name, missingFields: warnings },
    )
  }

  return { ok, warnings, fields }
}
