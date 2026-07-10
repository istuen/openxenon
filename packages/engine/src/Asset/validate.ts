/**
 * Asset module — validate use case (v0.6 PR-5a)
 *
 * Validates a Domain / Blueprint / Stack asset file via Langium parser.
 * v0.6.1-alpha.1 (Asset 缺口全补 Phase 2): 集成 checkAssetDAG —
 * Asset-to-Asset references 自环 / 循环 / 孤儿校验。
 */
import { readFileSync, existsSync, readdirSync } from '@openxenon/engine/infra/filesystem'
import { URI } from 'langium'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { createOxnParser, isDomainDeclaration } from '@openxenon/engine/oxl'
import { resolveAssetFile } from './internal/resolver'
import { resolveAssetDir, ALL_ASSET_KINDS } from '@openxenon/engine/infra/paths'
import type { AssetKind } from '@openxenon/engine/infra/paths'
import type { ValidateInput, ValidateResult } from './types'
import { checkAssetDAG, type AssetNode, type DagValidationResult } from './dag-validator.js'

export async function validate(input: ValidateInput): Promise<ValidateResult> {
  const filePath = resolveAssetFile(input.projectRoot, input.kind, input.name)

  if (!existsSync(filePath)) {
    throw new IAPError('INFRA', 'KIND_UNSUPPORTED', IAPAction.YIELD_TO_HUMAN, `Asset file not found: ${filePath}`, {
      kind: input.kind,
      name: input.name,
      path: filePath,
    })
  }

  const content = readFileSync(filePath, 'utf-8')
  const parser = createOxnParser()
  const r = await parser.parse(content, URI.file(filePath))

  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [
        ...r.parseErrors.map((e: unknown) => `[Parser] ${String(e)}`),
        ...r.lexerErrors.map((e: unknown) => `[Lexer] ${String(e)}`),
      ],
    }
  }

  const ast = r.ast as { entities: unknown[] }
  const domain = ast.entities.find(isDomainDeclaration) ?? null
  if (!domain && input.kind === 'domain') {
    return { ok: false, errors: ['no DomainDeclaration found in file'] }
  }

  return { ok: true, errors: [], ast, domain }
}

/**
 * v0.6.1-alpha.1 (Asset 缺口全补 Phase 2)
 *
 * 校验项目内所有 Asset 的 references DAG（无环 + 无自环 + 无孤儿）
 *
 * 流程：
 * 1. 扫描 6 种 AssetKind 目录（domain / blueprint / stack / roadmap / library / external）
 * 2. regex 提取每个 .oxn 的 references[] 字段
 * 3. 调 checkAssetDAG 校验
 * 4. 返回结果（失败时不抛错，由调用方决定如何展示）
 *
 * 注：Roadmap 不含 references 字段（oxn.langium 注释锁定），自动跳过。
 *
 * @param projectRoot OXN 项目根目录（含 .openxenon/）
 * @returns DAG 校验结果
 */
export function validateAssetReferences(projectRoot: string): DagValidationResult {
  const kinds: readonly AssetKind[] = ALL_ASSET_KINDS
  const nodes: AssetNode[] = []

  for (const kind of kinds) {
    const dir = resolveAssetDir(projectRoot, kind, null)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.oxn'))
    for (const file of files) {
      const name = file.replace(/\.oxn$/, '')
      const filePath = `${dir}/${file}`
      const content = readFileSync(filePath, 'utf-8')
      const references = extractReferencesFromOxn(content)
      nodes.push({ kind, name, references })
    }
  }

  return checkAssetDAG(nodes)
}

/**
 * 从 .oxn 内容中提取 references[] 字段（regex）
 *
 * 支持 3 种语法形式：
 * - references = ["X", "Y"]
 * - references = ["X","Y"] (无空格)
 * - references = ["X"]
 *
 * 不解析 Langium AST（避免对 engine kernel 强依赖）
 */
function extractReferencesFromOxn(content: string): string[] {
  // 匹配 references = [...] (允许 [] 或 ["..."","...""])
  const match = content.match(/references\s*=\s*\[([^\]]*)\]/m)
  if (!match?.[1]) return []
  const inner = match[1].trim()
  if (!inner) return []
  // 提取 "..." 字符串字面量
  const refs: string[] = []
  const strRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g
  let m: RegExpExecArray | null
  while ((m = strRegex.exec(inner)) !== null) {
    if (m[1]) refs.push(m[1])
  }
  return refs
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
  const filePath = resolveAssetFile(projectRoot, kind, name, 'oxn')
  if (!existsSync(filePath)) {
    throw new IAPError('INFRA', 'PATH_CONFLICT', IAPAction.YIELD_TO_HUMAN, `Asset not found: ${filePath}`, {
      kind,
      name,
      path: filePath,
    })
  }

  const content = readFileSync(filePath, 'utf-8')

  // Extract 4 fields via regex
  const abstractMatch = content.match(/abstract\s*=\s*"((?:[^"\\]|\\.)*)"/m)
  const abstract = abstractMatch?.[1]?.replace(/\\"/g, '"')
  // references: 区分"未设置"与"显式 = []" — 搜 references\s*= 字段存在性
  const hasReferencesField = /references\s*=\s*\[/.test(content)
  const references = hasReferencesField ? extractReferencesFromOxn(content) : undefined
  const citationsMatch = content.match(/citations\s*=\s*(\d+)/m)
  const citations = citationsMatch?.[1] ? Number(citationsMatch[1]) : undefined
  // auditTrail 在 .oxn 通常是注释形式 `// auditTrail: ...` 或 frontmatter
  const auditTrailMatch = content.match(/\/\/\s*auditTrail\s*:\s*(.+)/m)
  const auditTrail = auditTrailMatch?.[1]?.trim()

  const fields: AssetPaper4Fields = { abstract, references, citations, auditTrail }

  const warnings: string[] = []
  if (!abstract) warnings.push(`abstract field missing (recommended: 1-line business boundary description)`)
  // Roadmap grammar intentionally omits references field (asset-compiler/oxn.langium:285)
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
