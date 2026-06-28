/**
 * Proof module — parse use case (v0.6 PR-5c续)
 *
 * Langium parser 驱动的 proof.oxn 文件解析
 */
import { readFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { URI } from 'langium'
import { createOxnParser, isProofDeclaration, type OXNDocument, type ProofDeclaration } from '@openxenon/engine/oxl'
import type { ParseProofResult } from './types'

export async function parseProofFile(filePath: string): Promise<ParseProofResult> {
  if (!existsSync(filePath)) {
    return { ok: false, errors: [`proof file not found: ${filePath}`] }
  }
  const content = readFileSync(filePath, 'utf-8')
  const parser = createOxnParser()
  const r = await parser.parse(content, URI.file(filePath))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e: unknown) => `[Parser] ${String(e)}`), ...r.lexerErrors.map((e: unknown) => `[Lexer] ${String(e)}`)],
    }
  }
  const ast = r.ast as OXNDocument
  const proof = ast.entities.find(isProofDeclaration)
  if (!proof) {
    return { ok: false, errors: ['no ProofDeclaration found in file'] }
  }
  return { ok: true, proof, errors: [] }
}
