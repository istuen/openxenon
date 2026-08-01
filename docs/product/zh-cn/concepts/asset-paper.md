---
redirectFrom:
  - /zh-cn/asset-paper.html
title: 资产论文结构
---

# 资产论文结构（Asset-as-Paper · v0.6.3+）

> 术语查询见 [术语表](./glossary.md)（RFC-0017 单一权威源）。本页不重定义术语。

> **Asset 是一篇"微型论文"**——结构固定、逻辑自洽、可被引用、可被验证。把"规则堆砌"升级为"逻辑依赖网络"，是 OpenXenon 从"工具"走向"知识工程系统"的关键一步。
>
> **核心动机**：Asset 价值由"被引用次数"量化（论文结构），引用链 = 依赖网络（DAG），基础 vs 应用 = 重构 vs 业务变更。

## 1. 学术论文 ↔ Asset 映射

| 学术概念 | OpenXenon Asset 映射 | 工程含义 |
|---|---|---|
| **论文标题/ID** | `Asset ID` | 唯一标识，全局寻址 |
| **摘要** | `abstract` | 工程师为什么制定这个边界？背景？|
| **正文/定理** | `Invariant / Rules / Spec` | 核心的规则、约束、定义 |
| **参考文献** | `references[]` | **引用其他 Asset**（如"基于 `stack-nodejs` 规范..."）|
| **被引用次数** | `citations` | **重要性/影响半径**（自动计算）|
| **修改历史** | `auditTrail[]` | 版本演进（谁、何时、改了什么）|

## 2. Asset Paper 完整模板

```markdown
<!-- assets/domain/payment-core.md -->
---
type: domain
id: payment-core
version: 1.2.0
status: stable

# 🆕 论文结构（v0.6.3 引入）
abstract: |
  本文档定义支付核心领域的边界。
  旨在确保所有支付操作具备幂等性、可追溯性，并符合 PCI-DSS 基础合规要求。
references:                          # 引用其他 Asset（依赖 DAG 出边）
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
参见 [stack-nodejs](../stack/nodejs.md) §3
受 [api-rest-standard](../blueprint/api-rest.md) 错误码约束
```

## 3. Schema 字段详解（v0.6.3 扩展）

### 3.1 abstract（论文摘要）

```yaml
abstract: |
  本文档定义支付核心领域的边界。
  旨在确保所有支付操作具备幂等性、可追溯性。
```

**必填**（除 v0.6.x 老 Asset 自动补空字符串）。**用途**：AI 上下文注入时作为"标题级摘要"，节省 Token。

### 3.2 references[]（引用其他 Asset）

```yaml
references:
  - asset: stack-nodejs
  - asset: api-rest-standard
```

**元素类型**：Asset ID 字符串。**校验**：
- 每个 ID 必须存在（否则 `OXN_ASSET_ORPHAN_REFERENCE`）
- 不可形成循环（A → B → A → 报 `OXN_ASSET_CIRCULAR_DEPENDENCY`）

**作用**：
- 注入 Stable Prefix 时按 references 拓扑排序
- 计算 DAG（依赖网络）
- 影响半径分析

### 3.3 citations（被引用次数）

```yaml
citations: 3
```

**自动维护**。**算法**：
```typescript
function computeCitations(assets: Asset[]): void {
  const refCount = new Map<string, number>()
  for (const a of assets) {
    for (const ref of a.references ?? []) {
      refCount.set(ref, (refCount.get(ref) ?? 0) + 1)
    }
  }
  for (const a of assets) {
    a.citations = refCount.get(a.id) ?? 0
  }
}
```

**触发时机**：
- `oxn asset validate`（静态扫）
- Asset 新增/修改/删除（增量）
- `oxn asset validate --rebuild-citations`（强制重算）

### 3.4 auditTrail[]（版本历史）

```yaml
auditTrail:
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: 新增 §3.4 幂等性约束
  - version: 1.1.0
    date: 2026-08-01
    author: engineer-Y
    changes: 拆分 §2 验证规则
```

**结构**：每个 entry 包含 version / date / author / changes 四元组。**与 git log 关系**：不重复（git log 是文件级，auditTrail 是语义级）。

## 4. 引用计数算法详解

### 4.1 静态扫（v0.6.3 初始）

```bash
$ oxn asset validate
# 1. 扫 .openxenon/assets/**.md
# 2. 解析每个 Asset 的 references[]
# 3. 构建反向引用 map
# 4. 写入每个 target Asset 的 citations
# 5. 检测循环依赖（DAG 校验）
```

### 4.2 增量计算（v0.7.0 优化）

```typescript
class CitationCache {
  private cache = new Map<string, number>()
  
  // Asset 增删改时触发
  invalidate(assetId: string): void {
    // 1. 找到所有引用此 assetId 的 Asset
    // 2. 仅重算这些 Asset 的 citations
    // 3. 其他 Asset 缓存命中
  }
}
```

### 4.3 动态监听（v0.7.1 计划）

```typescript
// 监听文件系统，自动触发重算
chokidar.watch('.openxenon/assets/')
  .on('change', path => invalidateCitationsFor(path))
```

## 5. DAG 校验与循环依赖检测

### 5.1 算法

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

### 5.2 错误码

| 错误码 | 触发 | 处理 |
|---|---|---|
| `OXN_ASSET_ORPHAN_REFERENCE` | references[] 指向不存在的 Asset | 报错，提示哪个引用孤儿 |
| `OXN_ASSET_CIRCULAR_DEPENDENCY` | 引用链形成环 | 报错，列出完整环路径 |

## 6. 影响半径分析（基础 vs 应用）

### 6.1 引用计数 → 影响半径映射

```typescript
function impactRadius(asset: Asset): 'low' | 'medium' | 'high' | 'critical' {
  const citations = asset.citations ?? 0
  if (citations >= 10) return 'critical'  // 重构级
  if (citations >= 5) return 'high'      // 重大变更
  if (citations >= 1) return 'medium'    // 业务级
  return 'low'                            // 局部
}
```

### 6.2 实际案例

| Asset | citations | 影响半径 | 变更策略 |
|---|---|---|---|
| `stack-nodejs` | 50 | critical | 触发 planLock 重算 + 全量测试 |
| `api-rest-standard` | 30 | critical | 触发 planLock 重算 + 全量测试 |
| `domain-payment-core` | 15 | high | 触发相关模块测试 |
| `domain-promotion-coupon` | 2 | medium | 仅相关业务测试 |
| `blueprint-coupon-flow` | 1 | medium | 仅 1 个下游验证 |
| `domain-experimental-x` | 0 | low | 无验证（孤岛 Asset）|

### 6.3 基础 vs 应用的工程意义

**基础层 Asset**（高 citations）：
- 变更影响面巨大
- 需 planLock 强制校验
- 适合作为 Stable Prefix 优先注入

**应用层 Asset**（低 citations）：
- 变更影响有限
- 可独立演进
- 适合延迟注入（按需）

## 7. library/ + external/ 子目录

### 7.1 物理布局

```
.openxenon/assets/
├── domain/                          # 原
├── blueprint/                       # 原
├── stack/                           # 原
├── library/                         # 🆕 外部信息聚合（Work 产出）
│   ├── axios-docs.md              # Axios 官方文档聚合
│   └── terraform-aws.md
└── external/                        # 🆕 外部引用指针（不存内容）
    ├── npm-deps.md                # URL + hash + ttl
    └── github-issues.md
```

### 7.2 `library/` vs `external/` 关键区别

| 维度 | library/ | external/ |
|---|---|---|
| 内容存储 | AI 解析后写入 .md | 仅引用指针 |
| 适用场景 | 频繁复用的外部知识 | 临时引用 |
| 失效检测 | Engine 校验 | TTL 到期触发 fetch |
| 大小限制 | < 50KB | 引用指针无大小 |

## 8. CLI 完整清单

```bash
# 验证（含 DAG 校验 + citations 重算）
$ oxn asset validate
$ oxn asset validate --check-dag        # 仅 DAG 校验
$ oxn asset validate --rebuild-citations  # 强制重算

# 列出（含 citations 排序）
$ oxn asset list
$ oxn asset list --sort citations        # 默认按 citations desc
$ oxn asset list --impact critical       # 仅 critical
$ oxn asset list --type domain

# 详情
$ oxn asset show payment-core

# 引用图（v0.7.0 新增）
$ oxn asset graph payment-core
$ oxn asset graph payment-core --format dot
$ oxn asset graph payment-core --format mermaid
$ oxn asset graph payment-core --depth 3   # 间接依赖深度

# 影响半径
$ oxn asset impact payment-core
# impact: high
# citations: 3
# referencedBy: [order-checkout, refund-flow, payment-gateway]

# library 验证
$ oxn library validate axios-docs        # size < 50KB 校验
```

## 9. 错误码扩展

```typescript
ExecErrorCode = {
  // ... v0.6.2 已有
  OXN_ASSET_ORPHAN_REFERENCE: 'OXN_ASSET_ORPHAN_REFERENCE',
  OXN_ASSET_CIRCULAR_DEPENDENCY: 'OXN_ASSET_CIRCULAR_DEPENDENCY',
  OXN_ASSET_CITATION_MISMATCH: 'OXN_ASSET_CITATION_MISMATCH',
  OXN_ASSET_LIBRARY_SCHEMA_INVALID: 'OXN_ASSET_LIBRARY_SCHEMA_INVALID',
  OXN_ASSET_EXTERNAL_FETCH_FAILED: 'OXN_ASSET_EXTERNAL_FETCH_FAILED',
  OXN_ASSET_GRAPH_CYCLE: 'OXN_ASSET_GRAPH_CYCLE',
  OXN_ASSET_GRAPH_TOO_LARGE: 'OXN_ASSET_GRAPH_TOO_LARGE',
}
```

## 10. 反模式

- ❌ Asset 无 `abstract`（缺少论文摘要，AI 注入时需全量读）
- ❌ `references[]` 指向不存在的 Asset（孤儿引用）
- ❌ 循环引用 A → B → A（耦合度过高）
- ❌ `citations` 与实际引用数不符（数据失同步）
- ❌ 手动改 `citations` 字段（必须由 Engine 自动维护）
- ❌ library/ 塞完整 PDF（破坏 Stable Prefix）
- ❌ 跳过 Work 直接写 library/（失去 IAP 闭环）

## 11. 哲学锚定

| 理论 | 体现 |
|---|---|
| **系统论** | Asset 是系统节点，references 是边，DAG 是系统结构 |
| **信息论** | citations 量化节点影响力（信息熵视角）|
| **控制论** | 影响半径指导变更控制（feedback loop）|
| **协同论** | 基础 vs 应用 Asset 的协同层级（涌现基座）|

## 12. 关键代码路径索引

| 文件 | 角色 |
|---|---|
| `packages/engine/src/Asset/schemas/asset-paper-schema.ts` | Asset Paper schema（4 新字段）|
| `packages/engine/src/Asset/citation-cache.ts` | 增量 citations 缓存 |
| `packages/engine/src/Asset/graph-builder.ts` | buildAssetGraph → DOT/Mermaid |
| `packages/engine/src/Asset/dag-validator.ts` | 循环依赖检测 |
| `packages/engine/src/Asset/impact-radius.ts` | 影响半径计算 |
| `packages/cli/src/commands/asset-graph.ts` | `oxn asset graph` CLI |
| `packages/engine/src/Asset/__tests__/paper-schema.test.ts` | 4 字段 schema 解析 |
| `packages/engine/src/Asset/__tests__/dag-validator.test.ts` | 循环检测 |
| `packages/engine/src/Asset/__tests__/citation-cache.test.ts` | 增量计算 |
| `packages/engine/src/Asset/__tests__/impact-radius.test.ts` | 半径映射 |

---

## → 参考

- [Core Concepts](./iap-paradigm.md) §11 Asset 论文结构
- [Asset · E1 硬约束边界](./asset.md) §14 Asset 论文结构
- [Work · E2 IAP 核心](./work.md) §12 Work context.md 设计
- v0.6.3 Asset Paper Schema RFC 📝 Draft
- ADR-0048 ~ 0051 系列
- v0.6.3 Asset Paper Schema RFC 📝 Draft
- v0.7 Emergence RFC ✅ Approved
- [Asset 模板库](../reference/asset-templates/README.md) — Domain / Workflow / Stack / Roadmap 4 模板（v0.6.1-alpha.1 落地）