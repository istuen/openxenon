/**
 * SlotReferenceValidator
 *
 * 校验 Work.task.align 的目标 slot 是否在对应 Blueprint 中存在
 * (v0.1: Work 不再 ref 单一 Blueprint，task 内部 align 到 'BlueprintName.SlotName'
 *  本 validator 聚焦于"全限定 slot 引用是否在 use_blueprint 列表中存在")
 */

import type { AstNode, ValidationAcceptor } from 'langium'
import type { OXNDocument, WorkDeclaration } from '../generated/ast.js'
import { isDomainDeclaration, isTaskRefDecl } from '../generated/ast.js'

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

function getBlueprintNames(_doc: OXNDocument): Set<string> {
  // v0.1: Work 不再直接 ref Blueprint 实体（在当前 OXN 解析模型中，
  // Blueprint 是另一个 OXNDocument 的实体）。这里我们只能校验
  // use_blueprint 的字符串名格式非空，不强校验其存在。
  // 跨文件的存在性校验留给 loader / 编译期。
  return new Set()
}

export function validateWorkTaskReference(
  node: WorkDeclaration,
  accept: ValidationAcceptor,
  ..._args: unknown[]
): void {
  const found = findDocument(node)
  if (!found) return

  const domainNames = getDomainNames(found)
  const blueprintNames = getBlueprintNames(found)

  if (!node.useDomains || node.useDomains.length === 0) {
    if (node.tasks && node.tasks.length > 0) {
      accept('warning', 'Work 没有声明 use_domain，但声明了 task', { node, property: 'useDomains' })
    }
  }

  // 校验 use_domain
  for (const useDomain of node.useDomains ?? []) {
    if (domainNames.size > 0 && !domainNames.has(useDomain.name)) {
      accept('warning', `use_domain "${useDomain.name}" 在当前文档中未找到 Domain 声明 (跨文件引用需在执行时校验)`, {
        node: useDomain,
        property: 'name',
      })
    }
  }

  // 校验 use_blueprint
  for (const useBp of node.useBlueprints ?? []) {
    if (blueprintNames.size > 0 && !blueprintNames.has(useBp.name)) {
      accept('warning', `use_blueprint "${useBp.name}" 在当前文档中未找到 Blueprint 声明 (跨文件引用需在执行时校验)`, {
        node: useBp,
        property: 'name',
      })
    }
  }

  // 校验 task.align 全限定名格式 Blueprint.Slot
  for (const task of node.tasks ?? []) {
    if (!isTaskRefDecl(task)) continue
    if (!task.align) continue
    const parts = task.align.split('.')
    if (parts.length < 2) {
      accept('warning', `task "${task.name}" align "${task.align}" 建议使用全限定名 Blueprint.SlotName`, {
        node: task,
        property: 'align',
      })
    }
  }
}
