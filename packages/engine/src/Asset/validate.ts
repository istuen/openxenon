/**
 * Asset module — validate use case (v0.6 PR-5a)
 *
 * Validates a Domain / Blueprint / Stack asset file via Langium parser.
 */
import { readFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { URI } from 'langium'
import { IAPError, IAPAction } from '@openxenon/engine/errors'
import { createOxnParser, isDomainDeclaration } from '@openxenon/engine/oxl'
import { resolveAssetFile } from './internal/resolver'
import type { ValidateInput, ValidateResult } from './types'

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
