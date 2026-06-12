/**
 * OXN Validation Checks
 *
 * 注册 WorkDeclaration / DomainDeclaration 的 validator 到 Langium 流水线
 *
 * 使用方式：
 *   import { registerOxnValidators } from './oxn-validation'
 *   registerOxnValidators(oxnServices)
 */

import type { LangiumCoreServices } from 'langium'
import type { ValidationChecks } from 'langium'
import type { OpenXenonLanguageAstType } from '../generated/ast.js'
import { validateWorkTaskReference } from './slot-reference-validator.js'
import { validateTaskAlign } from './intent-align-validator.js'

export const OxnValidationChecks = {
  WorkDeclaration: [validateWorkTaskReference, validateTaskAlign],
} as const satisfies ValidationChecks<OpenXenonLanguageAstType>

export function registerOxnValidators(services: LangiumCoreServices): void {
  const registry = services.validation.ValidationRegistry
  registry.register(OxnValidationChecks)
}
