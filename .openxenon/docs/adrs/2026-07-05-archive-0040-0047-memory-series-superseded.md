# ADR-0040 ~ 0047 · Memory Series 【SUPERSEDED 2026-07-05】

> **⚠ SUPERSEDED 状态**：本系列 8 个 ADR 于 2026-07-05 经奥姆剃刀反思后**全面反弹**。
> **反弹原因**：v0.7.x Memory 中间层引入"缓存失效 / 回写策略 / 生命周期"等状态机复杂度，违反 OpenXenon 的"工作流驱动"哲学。
> **替代方案**：[ADR-0048 ~ 0051（新设计）](./2026-07-05-archive-0040-0047-memory-series-superseded.md)（注：原路径，下同）
> **保留原因**：作为"v0.7.x Memory 路径"的完整决策链，供未来讨论参考。

---

## 反弹结论（2026-07-05 落地）

| 维度 | 旧（被反弹）| 新（替代）|
|---|---|---|
| 信息聚合层 | `.openxenon/memory/`（独立目录）| ❌ **删除**（用 Asset + Work 替代）|
| Schema | MemoryEntry（9 type + 3 source + trust_score + ttl）| ❌ 删除（用 Asset schema 扩展替代）|
| 生命周期 | 8 阶段（create → active → decay → archive → query → apply → reject → accumulate）| ❌ 删除（Asset 已有自身 lifecycle）|
| 写入路径 | 5 条（ingest / onboard / /write-memory / migrate / engineer）| ✅ 1 条（Work 产出 Asset）|
| 外部信息引入 | Memory L3 + Insight --write-memory | ✅ Asset library/ + external/ 子目录（Work 产出）|
| Apply 机制 | memory-overwriter（atomic rename + .bak + chmod 0o444）| ❌ 删除（Work 自身 IAP 闭环）|
| Onboarding | 5 步 wizard | ✅ 简化成 starter-work（自动产出 starter Asset）|
| Pool 迁移 | 5 种 pool → memory | ❌ 删除（pool 由 Asset 替代）|
| Insight 双源 | pipeline-compute 接受 memory: MemoryEntry[] | ✅ 简化（Insight 单源：frozen.json + Asset）|

---

## 8 个被反弹 ADR 索引

### ADR-0040 · MemoryEntry Schema 统一

> **来源**：v0.7.x Memory RFC §1.2
> **状态**：⚠ Superseded 2026-07-05

```yaml
id: z.string().regex(/^mem-\d{4}-\d{2}-\d{2}-\d{3}$/)
source: 'external' | 'engineer' | 'agent'
type: 'research' | 'design' | 'issue' | 'audit' | 'journal'
     | 'dependency_update' | 'doc_note' | 'discussion' | 'test_result'
trustScore: 0-1
ttl: number | null
relatedAssetIds: string[]
relatedRoadmapItem: string | null
timestamp: ms epoch
approval: ApprovalRecord | null
supersededBy: string | null
tags: string[]
```

**关键反思路**：MemoryEntry 是 12 字段的复杂结构体，但 OpenXenon 已有 Asset schema（同样承载 term/ban/invariant/blueprint/stack/domain）。MemoryEntry 与 Asset 重叠度 80%，新增 12 字段是**重复定义**。

### ADR-0041 · Memory 取代 Pool

> **状态**：⚠ Superseded 2026-07-05

**关键反思路**：v0.5 Pool 5 种分裂本身是过度设计。**Memory 取代 Pool 仍是引入中间层**，正确做法是**直接用 Asset 替代 Pool**（不经过 Memory 中间层）。

### ADR-0042 · Insight 双源（内部 + Memory）

> **状态**：⚠ Superseded 2026-07-05

**关键反思路**：Insight 双源（frozen.json + Memory）增加复杂度。v0.6.x 单一源（frozen.json + Asset）已足够；外部信息通过 library/ + external/ Asset 注入，Insight 仅消费内部知识。

### ADR-0043 · Onboarding Wizard 流程

> **状态**：⚠ Superseded 2026-07-05

**关键反思路**：5 步交互向导引入新概念（"onboarding step"）。**正确做法是让 `oxn init --ai <agent>` 自动生成 starter-work**（Work 自身的 IAP 流程），无需独立 wizard。

### ADR-0044 · Memory Apply Protocol

> **状态**：⚠ Superseded 2026-07-05

**关键反思路**：memory-overwriter 引入 atomic rename + .bak + chmod 0o444 等机制，**完全可由 Work finalize 阶段替代**（Work 自身已实现 atomic + chmod）。Memory apply 是**重复造轮子**。

### ADR-0045 · TTL 衰减与归档

> **状态**：⚠ Superseded 2026-07-05

**关键反思路**：trust_score TTL 自衰减机制是**为"易失信息"设计的**，但 Asset 是**永久资产**（由工程师显式管理），不应有 TTL。**易失信息应通过 Work context.md 而非 Asset 承载**。

### ADR-0046 · Pool → Memory 迁移

> **状态**：⚠ Superseded 2026-07-05

**关键反思路**：从 5 种 Pool 迁移到 Memory 仍是中间层方案。**正确做法是直接从 Pool 迁移到 Asset**（`oxn asset migrate-from-pool`），无需 Memory 中间层。

### ADR-0047 · 闭环验证（Scenario A/B）

> **状态**：⚠ Superseded 2026-07-05

**关键反思路**：Memory 闭环（Memory ↔ Insight）本身就是中间态。**正确闭环是 Asset ↔ Insight ↔ Work**（Insight 推荐 audit Asset → 新 Work 产出新 Asset → 后续 Work 自动消费）。

---

## 反弹时的核心洞察（2026-07-05）

来自 docs_tmp/skill-1.md 等讨论记录：

> **奥姆剃刀定律**：如无必要，勿增实体。Memory 是"中间态"，可用 Asset + Work 直接表达。
>
> **工作流驱动**：所有信息摄入都通过 Work 路径（IAP 闭环），Memory 中间层破坏了"工作流即真理"的核心原则。
>
> **KV Cache 优化**："Stable Prefix + Dynamic Tail" 模型 → 稳定前缀 = Asset 集合，动态尾巴 = Work context.md + Loop tail。无需 Memory 模拟。
>
> **Asset-as-Paper**：Asset 价值由"被引用次数"量化（论文结构），引用链 = 依赖网络（DAG），基础 vs 应用 = 重构 vs 业务变更。

---

## 新设计（替代方案）· ADR-0048 ~ 0051

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-0048](./0048-asset-library-external-scheme.md) | library/ + external/ 子目录设计 | ✅ Adopted |
| [ADR-0049](./0049-work-context-md-replaces-memory.md) | Work/context.md 设计（取代 Memory L1）| ✅ Adopted |
| [ADR-0050](./0050-onboarding-via-starter-work.md) | 5 步 wizard → 简化成 starter-work | ✅ Adopted |
| [ADR-0051](./0051-asset-paper-citation-network.md) | Asset-as-Paper 论文结构 + 引用计数 + DAG | ✅ Adopted |

---

## 关联 RFC（已反弹 + 替代）

- ~~v0.7.x Memory RFC~~ → 反弹后改名 `2026-07-05-archive-v0.7.x-memory-rfc-superseded.md`
- 新 RFC：`v0.6.3-asset-paper-schema-rfc.md`（位于 v0.6.x-observability-roadmap/design/）

---

## 关联 SSOT 文档

- ~~docs/zh-cn/memory.md~~ → 反弹后移入 `docs/zh-cn/_archive/2026-07-05-archive-memory-superseded.md`
- 新 SSOT：`docs/zh-cn/asset-paper.md` + `docs/zh-cn/work.md §12 Work context.md 设计`

---

## 关联 changelog

- ~~.changes/0-7-X-memory.md~~ → 反弹后移入 `.changes/_archive/2026-07-05-archive-0-7-X-memory-superseded.md`
- 新 changelog：`.changes/0-6-3-asset-paper.md` + `.changes/0-7-0-asset-graph.md`

---

## 元数据

- **反弹日期**：2026-07-05
- **反弹工作**：docs-tmp-cleanup work 后续
- **反弹审计**：`.openxenon/forges/splits/_meta/asset-paper-audit.md`
- **反弹前 commit**：v0.6.1-alpha.0 之前的 docs-tmp-cleanup 三次 commit（已落盘但未发布）
- **反弹后 commit**：（见 audit 报告）