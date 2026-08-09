/**
 * Asset/dag-validator.ts — v0.6.1-alpha.1 (Asset 缺口全补 Phase 2)
 *
 * Asset-to-Asset references DAG 校验
 *
 * 角色：
 * - 接收 AssetNode[] 列表（每个含 kind/name/references）
 * - 构建引用图
 * - 检测：循环依赖 / 自环引用 / 孤儿引用（引用目标不存在）
 * - 集成到 Asset/validate.ts 调用链
 *
 * 关键不变量：
 * - 每个 reference target 必须存在（除非在 excludedKinds 内，如 builtin @oxn）
 * - 无自环：A 不能引用 A 自身
 * - 无循环：A → B → A 不允许（Kahn's algorithm）
 * - cycleHint 包含完整循环路径（错误消息用）
 *
 * 限制：
 * - 不解析资产语法（由调用方提供 parsed references[]）
 * - 不验证 reference 字符串格式（@prj/ / @oxn/ — 由 reference-checker.ts 负责）
 * - 不参与 Roadmap（Roadmap 不含 references 字段）
 *
 * L0–L3 兼容性：
 * - L1-Infra 层（src/engine/Asset/）
 * - 不 import L0-Processor / L2-Work / L3
 */

/**
 * Asset 节点（输入）
 *
 * 每个节点描述一个 Asset + 它引用的其他 Asset 名字列表。
 * reference target 字符串应当是裸 Asset name（不包含 scope prefix）。
 */
export interface AssetNode {
  /** Asset kind: 🆕 v0.6.1-alpha.2: domain / workflow / stack / blueprint (5 类型)
   *  🆕 v0.6.4: 'roadmap' → 'assetmap' */
  kind: 'domain' | 'workflow' | 'stack' | 'blueprint' | 'assetmap'
  /** Asset name（kebab-case / PascalCase） */
  name: string
  /** 引用目标 Asset name 列表（裸名） */
  references: string[]
}

/**
 * DAG 校验结果
 */
export interface DagValidationResult {
  /** 是否通过 */
  ok: boolean
  /** 循环路径列表（每个含完整 cycle: [A, B, C, A]） */
  cycles: Array<{ cycle: string[] }>
  /** 自环列表（A 引用 A 自身） */
  selfRefs: Array<{ name: string }>
  /** 孤儿引用列表（引用目标 Asset 不存在） */
  orphans: Array<{ name: string; missingRef: string }>
}

/**
 * 校验 Asset 引用 DAG
 *
 * 错误检测：
 * 1. 自环：A.references 含 A → selfRefs.push({name: A})
 * 2. 孤儿：A.references 含 X 但 X 不在 nodes → orphans.push({name: A, missingRef: X})
 * 3. 循环：A→B→A → cycles.push({cycle: [A, B, A]})（Kahn's algorithm）
 *
 * @example
 * ```ts
 * const result = checkAssetDAG([
 *   { kind: 'domain', name: 'A', references: ['B'] },
 *   { kind: 'domain', name: 'B', references: ['A'] },
 * ])
 * // { ok: false, cycles: [{ cycle: ['A', 'B', 'A'] }], ... }
 * ```
 */
export function checkAssetDAG(nodes: AssetNode[]): DagValidationResult {
  const result: DagValidationResult = {
    ok: true,
    cycles: [],
    selfRefs: [],
    orphans: [],
  }

  if (nodes.length === 0) {
    return result
  }

  // Build name → kind map for orphan detection
  const nodeMap = new Map<string, AssetNode>()
  for (const node of nodes) {
    const key = `${node.kind}::${node.name}`
    nodeMap.set(key, node)
  }

  // Build adjacency list: name -> Set<referencedName>
  // (we treat cross-kind references as same DAG, dedup by name within kind)
  const adj = new Map<string, Set<string>>()
  const allNames = new Set<string>()

  for (const node of nodes) {
    allNames.add(node.name)
    if (!adj.has(node.name)) {
      adj.set(node.name, new Set())
    }
    const refs = node.references ?? []
    for (const ref of refs) {
      if (!ref) continue
      allNames.add(ref)

      // Self-ref check
      if (ref === node.name) {
        result.selfRefs.push({ name: node.name })
        continue
      }

      // Orphan check (ref target not in any node)
      const refExists = Array.from(nodeMap.values()).some((n) => n.name === ref)
      if (!refExists) {
        result.orphans.push({ name: node.name, missingRef: ref })
        continue
      }

      // Add edge
      adj.get(node.name)!.add(ref)
    }
  }

  // Kahn's algorithm for cycle detection
  // in-degree computation
  const inDegree = new Map<string, number>()
  for (const name of allNames) {
    inDegree.set(name, 0)
  }
  for (const [, targets] of adj) {
    for (const t of targets) {
      inDegree.set(t, (inDegree.get(t) ?? 0) + 1)
    }
  }

  // BFS from in-degree 0
  const queue: string[] = []
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name)
  }

  const visited = new Set<string>()
  while (queue.length > 0) {
    const name = queue.shift()!
    if (visited.has(name)) continue
    visited.add(name)
    const targets = adj.get(name) ?? new Set()
    for (const t of targets) {
      const newDeg = (inDegree.get(t) ?? 0) - 1
      inDegree.set(t, newDeg)
      if (newDeg === 0) queue.push(t)
    }
  }

  // Remaining nodes with in-degree > 0 form cycles.
  // Each strongly connected component (SCC) of remaining nodes is one cycle
  // (or a graph with internal cycles). For simplicity we report each SCC as one cycle group.
  const cycleNodes = Array.from(inDegree.entries())
    .filter(([, deg]) => deg > 0)
    .map(([name]) => name)

  if (cycleNodes.length > 0) {
    // Group cycle nodes by SCC (Tarjan simplified — DFS with stack)
    const visited = new Set<string>()
    for (const start of cycleNodes) {
      if (visited.has(start)) continue
      const component: string[] = []
      const stack: Array<{ node: string; iter: Iterator<string> }> = []
      stack.push({ node: start, iter: (adj.get(start) ?? new Set<string>()).values() })
      visited.add(start)
      component.push(start)

      while (stack.length > 0) {
        const frame = stack[stack.length - 1]!
        const next = frame.iter.next()
        if (next.done) {
          stack.pop()
          continue
        }
        const target = next.value
        if (visited.has(target)) {
          // back-edge found, target is in component or stack
          continue
        }
        if (!cycleNodes.includes(target)) continue
        visited.add(target)
        component.push(target)
        stack.push({ node: target, iter: (adj.get(target) ?? new Set<string>()).values() })
      }

      if (component.length > 1) {
        // 多节点构成环
        component.push(component[0]!) // close hint
        result.cycles.push({ cycle: component })
      } else {
        // 单节点 in-degree > 0 意味着有自环（已被 selfRefs 捕获）
        // 或 in-degree > 0 但来自外部（不可能 — 已通过 in-degree 计算）
      }
    }
  }

  result.ok = result.cycles.length === 0 && result.selfRefs.length === 0 && result.orphans.length === 0
  return result
}
