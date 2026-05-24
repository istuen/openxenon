/**
 * OXN Validation Checks
 *
 * 注册 WorkBlueprintTypeValidator 和 SlotReferenceValidator 到 Langium 流水线
 *
 * 使用方式：
 *   import { registerOxnValidators } from './oxn-validation'
 *   registerOxnValidators(oxnServices)
 */

import type { LangiumCoreServices } from 'langium'
import type { ValidationChecks } from 'langium'
import type { OXNDSLAstType } from '../generated/ast.js'
import { validateWorkBlueprintType } from './work-type-validator.js'
import { validateSlotReference } from './slot-reference-validator.js'

export const OxnValidationChecks = {
  WorkDeclaration: [validateWorkBlueprintType, validateSlotReference],
} as const satisfies ValidationChecks<OXNDSLAstType>

export function registerOxnValidators(services: LangiumCoreServices): void {
  const registry = services.validation.ValidationRegistry
  registry.register(OxnValidationChecks)
}
