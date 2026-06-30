/**
 * SlotReferenceValidator (v0.1-final)
 *
 * 校验 Work 内的资源引用：
 *   1. domain/blueprint/part/probe 引用格式
 *   2. Task 内的 domain/blueprint 引用是否在 Work 声明中
 *   3. Task 内的 part 名是否在 Work 声明中
 */

import type { AstNode, ValidationAcceptor } from 'langium'
import type { OXNDocument, WorkDeclaration } from '../langium-driver/generated/ast.js'
import { isDomainDeclaration, isTaskDeclaration } from '../langium-driver/generated/ast.js'

function findDocument(node: AstNode): OXNDocument | undefined {
  let current: AstNode | undefined = node
  while (current) {
    const container = current.$container
    if (!container) return current as unknown as OXNDocument
    current = container as AstNode
  }
  return undefined
}

function getDomainNames(doc: OXNDocument): Set<string> {
  const names = new Set<string>()
  for (const entity of doc.entities) {
    if (isDomainDeclaration(entity)) {
      names.add(entity.name)
    }
  }
  return names
}

export function validateWorkTaskReference(
  node: WorkDeclaration,
  accept: ValidationAcceptor,
  ..._args: unknown[]
): void {
  const found = findDocument(node)
  if (!found) return

  const domainNames = getDomainNames(found)

  // 校验 Work 层 domain 引用
  for (const domainRef of node.domains ?? []) {
    if (domainNames.size > 0 && !domainNames.has(domainRef.name)) {
      accept(
        'warning',
        `domain "${domainRef.name}" has no Domain declaration in current document (cross-file refs validated at runtime)`,
        {
          node: domainRef,
          property: 'name',
        },
      )
    }
  }

  // 校验 Task 内的 domain/blueprint 引用
  const workDomainNames = new Set((node.domains ?? []).map((d) => d.name))
  const workBlueprintNames = new Set((node.blueprints ?? []).map((b) => b.name))
  const workPartNames = new Set((node.parts ?? []).map((p) => p.name))

  for (const task of (node.tasks ?? []).filter(isTaskDeclaration)) {
    // v0.3 follow-up: 任务内 domain/blueprint/parts 在 body[] 内任意顺序
    const taskBody = (task.body ?? []) as Array<{ $type: string; domain?: string; blueprint?: string; name?: string }>
    const taskDomain = taskBody.find((el) => el.$type === 'TaskDomainField')?.domain
    const taskBlueprint = taskBody.find((el) => el.$type === 'TaskBlueprintField')?.blueprint
    const taskParts = taskBody.filter((el) => el.$type === 'TaskPartDecl') as Array<{ name: string }>

    // 校验 task.domain 是否在 Work 域列表中
    if (taskDomain && workDomainNames.size > 0 && !workDomainNames.has(taskDomain)) {
      accept('warning', `task "${task.name}" references domain "${taskDomain}" not declared in Work`, {
        node: task,
        property: 'name',
      })
    }

    // 校验 task.blueprint 是否在 Work blueprint 列表中
    if (taskBlueprint && workBlueprintNames.size > 0 && !workBlueprintNames.has(taskBlueprint)) {
      accept('warning', `task "${task.name}" references blueprint "${taskBlueprint}" not declared in Work`, {
        node: task,
        property: 'name',
      })
    }

    // 校验 task.part 名是否在 Work part 列表中
    for (const part of taskParts) {
      if (workPartNames.size > 0 && !workPartNames.has(part.name)) {
        accept('warning', `task "${task.name}" part "${part.name}" not declared in Work`, {
          node: task,
          property: 'name',
        })
      }
    }
  }
}
