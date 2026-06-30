import { describe, expect, it } from 'bun:test'
import { topologicalSortGeneric } from '@openxenon/engine/kernel/processors/dag'
import type { GraphNode, GraphEdge } from '@openxenon/engine/kernel/processors/graph'

describe('topologicalSortGeneric', () => {
  describe('正常路径', () => {
    it('空图返回空路径', () => {
      const result = topologicalSortGeneric([])
      expect(result.valid).toBe(true)
      expect(result.path).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('单节点无依赖返回 [nodeId]', () => {
      const nodes: GraphNode[] = [{ id: 'A' }]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(true)
      expect(result.path).toEqual(['A'])
    })

    it('线性依赖链 A→B→C 返回正确拓扑序', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: [] },
        { id: 'B', deps: ['A'] },
        { id: 'C', deps: ['B'] },
      ]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(true)
      expect(result.path).toEqual(['A', 'B', 'C'])
    })

    it('并行分支 A→B, A→C 返回合法拓扑序', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: [] },
        { id: 'B', deps: ['A'] },
        { id: 'C', deps: ['A'] },
      ]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(true)
      expect(result.path).toContain('A')
      expect(result.path.indexOf('B')).toBeGreaterThan(result.path.indexOf('A'))
      expect(result.path.indexOf('C')).toBeGreaterThan(result.path.indexOf('A'))
    })

    it('复杂 DAG 返回合法拓扑序', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: [] },
        { id: 'B', deps: ['A'] },
        { id: 'C', deps: ['A'] },
        { id: 'D', deps: ['B', 'C'] },
      ]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(true)
      expect(result.path.indexOf('A')).toBeLessThan(result.path.indexOf('B'))
      expect(result.path.indexOf('A')).toBeLessThan(result.path.indexOf('C'))
      expect(result.path.indexOf('B')).toBeLessThan(result.path.indexOf('D'))
      expect(result.path.indexOf('C')).toBeLessThan(result.path.indexOf('D'))
    })

    it('使用 edges 参数代替 deps 时正确计算', () => {
      const nodes: GraphNode[] = [{ id: 'A' }, { id: 'B' }]
      const edges: GraphEdge[] = [{ from: 'A', to: 'B' }]
      const result = topologicalSortGeneric(nodes, edges)
      expect(result.valid).toBe(true)
      expect(result.path).toEqual(['A', 'B'])
    })

    it('edges 参数中 from/to 不在节点列表中时返回 valid=false, errors 含 non-existent (v1.1 dag-edges-validation)', () => {
      const nodes: GraphNode[] = [{ id: 'A' }, { id: 'B' }]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B' },
        { from: 'X', to: 'Y' },
      ]
      const result = topologicalSortGeneric(nodes, edges)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.join(' ')).toContain('non-existent')
    })
  })

  describe('异常路径', () => {
    it('检测环 A→B→C→A 返回 valid=false', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: ['C'] },
        { id: 'B', deps: ['A'] },
        { id: 'C', deps: ['B'] },
      ]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('DAG contains a cycle')
    })

    it('自环 A→A 被检测为环', () => {
      const nodes: GraphNode[] = [{ id: 'A' }]
      const edges: GraphEdge[] = [{ from: 'A', to: 'A' }]
      const result = topologicalSortGeneric(nodes, edges)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('DAG contains a cycle')
    })

    it('两个节点互相依赖 A→B, B→A 返回 valid=false', () => {
      const nodes: GraphNode[] = [{ id: 'A' }, { id: 'B' }]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'A' },
      ]
      const result = topologicalSortGeneric(nodes, edges)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('DAG contains a cycle')
    })

    it('依赖不存在的节点返回 valid=false, errors 含 non-existent', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: [] },
        { id: 'B', deps: ['C'] },
      ]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('non-existent')
    })

    it('edges 中只有 from 引用不存在节点 (v1.1 dag-edges-validation)', () => {
      const nodes: GraphNode[] = [{ id: 'A' }, { id: 'B' }]
      const edges: GraphEdge[] = [{ from: 'X', to: 'A' }]
      const result = topologicalSortGeneric(nodes, edges)
      expect(result.valid).toBe(false)
      expect(result.errors.join(' ')).toContain("Edge from 'X'")
    })

    it('edges 中只有 to 引用不存在节点 (v1.1 dag-edges-validation)', () => {
      const nodes: GraphNode[] = [{ id: 'A' }]
      const edges: GraphEdge[] = [{ from: 'A', to: 'Z' }]
      const result = topologicalSortGeneric(nodes, edges)
      expect(result.valid).toBe(false)
      expect(result.errors.join(' ')).toContain("Edge to 'Z'")
    })
  })

  describe('边界条件', () => {
    it('deps 为 undefined 时视为无依赖', () => {
      const nodes: GraphNode[] = [{ id: 'A' }, { id: 'B', deps: ['A'] }]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(true)
      expect(result.path).toEqual(['A', 'B'])
    })

    it('deps 为空数组时视为无依赖', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: [] },
        { id: 'B', deps: ['A'] },
      ]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(true)
      expect(result.path).toEqual(['A', 'B'])
    })

    it('同时提供 edges 和 deps 时，edges 优先', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: ['B'] },
        { id: 'B', deps: [] },
      ]
      const edges: GraphEdge[] = [{ from: 'B', to: 'A' }]
      const result = topologicalSortGeneric(nodes, edges)
      expect(result.valid).toBe(true)
      expect(result.path).toEqual(['B', 'A'])
    })

    it('多入口节点都能出现在路径前部', () => {
      const nodes: GraphNode[] = [
        { id: 'A', deps: [] },
        { id: 'B', deps: [] },
        { id: 'C', deps: ['A', 'B'] },
      ]
      const result = topologicalSortGeneric(nodes)
      expect(result.valid).toBe(true)
      expect(result.path[0]).toBeOneOf(['A', 'B'])
      expect(result.path[1]).toBeOneOf(['A', 'B'])
      expect(result.path[2]).toBe('C')
    })
  })
})
