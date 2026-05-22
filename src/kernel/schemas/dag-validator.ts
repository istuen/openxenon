/**
 * DAG 拓扑校验器
 *
 * 验证 Blueprint 的 Stage 拓扑是否符合有向无环图 (DAG) 的要求：
 * 1. 所有 deps 引用的节点都存在于 stages 数组中
 * 2. 无环（有向无环图的必要条件）
 * 3. 恰好只有一个入口节点（deps 为空的节点）
 */

export interface DagNode {
  id: string
  deps: string[]
}

export interface DagValidationResult {
  valid: boolean
  errors: string[]
}

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

  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjList.set(node.id, [])
  }

  for (const node of nodes) {
    for (const dep of node.deps) {
      const adj = adjList.get(dep)
      if (!adj) {
        errors.push(`Stage '${node.id}' depends on non-existent stage '${dep}'`)
        continue
      }
      adj.push(node.id)
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1)
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  let visitedCount = 0
  while (queue.length > 0) {
    const current = queue.shift()!
    visitedCount++
    const neighbors = adjList.get(current)
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) queue.push(neighbor)
      }
    }
  }

  if (visitedCount !== nodes.length) {
    errors.push('DAG contains a cycle - topological sort failed')
    return { valid: false, errors }
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
  const result: string[] = []
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, node.deps.length)
    adjList.set(node.id, [])
  }

  for (const node of nodes) {
    for (const dep of node.deps) {
      const adj = adjList.get(dep)
      if (adj) adj.push(node.id)
    }
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    result.push(current)
    const neighbors = adjList.get(current)
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) queue.push(neighbor)
      }
    }
  }

  return result
}
