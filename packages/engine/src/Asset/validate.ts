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
import { resolveAssetDir } from '@openxenon/engine/infra/paths'
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
  const kinds: AssetKind[] = ['domain', 'blueprint', 'stack', 'roadmap', 'library', 'external']
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
  // 匹配 references = [...] (允许 [] 或 ["..."","..."])
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
