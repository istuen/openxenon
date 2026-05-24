/**
 * WorkBlueprintTypeValidator
 *
 * 校验 Work.type 与 Blueprint.type 必须 1:1 匹配
 */

import type { AstNode, ValidationAcceptor } from 'langium'
import type { OXNDocument, WorkDeclaration, BlueprintDeclaration } from '../generated/ast.js'
import { isBlueprintDeclaration } from '../generated/ast.js'

function findReferencedBlueprint(node: WorkDeclaration): BlueprintDeclaration | undefined {
  let current: AstNode | undefined = node
  while (current) {
    const container = current.$container
    if (!container) break

    if (isBlueprintDeclaration(container)) {
      return container
    }

    const doc = container as unknown as OXNDocument
    if (doc?.entities) {
      for (const entity of doc.entities) {
        if (isBlueprintDeclaration(entity)) {
          return entity
        }
      }
    }

    current = container as AstNode
  }

  return undefined
}

export function validateWorkBlueprintType(
  node: WorkDeclaration,
  accept: ValidationAcceptor,
  ..._args: unknown[]
): void {
  if (!node.ref) return

  const workType = node.type
  if (!workType) return

  const blueprint = findReferencedBlueprint(node)
  if (!blueprint) return

  const blueprintType = blueprint.type
  if (!blueprintType) return

  if (workType !== blueprintType) {
    accept('error', `Work type "${workType}" 与 Blueprint type "${blueprintType}" 不匹配`, { node, property: 'type' })
  }
}
