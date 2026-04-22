import { describe, expect, test } from 'bun:test'
import { validateDagTopology, topologicalSort, type DagNode } from '../../src/core/dag.validator'

describe('DAG Validator', () => {
  describe('validateDagTopology', () => {
    test('valid DAG with single node', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: [] }
      ]
      const result = validateDagTopology(nodes)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('valid DAG with multiple nodes', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: [] },
        { id: 'b', deps: ['a'] },
        { id: 'c', deps: ['a', 'b'] }
      ]
      const result = validateDagTopology(nodes)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('invalid DAG with cycle', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: ['c'] },
        { id: 'b', deps: ['a'] },
        { id: 'c', deps: ['b'] }
      ]
      const result = validateDagTopology(nodes)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('DAG contains a cycle - topological sort failed')
    })

    test('invalid DAG with missing dependency', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: [] },
        { id: 'b', deps: ['nonexistent'] }
      ]
      const result = validateDagTopology(nodes)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Stage 'b' depends on non-existent stage 'nonexistent'")
    })

    test('invalid DAG with multiple entry nodes', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: [] },
        { id: 'b', deps: [] },
        { id: 'c', deps: ['a', 'b'] }
      ]
      const result = validateDagTopology(nodes)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('multiple entry nodes')
    })

    test('invalid DAG with no entry node', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: ['b'] },
        { id: 'b', deps: ['a'] }
      ]
      const result = validateDagTopology(nodes)
      expect(result.valid).toBe(false)
    })
  })

  describe('topologicalSort', () => {
    test('sorts nodes in correct order', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: [] },
        { id: 'b', deps: ['a'] },
        { id: 'c', deps: ['b'] }
      ]
      const sorted = topologicalSort(nodes)
      expect(sorted).toEqual(['a', 'b', 'c'])
    })

    test('handles diamond dependency', () => {
      const nodes: DagNode[] = [
        { id: 'a', deps: [] },
        { id: 'b', deps: ['a'] },
        { id: 'c', deps: ['a'] },
        { id: 'd', deps: ['b', 'c'] }
      ]
      const sorted = topologicalSort(nodes)
      expect(sorted[0]).toBe('a')
      expect(sorted[sorted.length - 1]).toBe('d')
    })
  })
})
