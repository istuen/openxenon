/**
 * Kernel 纯处理器
 *
 * 提供通用逻辑运算，不含任何 OpenXenon 领域概念。
 * L0 Kernel 公理：零 I/O、零领域语义、仅纯数学/逻辑运算。
 */

export type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'regex' | 'contains'

export interface PredicateResult {
  passed: boolean
  message: string
}

export interface GraphNode {
  id: string
  deps?: string[]
}

export interface GraphEdge {
  from: string
  to: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface TransformRule {
  from: string
  to: string
}

export interface TransformMapping {
  rules: TransformRule[]
  defaultValue?: unknown
}

export function evaluatePredicate(expected: unknown, actual: unknown, operator: Operator): PredicateResult {
  switch (operator) {
    case 'eq':
      return {
        passed: actual === expected,
        message: actual === expected ? 'Equal' : `Not equal: ${actual} !== ${expected}`,
      }

    case 'neq':
      return {
        passed: actual !== expected,
        message: actual !== expected ? 'Not equal (expected different)' : `Equal: ${actual} === ${expected}`,
      }

    case 'gt':
      return { passed: Number(actual) > Number(expected), message: `Expected ${actual} > ${expected}` }

    case 'gte':
      return { passed: Number(actual) >= Number(expected), message: `Expected ${actual} >= ${expected}` }

    case 'lt':
      return { passed: Number(actual) < Number(expected), message: `Expected ${actual} < ${expected}` }

    case 'lte':
      return { passed: Number(actual) <= Number(expected), message: `Expected ${actual} <= ${expected}` }

    case 'regex': {
      if (typeof expected !== 'string' || typeof actual !== 'string') {
        return { passed: false, message: 'Regex operator requires string operands' }
      }
      try {
        const match = new RegExp(expected).test(actual)
        return { passed: match, message: match ? 'Pattern matched' : `Pattern "${expected}" did not match "${actual}"` }
      } catch {
        return { passed: false, message: `Invalid regex pattern: ${expected}` }
      }
    }

    case 'contains':
      if (typeof actual !== 'string' || typeof expected !== 'string') {
        return { passed: false, message: 'Contains operator requires string operands' }
      }
      return {
        passed: actual.includes(expected),
        message: actual.includes(expected) ? 'Contains' : ` "${actual}" does not contain "${expected}"`,
      }

    default:
      return { passed: false, message: `Unknown operator: ${operator}` }
  }
}

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
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (path.length !== nodes.length) {
    return { valid: false, path: [], errors: ['DAG contains a cycle'] }
  }

  return { valid: true, path, errors: [] }
}

export function validateSchemaGeneric(shape: Record<string, unknown>, actual: unknown): ValidationResult {
  if (typeof shape !== 'object' || shape === null) {
    return { valid: true }
  }

  if (typeof actual !== 'object' || actual === null) {
    return { valid: false, error: 'Type mismatch: expected object' }
  }

  const shapeObj = shape as Record<string, unknown>
  const actualObj = actual as Record<string, unknown>

  if (shapeObj.type !== undefined) {
    const expectedType = shapeObj.type as string
    const actualType = Array.isArray(actual) ? 'array' : typeof actual
    if (expectedType !== actualType) {
      return { valid: false, error: `Type mismatch: expected ${expectedType}, got ${actualType}` }
    }
  }

  if (shapeObj.required !== undefined && Array.isArray(shapeObj.required)) {
    for (const key of shapeObj.required as string[]) {
      if (!(key in actualObj)) {
        return { valid: false, error: `Missing required property: ${key}` }
      }
    }
  }

  if (shapeObj.properties !== undefined && typeof shapeObj.properties === 'object') {
    const props = shapeObj.properties as Record<string, unknown>
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in actualObj) {
        const propResult = validateSchemaGeneric(propSchema as Record<string, unknown>, actualObj[key])
        if (!propResult.valid) {
          return propResult
        }
      }
    }
  }

  return { valid: true }
}

export function transformData(source: Record<string, unknown>, mapping: TransformMapping): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const rule of mapping.rules) {
    const value = source[rule.from]
    result[rule.to] = value !== undefined ? value : mapping.defaultValue
  }

  return result
}
