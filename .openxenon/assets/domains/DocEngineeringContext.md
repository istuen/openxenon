---
entity: domain
version: 0.3.0
name: DocEngineeringContext
---

# Domain: DocEngineeringContext

> 文档工程限界上下文：约束 OpenXenon 三层文档架构（对外 docs/ + 对内-沉淀 .openxenon/docs/ + 对内-探索 .openxenon/pools/）、ADR append-only 约定、RFC 生命周期提升流程

## Terms

### ThreeLayerDoc
- desc: 三层文档分离架构 — 对外 docs/{zh-cn,en}/（确定性 SSOT）+ 对内-沉淀 .openxenon/docs/{adrs,rfcs}/（确定性 append-only）+ 对内-探索 .openxenon/pools/{drafts,issues,journals,spikes}/（流动可改）

### Adr
- desc: 架构决策记录（Architecture Decision Record），append-only 约定 — 决策一旦记录不编辑不删除，被推翻时新 ADR 标记旧 ADR 为 Superseded

### Rfc
- desc: 版本提案（Request for Comments），定稿前在 pools/drafts/ 可改，定稿后提升到 .openxenon/docs/rfcs/ 不再改

### Promote
- desc: 临时文档提升为确定性文档的流程 — pools/drafts/ 中的散落文档按 ADR/RFC 固定格式编写后提升到 .openxenon/docs/，必须走 doc-promote Blueprint 的 Work

### AppendOnly
- desc: 只追加不编辑不删除的约定 — ADR 的核心约束，保证审计链完整性

### DocAsBootstrap
- desc: 文档即自举原则 — OpenXenon 的文档架构变更应通过 OXN 自身的 IAP 流程落地，文档是自举产物

### PromoteBlueprint
- desc: doc-promote Blueprint — 定义提升流水线 4 slot：gather（收集 drafts）→ author（按模板编写）→ validate（格式校验）→ promote（落盘确定性层）

## Bans

### forbidden-constructs
- items:
  - DirectCopyToDocs
  - EditArchivedAdr
  - DeleteAdr
  - SkipPromoteWork
  - MixDocLayers
  - ManualFileMove
- desc: DirectCopyToDocs, EditArchivedAdr, DeleteAdr, SkipPromoteWork, MixDocLayers, ManualFileMove

## Invariants

### inv-1
- value: 三层文档不可混用 — docs/ 只放对外描述性文档；.openxenon/docs/ 只放对内确定性（ADR/RFC）；.openxenon/pools/ 只放对内探索性（drafts/issues/journals/spikes）

### inv-2
- value: ADR append-only — 已落档的 ADR 不编辑不删除；被推翻时写新 ADR 标记旧 ADR 为 Superseded，旧文件保留

### inv-3
- value: RFC 定稿后不再改 — pools/drafts/ 中的 RFC 草稿可自由编辑；提升到 .openxenon/docs/rfcs/ 后确定性，不再修改

### inv-4
- value: promote 必须走 Work — pools/drafts/ 提升到 .openxenon/docs/ 必须走 doc-promote Blueprint 的 IAP 流程（gather→author→validate→promote），禁止直接复制文件

### inv-5
- value: 多对一映射 — 多个 pools/drafts/ 文档可综合提升为一个 ADR 或 RFC；gather slot 收集多 draft，author slot 综合编写

### inv-6
- value: 文档即自举 — OpenXenon 文档架构变更应通过 IAP Work 落地，文档是自举产物而非手写维护
