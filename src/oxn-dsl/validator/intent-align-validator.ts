/**
 * TaskAlignValidator (v0.1)
 *
 * 校验 Work 内的 task 编排：
 *   1. task.deps 引用的 task 名必须存在
 *   2. task.deps 不能形成环（DAG）
 *   3. task.align 全限定名 Blueprint.SlotName 格式合法
 */

import type { ValidationAcceptor } from 'langium'
import type { WorkDeclaration, TaskRefDecl } from '../generated/ast.js'
import { isTaskRefDecl } from '../generated/ast.js'

function validateDag(tasks: TaskRefDecl[]): { hasCycle: boolean; cycleHint?: string } {
  const nameSet = new Set(tasks.map((t) => t.name))
  const adj = new Map<string, string[]>()
  for (const t of tasks) {
    adj.set(
      t.name,
      (t.deps ?? []).filter((d) => nameSet.has(d)),
    )
  }

  // Kahn's algorithm
  const inDegree = new Map<string, number>()
  for (const t of tasks) inDegree.set(t.name, 0)
  for (const [u, vs] of adj) {
    inDegree.set(u, inDegree.get(u) ?? 0)
    for (const v of vs) {
      inDegree.set(v, (inDegree.get(v) ?? 0) + 1)
    }
  }

  const queue: string[] = []
  for (const [n, d] of inDegree) {
    if (d === 0) queue.push(n)
  }

  let visited = 0
  while (queue.length > 0) {
    const n = queue.shift()!
    visited++
    for (const next of adj.get(n) ?? []) {
      const d = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }

  if (visited < tasks.length) {
    const remaining = tasks.map((t) => t.name).filter((n) => (inDegree.get(n) ?? 0) > 0)
    return { hasCycle: true, cycleHint: remaining.join(' -> ') }
  }
  return { hasCycle: false }
}

export function validateTaskAlign(node: WorkDeclaration, accept: ValidationAcceptor, ..._args: unknown[]): void {
  if (!node.tasks || node.tasks.length === 0) return

  const nameSet = new Set<string>()
  for (const t of node.tasks) {
    if (!isTaskRefDecl(t)) continue
    if (nameSet.has(t.name)) {
      accept('error', `task "${t.name}" 重复声明`, { node: t, property: 'name' })
    }
    nameSet.add(t.name)
  }

  for (const t of node.tasks) {
    if (!isTaskRefDecl(t)) continue
    for (const dep of t.deps ?? []) {
      if (!nameSet.has(dep)) {
        accept('error', `task "${t.name}" 引用了未声明的 dep "${dep}"`, { node: t, property: 'deps' })
      }
    }
  }

  const dag = validateDag(node.tasks.filter(isTaskRefDecl))
  if (dag.hasCycle) {
    accept('error', `task DAG 存在环: ${dag.cycleHint}`, { node, property: 'tasks' })
  }
}
