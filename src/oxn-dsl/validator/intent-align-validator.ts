/**
 * IntentAlignValidator
 *
 * 校验 Intent-Align 语义的正确性：
 * 1. Work 中 SlotBinding.align 必须匹配 Blueprint 中 PartSlot.name (即 Intent 类型)
 * 2. Work 中 ProbeBinding.align 必须匹配 Blueprint 中 PartSlot.observe 中声明的 observe 名
 */

import type { AstNode, ValidationAcceptor } from 'langium'
import type { OXNDocument, WorkDeclaration, BlueprintDeclaration, PartSlotDeclaration } from '../generated/ast.js'
import { isBlueprintDeclaration, isSlotBinding, isProbeBinding } from '../generated/ast.js'

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

function getSlotMap(blueprint: BlueprintDeclaration): Map<string, PartSlotDeclaration> {
  const map = new Map<string, PartSlotDeclaration>()
  if (!blueprint.partSlots) return map

  for (const slot of blueprint.partSlots) {
    if (slot.name) {
      map.set(slot.name, slot)
    }
  }
  return map
}

function getObserveNames(slot: PartSlotDeclaration): Set<string> {
  const names = new Set<string>()
  if (!slot.observe) return names

  for (const obs of slot.observe) {
    if (obs.observes) {
      for (const name of obs.observes) {
        names.add(name)
      }
    }
  }
  return names
}

export function validateIntentAlign(node: WorkDeclaration, accept: ValidationAcceptor, ..._args: unknown[]): void {
  const blueprint = findBlueprint(node)
  if (!blueprint) return

  const slotMap = getSlotMap(blueprint)
  if (slotMap.size === 0) return

  if (!node.slotBindings || node.slotBindings.length === 0) return

  for (const binding of node.slotBindings) {
    if (!isSlotBinding(binding)) continue
    if (!binding.align) continue

    const slot = slotMap.get(binding.align)
    if (!slot) {
      accept('error', `Slot "${binding.align}" 在 Blueprint "${blueprint.name}" 中未定义`, {
        node: binding,
        property: 'align',
      })
      continue
    }

    if (binding.probeBindings && binding.probeBindings.length > 0) {
      const observeNames = getObserveNames(slot)

      if (observeNames.size === 0) {
        accept('warning', `Slot "${binding.align}" 没有声明 observe，但 Work 中绑定了 probe`, {
          node: binding,
          property: 'align',
        })
      }

      for (const probeBinding of binding.probeBindings) {
        if (!isProbeBinding(probeBinding)) continue
        if (!probeBinding.align) continue

        if (!observeNames.has(probeBinding.align)) {
          const availableObserves = Array.from(observeNames).join(', ') || '无'
          accept(
            'error',
            `Probe align "${probeBinding.align}" 不在 Slot "${binding.align}" 的 observe 声明中 (可用: ${availableObserves})`,
            {
              node: probeBinding,
              property: 'align',
            },
          )
        }
      }
    }
  }
}
