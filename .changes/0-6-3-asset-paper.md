---
version: 0.6.3
date: 2026-09-15
type: minor
rfc:
  - .openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md
adr:
  - .openxenon/docs/adrs/0048-asset-library-external-scheme.md
  - .openxenon/docs/adrs/0049-work-context-md-replaces-memory.md
  - .openxenon/docs/adrs/0050-onboarding-via-starter-work.md
  - .openxenon/docs/adrs/0051-asset-paper-citation-network.md
---

# 0.6.3 — Asset Paper Schema + library/external 子目录

> **v0.6.3 主题**：把 Asset 从"规则堆砌"升级为"微型论文 + 引用网络"。Asset schema 扩展 4 个新字段（abstract / references / citations / auditTrail），新增 `library/` + `external/` 子目录承载外部信息。
>
> **核心设计**：奥姆剃刀 + 工作流驱动 — 删除 v0.7.x Memory RFC 的中间层，外部信息通过 Work 路径引入。
> **前提**：v0.6.2 Insight 收集层。
> **核心 RFC**：[v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft

## 核心变化

### 1. Asset schema 扩展（4 新字段 · Phase A）

```yaml
# .openxenon/assets/<kind>/<name>.oxn
---
type: domain
id: payment-core
version: 1.2.0
status: stable

# 🆕 论文结构（v0.6.3 引入）
abstract: |
  本文档定义支付核心领域的边界。
  旨在确保所有支付操作具备幂等性、可追溯性。
references:                    # 引用其他 Asset
  - asset: stack-nodejs
  - asset: api-rest-standard
citations: 3                   # 自动维护：被 3 个 Asset 引用
auditTrail:                    # 版本历史
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: 新增 §3.4 幂等性约束
---
```

| 字段 | 类型 | 含义 |
|---|---|---|
| `abstract` | string | Asset 的 Intent 摘要（论文 Abstract）|
| `references[]` | Asset ID 数组 | 引用其他 Asset（依赖 DAG 出边）|
| `citations` | number | 被引用次数（自动维护）|
| `auditTrail[]` | 对象数组 | 版本历史（论文修改记录）|

### 2. library/ + external/ 子目录

```
.openxenon/assets/
├── domain/                          # 原
├── blueprint/                       # 原
├── stack/                           # 原
├── library/                         # 🆕 外部信息聚合（Work 产出）
│   ├── axios-docs.oxn              # 例：Axios 官方文档聚合
│   └── terraform-aws.oxn
└── external/                        # 🆕 外部引用指针（不存内容）
    ├── npm-deps.oxn                # URL + hash + ttl
    └── github-issues.oxn
```

**`library/` vs `external/` 关键区别**：
- `library/` — 内容已索引（AI 解析后写入 .oxn，size < 50KB）
- `external/` — 仅引用指针（按需 fetch，URL + hash + ttl）

### 3. 引用计数算法（Phase A · 静态扫）

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

### 4. DAG 校验 + 循环依赖检测

```typescript
function validateDag(assets: Asset[]): DagResult {
  // 1. 孤儿引用检测：references[] → 必须存在
  // 2. 循环依赖检测：A → B → A → 报错 OXN_ASSET_CIRCULAR_DEPENDENCY
  // 3. valid=true / cycles[] 列表
}
```

### 5. Work/context.md 模板（取代 Memory L1）

`works/<work-id>/context.md`：

```markdown
---
workId: w-fix-payment-idempotency
intent: 修复支付网关回调的幂等性
createdAt: 1731628800000
status: aligning
currentRound: 3
references:                    # 引用 Asset（不复制内容，只存指针）
  - assets/domain/payment-core.oxn
  - assets/stack/nodejs.oxn
  - assets/library/axios-docs.oxn
---

## Intent
[工程师声明的意图]

## Roadmap
- [x] 1. 读取 payment/service.ts
- [x] 2. 分析幂等性漏洞
- [~] 3. 编写单元测试  ← current
- [ ] 4. 修复代码
- [ ] 5. 运行 Proof

## Loop History（仅摘要）
### Round 3 (current)
- AI: 写测试用例
- Tool: write_file(tests/payment/idempotency.test.ts)
```

### 6. 外部信息引入路径（统一通过 Work）

```bash
# 1. 工程师发现 Axios 文档太旧
$ oxn work create w-update-axios-docs \
    --type asset --asset-kind library --name axios-docs

# 2. AI 跑 IAP 闭环
# Intent: 更新 axios-docs.oxn
# Align:
#   1. read_file(.openxenon/assets/library/axios-docs.oxn)  # 读旧版本
#   2. web_fetch(https://axios-http.com/docs/intro)          # 抓新文档
#   3. parse + diff + 生成新版本 .oxn
#   4. write_file(.openxenon/assets/library/axios-docs.oxn)  # 覆盖
# Proof:
#   → oxn library validate axios-docs
#   → planLock 重算 + chmod 0o444

# 3. 后续 Work 自动消费
#   → Skill include library/axios-docs.oxn 注入 Stable Prefix
```

### 7. 错误码

```typescript
ExecErrorCode = {
  // ... v0.6.2 已有
  OXN_ASSET_ORPHAN_REFERENCE: 'OXN_ASSET_ORPHAN_REFERENCE',
  OXN_ASSET_CIRCULAR_DEPENDENCY: 'OXN_ASSET_CIRCULAR_DEPENDENCY',
  OXN_ASSET_CITATION_MISMATCH: 'OXN_ASSET_CITATION_MISMATCH',
  OXN_ASSET_LIBRARY_SCHEMA_INVALID: 'OXN_ASSET_LIBRARY_SCHEMA_INVALID',
  OXN_ASSET_EXTERNAL_FETCH_FAILED: 'OXN_ASSET_EXTERNAL_FETCH_FAILED',
}
```

## 物理布局（v0.6.3 新增/修改）

### 新增

```
.openxenon/assets/
├── library/                         # 🆕 外部信息聚合
└── external/                        # 🆕 外部引用指针

.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/
└── v0.6.3-asset-paper-schema-rfc.md  # 🆕 论文结构 RFC

.openxenon/docs/adrs/
├── 0048-asset-library-external-scheme.md
├── 0049-work-context-md-replaces-memory.md
├── 0050-onboarding-via-starter-work.md
└── 0051-asset-paper-citation-network.md

docs/zh-cn/asset-paper.md              # 🆕 论文结构 SSOT
docs/en/asset-paper.md                # 🆕 英文双语
```

### 修改

- `docs/zh-cn/asset.md` — §14 Asset 论文结构（增补）
- `docs/zh-cn/work.md` — §12 Work context.md 设计（新增）
- `docs/zh-cn/insight.md` — §8 删除（v0.7.x Memory 双源已反弹）
- `docs/zh-cn/core-concepts.md` — §11 调整（指向 Asset-Paper 引用替代）

## 测试统计

| 类型 | 数量 |
|---|---|
| 单元（schema 解析 + DAG 校验 + 引用计数） | 8 |
| 单元（work context.md 模板） | 2 |
| E2E（`oxn asset graph` + `oxn library validate`） | 2 |
| **合计** | **12** |

**v0.6.3 验收门槛**：≥ 1,986 pass（v0.6.2 末 1,974 + 12）

## 关键风险

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| v0.6.x 项目升级 schema 不兼容 | 低 | 中 | 缺字段时 Zod default([])/default(0) |
| 引用计数性能瓶颈（N > 10K）| 低 | 中 | v0.7.1 增量计算 + 缓存 |
| 循环依赖误报（v0.6.3 早期）| 中 | 低 | 仅 warn，不阻断 validate |
| library/ 误用（塞大量文本）| 中 | 中 | `oxn library validate` 限制 size < 50KB |

## v0.6.3 不做

- 跨 Project 引用 → v0.8.0 Skill Registry
- Hall 实时引用图 → v0.7.0 W11-12
- 引用计数 ML 预测 → v0.9.0+

## 迁移路径（开发者视角）

```bash
# v0.6.2 → v0.6.3
bun install
bun run langium:generate  # Asset schema 扩展

# 1. 现有 Asset 自动升级（缺字段时 default）
$ oxn asset validate
# → 自动补充 default references=[], citations=0

# 2. 手动补充 abstract（推荐）
$EDITOR .openxenon/assets/domain/my-domain.oxn
# 添加：
# abstract: |
#   本 domain 定义了 ...

# 3. 添加 references（推荐）
# references:
#   - asset: stack-nodejs

# 4. 验证 DAG
$ oxn asset validate --check-dag
# → 0 cycles / 0 orphans

# 5. 验证引用计数
$ oxn asset list --sort citations
# → 高引用 Asset 排前

# 6. （可选）创建 library/ starter
$ oxn work create w-update-axios-docs --type asset --asset-kind library
```

## 三阶段落地（整体规划）

| 版本 | 任务 | 状态 |
|---|---|---|
| v0.6.3 W9 (2026-09) | Phase A: schema 扩展 + library/external + 错误码 | 本 RFC |
| v0.7.0 W11-12 (2026-11) | Phase B: citations 计算 + Hall Asset 影响图 + `oxn asset graph` CLI | [v0.7.0 changelog](0-7-0-asset-graph.md) |
| v0.7.1 (2026-12) | Phase C: 动态监听 + 循环依赖图可视化 + 引用计数缓存 | 后续 RFC |

## 参考

- [v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [ADR-0048 library/external 子目录](../../.openxenon/docs/adrs/0048-asset-library-external-scheme.md)
- [ADR-0049 Work/context.md 取代 Memory](../../.openxenon/docs/adrs/0049-work-context-md-replaces-memory.md)
- [ADR-0050 Onboarding via Starter Work](../../.openxenon/docs/adrs/0050-onboarding-via-starter-work.md)
- [ADR-0051 Asset-as-Paper 论文结构 + 引用计数 + DAG](../../.openxenon/docs/adrs/0051-asset-paper-citation-network.md)
- [docs/zh-cn/asset-paper.md](../../docs/zh-cn/asset-paper.md) 论文结构 SSOT
- [v0.7.x Memory RFC 反弹记录](../../.openxenon/pools/sprints/v0.7-emergence/design/2026-07-05-archive-v0.7.x-memory-rfc-superseded.md)
- [v0.6.x Roadmap RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.x-roadmap-rfc.md)