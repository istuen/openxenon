/**
 * TaskAlignValidator (v0.1-final)
 *
 * 校验 Work 内的 Task DAG 编排：
 *   1. task.deps 引用的 task 名必须存在
 *   2. task.deps 不能形成环（DAG 校验）
 */

import type { ValidationAcceptor } from 'langium'
import type { WorkDeclaration, TaskDeclaration } from '../langium-driver/generated/ast.js'
import { isTaskDeclaration, isTaskDepsField } from '../langium-driver/generated/ast.js'

function getTaskDeps(task: TaskDeclaration): string[] {
  if (isTaskDepsField(task) && task.deps) {
    return task.deps.deps ?? []
  }
  return []
}

function validateDag(tasks: TaskDeclaration[]): { hasCycle: boolean; cycleHint?: string } {
  const nameSet = new Set(tasks.map((t) => t.name))
  const adj = new Map<string, string[]>()

  for (const t of tasks) {
    adj.set(
      t.name,
      getTaskDeps(t).filter((d) => nameSet.has(d)),
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
  const tasks = (node.tasks || []).filter(isTaskDeclaration)
  if (tasks.length === 0) return

  // 校验 task name 唯一性
  const nameSet = new Set<string>()
  for (const t of tasks) {
    if (nameSet.has(t.name)) {
      accept('error', `task "${t.name}" declared twice`, { node: t, property: 'name' })
    }
    nameSet.add(t.name)
  }

  // 校验 task.deps 引用存在
  for (const t of tasks) {
    for (const dep of getTaskDeps(t)) {
      if (!nameSet.has(dep)) {
        accept('error', `task "${t.name}" references undeclared dep "${dep}"`, { node: t, property: 'name' as const })
      }
    }
  }

  // 校验 DAG 无环
  const dag = validateDag(tasks)
  if (dag.hasCycle) {
    accept('error', `task DAG has cycle: ${dag.cycleHint}`, { node, property: 'tasks' })
  }
}
