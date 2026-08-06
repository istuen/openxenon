---
id: asset-graph
theme: Asset 影响图（Mermaid/DOT 渲染）
priority: medium
status: planned
created-at: 2026-07-28
scheduled-version: ~
synced-at: 2026-08-06
note: |
  从 dev/versions/asset-graph（按 0-X-Y-<slug> 命名）回滚（去版本化）。
  scheduling 时由工程师判定版本号 + git mv 到 dev/versions/<slug>.md。
rfc:
  - .openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md
  - .openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md
adr:
  
---

# Asset 影响图 + Hall v0.5 集成

> **Asset 影响图增量**：在 v0.6.3 Asset Paper Schema 基础上，W11-12 引入 citations 计算 + Hall Asset 影响图渲染（DOT / Mermaid）。
>
> **前提**：~（scheduling 决定） Asset Paper Schema 落地（abstract / references / citations / auditTrail 字段）
> **核心 RFC**：[Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft · [v0.7 Emergence RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md) ✅ Approved

## 核心变化

### 1. citations 动态计算（从静态扫 → 增量）

**Phase A 静态扫（前置版本）**（每次 `oxn asset validate` 触发）：

```typescript
function computeCitations(assets: Asset[]): void {
  // 1. 扫所有 assets
  // 2. 收集 references
  // 3. 写入每个 Asset 的 citations
}
```

**本版本优化**：增量计算 + 缓存

```typescript
class CitationCache {
  // 仅在 Asset 增删改时重算
  // Hash-based invalidation（content_hash 变化触发）
}
```

### 2. `oxn asset graph` CLI（Phase B 新增）

```bash
$ oxn asset graph <name>
# 渲染目标 Asset 的依赖子树
# - 直接依赖（references[]）
# - 间接依赖（传递闭包）
# - 反向引用（被哪些 Asset 引用）

# 输出 DOT 格式
$ oxn asset graph payment-core --format dot
# digraph G {
#   payment-core -> stack-nodejs
#   payment-core -> api-rest-standard
#   order-checkout -> payment-core
#   refund-flow -> payment-core
# }

# 输出 Mermaid 格式（Hall 渲染）
$ oxn asset graph payment-core --format mermaid
# graph LR
#   payment-core --> stack-nodejs
#   payment-core --> api-rest-standard
#   order-checkout --> payment-core
#   refund-flow --> payment-core
```

### 3. Hall Asset 影响图（W11-12 新增面板）

`/hall/assets/<name>/` 详情页：

```
MyApp
├── Anchored Docs（后续计划）
├── Citations: 3
│   ├── order-checkout (引用此)
│   ├── refund-flow (引用此)
│   └── payment-gateway (引用此)
├── References (2)
│   ├── stack-nodejs
│   └── api-rest-standard
└── Impact Radius: medium  ← 自动计算
```

**Impact Radius 算法**（基于 citations）：

```typescript
function impactRadius(asset: Asset): 'low' | 'medium' | 'high' | 'critical' {
  const citations = asset.citations ?? 0
  if (citations >= 10) return 'critical'  // 重构级
  if (citations >= 5) return 'high'      // 重大变更
  if (citations >= 1) return 'medium'    // 业务级
  return 'low'                            // 局部
}
```

### 4. 引用计数 + Hall 排序

**Hall 排序算法**：

```typescript
// /hall/assets/ 默认按 citations desc 排序
assets.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0))

// 效果：基础 Asset（高 citations）优先展示
// 1. stack-nodejs (50 citations)
// 2. api-rest-standard (30)
// 3. domain-payment-core (15)
// 4. domain-promotion-coupon (2)
// 5. blueprint-coupon-flow (1)
```

### 5. 错误码扩展

```typescript
ExecErrorCode = {
  // ... 已有
  OXN_ASSET_GRAPH_CYCLE: 'OXN_ASSET_GRAPH_CYCLE',  // 渲染时发现环
  OXN_ASSET_GRAPH_TOO_LARGE: 'OXN_ASSET_GRAPH_TOO_LARGE',  // 节点 > 100 警告
}
```

## 物理布局（本版本增量）

### 新增

```
packages/engine/src/Asset/
├── graph-builder.ts              # 🆕 buildAssetGraph(name) → DOT/Mermaid
├── citation-cache.ts            # 🆕 增量 citations 缓存
├── impact-radius.ts              # 🆕 影响半径计算
└── __tests__/
    ├── graph-builder.test.ts     # 6 cases
    ├── citation-cache.test.ts    # 3 cases
    └── impact-radius.test.ts     # 4 cases

packages/cli/src/commands/
├── asset-graph.ts                # 🆕 oxn asset graph
└── __tests__/
    └── asset-graph-e2e.test.ts   # 2 cases

docs/.vitepress/theme/components/
└── AssetsImpactPanel.vue         # 🆕 Hall 资产影响面板（W12）
```

### 修改

- `packages/cli/src/commands/asset.ts` — 注册 `oxn asset graph` 子命令
- `packages/engine/src/Asset/validate.ts` — 集成 citation 增量重算
- `docs/.vitepress/hall/assets.md` — 接入 AssetsImpactPanel

## 测试统计

| 类型 | 数量 |
|---|---|
| 单元（graph-builder） | 6 |
| 单元（citation-cache） | 3 |
| 单元（impact-radius） | 4 |
| E2E（`oxn asset graph` CLI） | 2 |
| 集成（Hall AssetsImpactPanel） | 1 |
| **合计** | **16** |

**验收门槛**：≥ 2,043 pass（前置版本末 1,996 + v0.6.3 +12 + 本版本增量 +16 + emergence RFC 31 = 2,055）

> 注：前置版本末门槛为 1,986（含 v0.6.3 12 cases）+ v0.6.4/5 增量 4 = 1,990；本版本增量 16 + emergence 31 = +47 → 2,037（完成时）

## 关键风险

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 引用图渲染性能（N > 100 节点）| 中 | 中 | graph-builder 限制 max depth = 5 |
| 增量 citations 缓存失效 | 中 | 低 | content_hash 校验 + 自动重算 |
| 循环依赖在 graph 渲染时崩溃 | 低 | 中 | DOT 输出时检测环 + warn |

## 本版本不做（推迟到 v0.7.1）

- 动态监听（filesystem watch 自动重算）→ 后续 minor
- 循环依赖图可视化（Cycle 高亮）→ 后续 minor
- 引用计数缓存持久化 → 后续 minor
- 跨 Project 引用图 → 后续 minor Skill Registry

## 迁移路径

```bash
# 上一 minor → 本 minor
bun install
bun run langium:generate  # Asset schema 增量（无 breaking change）

# 1. 触发 citations 重算
$ oxn asset validate --rebuild-citations
# → 重算所有 Asset 的 citations

# 2. 试跑 asset graph
$ oxn asset graph payment-core --format mermaid

# 3. 访问 Hall
$ open http://localhost:5173/hall/assets/payment-core/
# → 看到引用图 + 影响半径
```

## 参考

- [v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md)
- [v0.7 Emergence RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md)
- [ADR-0051 Asset-as-Paper 论文结构 + 引用计数 + DAG](../../.openxenon/docs/adrs/0051-asset-paper-citation-network.md)
- [docs/zh-cn/asset-paper.md](../../docs/zh-cn/asset-paper.md)