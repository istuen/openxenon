/**
 * SlotReferenceValidator (v0.1-final)
 *
 * 校验 Work 内的资源引用：
 *   1. domain/blueprint/part/probe 引用格式
 *   2. Task 内的 domain/blueprint 引用是否在 Work 声明中
 *   3. Task 内的 part 名是否在 Work 声明中
 */

import type { AstNode, ValidationAcceptor } from 'langium'
import type { OXNDocument, WorkDeclaration } from '../generated/ast.js'
import { isDomainDeclaration, isTaskDeclaration } from '../generated/ast.js'

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
      accept('warning', `domain "${domainRef.name}" 在当前文档中未找到 Domain 声明 (跨文件引用需在执行时校验)`, {
        node: domainRef,
        property: 'name',
      })
    }
  }

  // 校验 Task 内的 domain/blueprint 引用
  const workDomainNames = new Set((node.domains ?? []).map((d) => d.name))
  const workBlueprintNames = new Set((node.blueprints ?? []).map((b) => b.name))
  const workPartNames = new Set((node.parts ?? []).map((p) => p.name))

  for (const task of (node.tasks ?? []).filter(isTaskDeclaration)) {
    // 校验 task.domain 是否在 Work 域列表中
    if (task.domain && workDomainNames.size > 0 && !workDomainNames.has(task.domain)) {
      accept('warning', `task "${task.name}" 引用的 domain "${task.domain}" 未在 Work 中声明`, {
        node: task,
        property: 'domain',
      })
    }

    // 校验 task.blueprint 是否在 Work blueprint 列表中
    if (task.blueprint && workBlueprintNames.size > 0 && !workBlueprintNames.has(task.blueprint)) {
      accept('warning', `task "${task.name}" 引用的 blueprint "${task.blueprint}" 未在 Work 中声明`, {
        node: task,
        property: 'blueprint',
      })
    }

    // 校验 task.part 名是否在 Work part 列表中
    for (const part of task.parts ?? []) {
      if (workPartNames.size > 0 && !workPartNames.has(part.name)) {
        accept('warning', `task "${task.name}" 的 part "${part.name}" 未在 Work 中声明`, {
          node: part,
          property: 'name',
        })
      }
    }
  }
}
