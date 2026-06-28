import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { URI } from 'langium'
import { createOxnParser } from './langium-driver/oxn-services'
import {
  isWorkDeclaration,
  isPartDeclaration,
  type PartDeclaration,
  type WorkDeclaration,
  type OXNDocument as OxnAstDocument,
} from './langium-driver/generated/ast'
import { parseMarkdown } from './md-pipeline/utils'
import { extractWorkIR } from './md-pipeline/transformers/work.js'
import { serializeWorkToOxn } from './md-pipeline/oxn-serializer.js'

export async function parseOxnFile(
  filePath: string,
): Promise<{ doc: OxnAstDocument; work: WorkDeclaration | null; parts: PartDeclaration[] }> {
  const parser = createOxnParser()
  const content = readFileSync(filePath, 'utf-8')
  const result = await parser.parse(content, URI.file(filePath))
  if (result.parseErrors.length > 0 || result.lexerErrors.length > 0) {
    throw new Error(`DSL parse failed: ${[...result.parseErrors, ...result.lexerErrors].join('; ')}`)
  }
  const doc = result.ast as OxnAstDocument
  const work = doc.entities.find(isWorkDeclaration) ?? null
  const parts = doc.entities.filter(isPartDeclaration)
  return { doc, work, parts }
}

async function validateWorkFromMd(filePath: string): Promise<{
  ok: boolean
  doc?: OxnAstDocument
  work?: WorkDeclaration
  parts?: PartDeclaration[]
  errors: string[]
}> {
  const content = readFileSync(filePath, 'utf-8')
  let ir: import('./md-pipeline/transformers/work').WorkIR
  try {
    const parsed = parseMarkdown(content)
    ir = extractWorkIR(parsed.tree, parsed.frontmatter)
  } catch (e) {
    return {
      ok: false,
      errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`],
    }
  }
  const oxnContent = serializeWorkToOxn(ir)
  const parser = createOxnParser()
  const r = await parser.parse(oxnContent, URI.file(`${filePath}.oxn`))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const doc = r.ast as OxnAstDocument
  const work = doc.entities.find(isWorkDeclaration) ?? null
  const parts = doc.entities.filter(isPartDeclaration)
  if (!work) {
    return { ok: false, doc, errors: ['no WorkDeclaration derived from md'] }
  }
  return { ok: true, doc, work, parts, errors: [] }
}

export async function validateWorkFile(filePath: string): Promise<{
  ok: boolean
  doc?: OxnAstDocument
  work?: WorkDeclaration
  parts?: PartDeclaration[]
  errors: string[]
}> {
  if (!existsSync(filePath)) {
    return { ok: false, errors: [`work file not found: ${filePath}`] }
  }
  if (filePath.endsWith('.md')) {
    return validateWorkFromMd(filePath)
  }
  try {
    const r = await parseOxnFile(filePath)
    if (!r.work) {
      return { ok: false, errors: ['no WorkDeclaration found in file'] }
    }
    return { ok: true, doc: r.doc, work: r.work, parts: r.parts, errors: [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [message] }
  }
}
