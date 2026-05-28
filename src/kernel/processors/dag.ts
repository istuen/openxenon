import type { GraphNode, GraphEdge } from './graph'

export interface TopologySortResult {
  valid: boolean
  path: string[]
  errors: string[]
}

export function topologicalSortGeneric(nodes: GraphNode[], edges?: GraphEdge[]): TopologySortResult {
  const nodeMap = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  const nodeIds = new Set(nodes.map((n) => n.id))

  for (const node of nodes) {
    nodeMap.set(node.id, [])
    inDegree.set(node.id, 0)
  }

  if (edges) {
    for (const edge of edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        continue
      }
      nodeMap.get(edge.from)?.push(edge.to)
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
    }
  } else {
    for (const node of nodes) {
      for (const dep of node.deps || []) {
        if (nodeIds.has(dep)) {
          nodeMap.get(dep)?.push(node.id)
          inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1)
        }
      }
    }
  }

  const errors: string[] = []
  for (const node of nodes) {
    for (const dep of node.deps || []) {
      if (!nodeIds.has(dep)) {
        errors.push(`Node '${node.id}' depends on non-existent node '${dep}'`)
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, path: [], errors }
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const path: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    path.push(current)
    const neighbors = nodeMap.get(current) || []
    for (const neighbor of neighbors) {
      const newDegree = inDegree.get(neighbor)! - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (path.length !== nodes.length) {
    return { valid: false, path: [], errors: ['DAG contains a cycle'] }
  }

  return { valid: true, path, errors: [] }
}