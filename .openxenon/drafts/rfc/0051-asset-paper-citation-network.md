# ADR-0051: Asset-as-Paper 论文结构 + 引用计数 + DAG

> **来源**：v0.6.3 Asset Paper Schema RFC §1.1, §1.3
> **抽取日**：2026-07-05
> **状态**：Adopted
> **影响层**：L1-Infra（Asset IO）+ L2-Engine（引用计数 + DAG 校验）

## 决策

Asset schema 扩展论文结构字段：
- `abstract` — Asset 的 Intent 摘要
- `references[]` — 引用其他 Asset（依赖 DAG 出边）
- `citations` — 被引用次数（自动维护）
- `auditTrail[]` — 版本历史

## 学术论文 ↔ Asset 映射

| 学术概念 | OpenXenon Asset 映射 | 工程含义 |
|---|---|---|
| **论文标题/ID** | `Asset ID` | 唯一标识，全局寻址 |
| **摘要** | `abstract` | 工程师为什么制定这个边界？背景？|
| **正文/定理** | `Invariant / Rules / Spec` | 核心的规则、约束、定义 |
| **参考文献** | `references[]` | **引用其他 Asset**（如"基于 `stack-nodejs` 规范..."）|
| **被引用次数** | `citations` | **重要性/影响半径**（自动计算）|
| **修改历史** | `auditTrail[]` | 版本演进（谁、何时、改了什么）|

## Asset Paper 模板

```markdown
<!-- assets/domain/payment-core.oxn -->
---
type: domain
id: payment-core
version: 1.2.0
status: stable

# 🆕 论文结构扩展（v0.6.3 Phase A）
abstract: |
  本文档定义支付核心领域的边界。
  旨在确保所有支付操作具备幂等性、可追溯性，并符合 PCI-DSS 基础合规要求。
references:                          # 引用其他 Asset（依赖 DAG）
  - asset: stack-nodejs
  - asset: api-rest-standard
citations: 3                         # 自动维护：被 3 个 Asset 引用
auditTrail:                          # 版本历史
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: 新增 §3.4 幂等性约束
---

# 1. Axioms (Definitions)
- **Term `Payment`**: 任何涉及资金流转或状态变更的操作
- **Term `IdempotencyKey`**: 用于去重的唯一请求标识符

# 2. Theorems (Invariants)
1. Must: 必须接受 IdempotencyKey
2. Ban: 禁止直接访问用户密码 Hash
3. Ensure: 必须将 TraceID 写入统一日志

# 3. References (依赖)
参见 [stack-nodejs](../stack/nodejs.oxn) §3
受 [api-rest-standard](../blueprint/api-rest.oxn) 错误码约束
```

## 引用计数算法

**静态扫**（每次 `oxn asset validate` 触发）：

```typescript
function computeCitations(assets: Asset[]): void {
  const refCount = new Map<string, number>()
  
  // 1. 收集所有 references
  for (const a of assets) {
    for (const ref of a.references ?? []) {
      refCount.set(ref, (refCount.get(ref) ?? 0) + 1)
    }
  }
  
  // 2. 写入每个 Asset 的 citations
  for (const a of assets) {
    a.citations = refCount.get(a.id) ?? 0
  }
}
```

**动态监听**（v0.7.1 优化）：
- Asset 新增/修改/删除触发增量重算
- `oxn asset graph <name>` 实时显示子树

## DAG 校验与循环依赖检测

```typescript
function validateDag(assets: Asset[]): DagResult {
  const visited = new Set<string>()
  const stack = new Set<string>()
  const cycles: string[][] = []
  
  function dfs(asset: Asset, path: string[]): void {
    if (stack.has(asset.id)) {
      cycles.push([...path, asset.id])
      return
    }
    if (visited.has(asset.id)) return
    visited.add(asset.id)
    stack.add(asset.id)
    
    for (const ref of asset.references ?? []) {
      const target = assets.find(a => a.id === ref)
      if (!target) {
        // 孤儿引用
        throw new IAPError('INFRA', 'INFRA_FAIL', YIELD_TO_HUMAN,
          `Asset ${asset.id} references non-existent ${ref}`,
          { assetId: asset.id, missingRef: ref })
      }
      dfs(target, [...path, asset.id])
    }
    
    stack.delete(asset.id)
  }
  
  for (const a of assets) {
    if (!visited.has(a.id)) dfs(a, [])
  }
  
  return { valid: cycles.length === 0, cycles }
}
```

## 引用计数价值

**影响力排序**：

```
High citations:
  - stack-nodejs (被 50 个 Asset 引用)   ← 基础层
  - api-rest-standard (被 30 个 Asset 引用)  ← 规范层
  - domain-payment-core (被 15 个 Asset 引用)  ← 核心域

Low citations:
  - domain-promotion-coupon (被 2 个 Asset 引用)  ← 业务层
  - blueprint-coupon-flow (被 1 个 Asset 引用)    ← 应用层
```

**变更影响半径**：
- 修改 `stack-nodejs`（50 引用）→ **重构级**，需 planLock 重算 + 全量测试
- 修改 `domain-promotion-coupon`（2 引用）→ **业务级**，仅相关模块测试

**Hall 排序**：citations 高的 Asset 优先注入 Stable Prefix。

## 后果

- ✅ Asset 价值可量化（被引用次数）
- ✅ 依赖网络显式化（DAG 校验）
- ✅ 循环引用检测（耦合度告警）
- ✅ 基础 vs 应用 Asset 自动分层（影响半径不同）
- ⚠ 引用计数性能瓶颈（N > 10K 需优化，v0.7.1 增量）
- 🔗 关联 v0.7.0 W11-12 Asset 影响图（数据源）

## 反模式

- ❌ Asset 无 `abstract`（缺少论文摘要）
- ❌ `references[]` 指向不存在的 Asset（孤儿引用）
- ❌ 循环引用（A → B → A）（耦合度过高）
- ❌ `citations` 与实际引用数不符（数据失同步）

## 参考

- v0.6.3 Asset Paper Schema RFC §1.1, §1.3
- ADR-0048 library/external 子目录
- v0.7.0 W11-12 Asset 影响图计划
- harness-3.md §Memory 层（v0.6.3 重新定位为"Asset 价值量化"）