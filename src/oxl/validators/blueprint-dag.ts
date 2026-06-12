import type { DagNode, DagValidationResult } from '../../kernel/index'
import { topologicalSortGeneric } from '../../kernel/index'

export type { DagNode, DagValidationResult }

export function validateDagTopology(nodes: DagNode[]): DagValidationResult {
  const errors: string[] = []
  const nodeIds = new Set(nodes.map((n) => n.id))

  for (const node of nodes) {
    for (const dep of node.deps) {
      if (!nodeIds.has(dep)) {
        errors.push(`Stage '${node.id}' depends on non-existent stage '${dep}'`)
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const graphNodes = nodes.map((n) => ({ id: n.id, deps: n.deps }))
  const result = topologicalSortGeneric(graphNodes)

  if (!result.valid) {
    return { valid: false, errors: ['DAG contains a cycle - topological sort failed'] }
  }

  const entryNodes = nodes.filter((n) => n.deps.length === 0)
  if (entryNodes.length === 0) {
    errors.push('DAG has no entry node (at least one stage must have no dependencies)')
  } else if (entryNodes.length > 1) {
    errors.push(`DAG has multiple entry nodes: ${entryNodes.map((n) => n.id).join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function topologicalSort(nodes: DagNode[]): string[] {
  const graphNodes = nodes.map((n) => ({ id: n.id, deps: n.deps }))
  const result = topologicalSortGeneric(graphNodes)
  return result.path
}
