---
id: term-upstream-dag
theme: Domain DSL 演进：@term/X 跨 term 寻址 + @upstream DAG
priority: low
status: planned
created-at: 2026-07-28
scheduled-version: ~
synced-at: 2026-08-06
note: |
  从 dev/versions/term-upstream-dag（按 0-X-Y-<slug> 命名）回滚（去版本化）。
  scheduling 时由工程师判定版本号 + git mv 到 dev/versions/<slug>.md。
rfc:
  - .openxenon/pools/sprints/v0.7-emergence/design/v0.8.0-term-upstream-dag-rfc.md
adr:
  - .openxenon/docs/adrs/0030-term-cross-reference-upstream-dag.md
---

# Domain DSL 演进：`@term/X` 跨 term 寻址 + `@upstream` DAG

> **主题**：Domain DSL 演进 — 跨 term 物理引用 + 域间 DAG 编译期校验。补齐 ADR-0023 `@` 寻址哲学的最后两块拼图，让跨域影响分析成为编译期事实。
>
> **前提**：~（scheduling 决定；前置 minor 由工程师判定） + v0.7.2。
> **核心 RFC**：[@term/@upstream DAG RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.8.0-term-upstream-dag-rfc.md) 📝 Draft
> **⚠ Breaking Change**：Domain grammar 扩展（`upstream` 块 + `@term/X` 类型引用）。旧 `.oxn` 文件兼容，新语法可选启用。

## 核心变化

### 1. `@term/X` 跨 term 寻址

**v0.6.x 现状**（编译期不校验）：
```oxl
domain "Order" {
  term "Order" {
    property id: "uuid"
    property items: "OrderItem[]"   // ❌ 纯文本，无校验
  }
}
```

**v0.8.0 升级**（编译期校验）：
```oxl
domain "Order" {
  term "Order" {
    property id: "uuid"
    property items: "@term/OrderItem[]"  // ✅ 物理引用（同 Domain 内）
  }

  term "OrderItem" { ... }
}
```

**校验规则**：
- `@term/X` 必须指向同一 Domain 内已定义的 term
- 缺失 → `E_OXL_TERM_NOT_FOUND`
- 自引用 → `E_OXL_TERM_SELF_REFERENCE`
- 删除 term X → 列出所有 dangling refs（warning，不阻断）

### 2. `@upstream` 域间 DAG 声明

```oxl
domain "Order" {
  upstream {
    "OrderItem" -> "@prj/domains/Product/Term/SKU"  // 跨域引用
  }
}
```

**校验规则**：
- `upstream` 块定义跨域依赖图
- 编译期拓扑排序（DAG）
- 循环依赖 → `E_OXL_UPSTREAM_CYCLE`
- 引用目标不存在 → `E_OXL_UPSTREAM_TARGET_NOT_FOUND`

### 3. CLI 新增

```bash
oxn domain impact <name>           # 上下游影响分析
oxn domain dag <name>              # 输出 DOT / Mermaid
oxn domain validate <name>         # 现有 validate + @term/@upstream 校验
```

输出示例：
```bash
$ oxn domain impact Order
Downstream (依赖 Order):
  - Shipping (shipping.oxn: Order)
Upstream (Order 依赖):
  - Product (product.oxn: SKU)
  - User (user.oxn: User)
```

### 4. 与 ADR-0023 `@` 哲学的协调

ADR-0023 已确立 `@` 前缀的物理引用语义。v0.8.0 扩展 `@` 体系：

| 前缀 | 含义 | 引入版本 |
|---|---|---|
| `@oxn/` | builtin Probe / Part | v0.6 |
| `@prj/` | 项目级 Asset | v0.6 |
| `@gbl/` | 用户全局 Asset | v0.6 |
| `@doc/` | 文档锚点（v0.7.2） | v0.7.2 |
| `@term/` | **跨 term 引用（v0.8.0）** | **v0.8.0** |
| `@upstream:` | **域间 DAG 声明（v0.8.0）** | **v0.8.0** |

`->` 伪指针继续被否决（ADR-0023）。

### 5. Langium Grammar 扩展

`src/oxl/langium/oxn.langium`：

```langium
Domain: 'domain' name=ID '{'
  (term+=Term)*
  ('upstream' '{' upstream+=UpstreamEdge* '}')?  // v0.8.0 新增
'}';

UpstreamEdge: from=ID '->' ref=CrossRef;  // v0.8.0 新增

Term: 'term' name=ID '{'
  (property+=Property | invariant+=Invariant)*
  ('anchor' '=' anchor=STRING)?  // v0.7.2
'}';

Property: name=ID ':' type=PropertyType;
PropertyType: STRING | TermRef;  // v0.8.0: STRING | '@term/'ID
```

### 6. Hall AssetsPanel 升级

`/hall/assets/<name>/` 详情页：

```
Order
├── Anchored Docs (v0.7.2)
├── Downstream (2)  ──[graph: OrderImpact.gv]
│   ├── Shipping
│   └── Invoice
├── Upstream (2)
│   ├── Product
│   └── User
└── @term refs (5)
    ├── @term/OrderItem (1)
    ├── @term/OrderStatus (3)
    └── @term/Payment (1)
```

### 7. 错误码扩展

```typescript
ExecErrorCode = {
  // ... 已有
  E_OXL_TERM_NOT_FOUND: 'E_OXL_TERM_NOT_FOUND',
  E_OXL_TERM_SELF_REFERENCE: 'E_OXL_TERM_SELF_REFERENCE',
  E_OXL_UPSTREAM_CYCLE: 'E_OXL_UPSTREAM_CYCLE',
  E_OXL_UPSTREAM_TARGET_NOT_FOUND: 'E_OXL_UPSTREAM_TARGET_NOT_FOUND',
}
```

## 物理布局（本版本新增/修改）

### 新增

```
packages/engine/src/oxl/md-bridge/compilers/
├── domain-validator.ts             # @term + @upstream 校验
└── __tests__/domain-validator.test.ts  # 12 cases

packages/engine/src/Asset/
├── impact-analyzer.ts              # 上下游分析
└── __tests__/impact-analyzer.test.ts   # 8 cases

packages/cli/src/commands/
├── domain-impact.ts                # oxn domain impact
├── domain-dag.ts                   # oxn domain dag
└── __tests__/
    ├── domain-impact-e2e.test.ts   # 3 cases
    └── domain-dag-e2e.test.ts      # 2 cases
```

### 修改

- `src/oxl/langium/oxn.langium` — Term / Domain / UpstreamEdge grammar
- `packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts` — `@term/X` + `upstream` 解析
- `packages/cli/src/errors/iap-error.ts` — 新增错误码

### 运行时产物

```
.openxenon/hall/assets/<name>/
├── dag.gv                          # Graphviz DOT（oxn domain dag 生成）
└── impact.json                     # 上下游 JSON（oxn domain impact 生成）
```

## 测试 / 构建结果（目标）

- **typecheck**: 0 errors ✅
- **测试**: ≥ 2,132 pass（完成时 2,099 + 33）
- **grammar regen**: 重新生成 `src/oxl/generated/*`（2 次 langium:generate 兼容窗口）
- **CLI build**: 集成 `domain impact` / `domain dag`

## ⚠ Breaking Change 迁移路径

v0.8.0 引入 **Domain grammar 扩展**，但保持向后兼容：

| 旧语法 | 新语法（推荐） | 兼容策略 |
|---|---|---|
| `property items: "OrderItem[]"` | `property items: "@term/OrderItem[]"` | 兼容（旧纯文本仍可工作，仅 warning） |
| 无 `upstream` 块 | 新增 `upstream { ... }` 块 | 兼容（upstream 块是可选） |

**迁移步骤**：

```bash
# 1. 项目从 v0.7.x 升级到 v0.8.0
bun install
bun run langium:generate

# 2. （可选）把旧纯文本引用迁移为 @term/X
oxn domain validate MemberContext --suggest-migration
# → 自动列出可迁移的引用，输出建议 diff

# 3. 添加 upstream 块（可选，但推荐用于跨域 Domain）
$EDITOR .openxenon/assets/domain/Order.oxn
# upstream { "OrderItem" -> "@prj/domains/Product/Term/SKU" }

# 4. 验证
oxn domain validate Order
oxn domain impact Order
```

**兼容窗口**：3 个 minor 期（具体版本由 scheduling 决定）内维持纯文本引用兼容；v0.9.0 起纯文本引用将升级为 `E_OXL_DEPRECATED_TEXT_REF` warning。

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 跨域循环依赖引入 | 低 | 高 | 编译期拓扑排序 + cycle 检测 |
| `@term` 引用断裂（term 删除） | 中 | 中 | validate 列出 dangling refs + warning |
| Langium grammar 升级破坏旧 .oxn | 低 | 中 | 3 个 minor 期兼容窗口 |
| 大型项目 `upstream` DAG 性能 | 低 | 低 | 增量校验（仅变更 Domain 触发） |

## 本版本不做

- 跨项目 Asset 引用（v0.8 Skill 远程 Registry 范围）
- 自动 refactor 工具（v0.9 自组织协同）
- 影响分析的 ML 预测（v0.9+）

## 参考

- [v0.8.0 @term/@upstream DAG RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.8.0-term-upstream-dag-rfc.md) 📝 Draft
- [ADR-0030 `@term/X` + `@upstream` DAG](../../.openxenon/docs/adrs/0030-term-cross-reference-upstream-dag.md)
- [ADR-0023 `@` 哲学 + `->` 否决](../../.openxenon/docs/adrs/0023-at-addressing-no-arrow-pointer.md)
- [v0.7 Emergence RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md) §2.6 Asset 影响图
- [v0.7+ Roadmap Overview](../../.openxenon/pools/sprints/v0.7-plus-roadmap/overview.md) §3 v0.8 阶段