/**
 * SlotReferenceValidator
 *
 * 校验 Work 中引用的 slot 名称必须在 Blueprint 的 partSlots 中存在
 */

import type { AstNode, ValidationAcceptor } from 'langium'
import type { OXNDocument, WorkDeclaration, BlueprintDeclaration } from '../generated/ast.js'
import { isSlotBinding, isBlueprintDeclaration } from '../generated/ast.js'

function findBlueprint(node: WorkDeclaration): BlueprintDeclaration | undefined {
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

function getSlotNames(blueprint: BlueprintDeclaration): Set<string> {
  const names = new Set<string>()
  if (!blueprint.partSlots) return names

  for (const slot of blueprint.partSlots) {
    if (slot.name) {
      names.add(slot.name)
    }
  }
  return names
}

export function validateSlotReference(node: WorkDeclaration, accept: ValidationAcceptor, ..._args: unknown[]): void {
  const blueprint = findBlueprint(node)
  if (!blueprint) return

  const validSlotNames = getSlotNames(blueprint)
  if (validSlotNames.size === 0) return

  if (!node.slotBindings || node.slotBindings.length === 0) return

  for (const binding of node.slotBindings) {
    if (!isSlotBinding(binding)) continue
    if (!binding.align) continue

    if (!validSlotNames.has(binding.align)) {
      accept('error', `Slot "${binding.align}" 在 Blueprint "${blueprint.name}" 中未定义`, {
        node: binding,
        property: 'align',
      })
    }
  }
}
