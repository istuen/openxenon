---
title: 资产术语
---
synced-at: 2026-07-22
source: oxn-asset-domain.md
---

# 资产术语

> 适用：Asset 五类、三边界框架、AssetKind、Paper 结构、生命周期。

## 五类资产

### Asset
- Asset 是工程师为 AI Agent 协作定义的环境约束。Work 引用 Asset（单向）。详细定义见 [core-terms](./core-terms#asset)。

### AssetKind
- Asset 5 类收敛枚举：domain / workflow / stack / blueprint / roadmap。混用 → 错误。

### Domain
- AssetKind 之一。业务边界（terms/bans/invariants）；与 OXN 顶层 Domain 同名但角色不同。

### Workflow
- AssetKind 之一。执行边界（slot DAG + observe Probe）；AssetKind=workflow。ADR-0054。

### Stack
- AssetKind 之一。实现边界（runtimes/linters/testers）；Proof 阶段直接断言。

### Blueprint
- AssetKind 之一。唯一跨 AssetKind 组合实体，通过 `## Refs` 引用 Domain + Workflow + Stack + 其他 Blueprint。

### Roadmap
- AssetKind 之一。meta 索引层，AI 路由入口（scene 表）；不参与 references DAG。

## 三边界框架

### ThreeBoundaryFramework
- Domain/Workflow/Stack 三正交维度框架，覆盖 IAP Intent 语义/结构/环境三约束；ADR-0054。

### kind-isolation
- references 仅同 AssetKind 原则。跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担；ADR-0054。

## 结构与生命周期

### AssetPaper
- Asset 论文结构 4 字段不变量：abstract + references + citations + auditTrail 缺一不可；ADR-0051。

### PlanLock
- Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 LOCK_HASH_MISMATCH。

### AssetDAG
- Asset `references[]` 字段构建的依赖图（无环 + 跨 kind 隔离 + 数量预算 N=5）。

### AssetLifecycle
- Asset 完整生命周期 3 阶段（create / evolve / archive）+ 附 delete（需 citations==0）。

### AssetMode
- Asset 模式 Work（`oxn work create --type asset --asset-kind X`），走 IAP 闭环但跳过 task DAG；只写 .openxenon/assets/{kind}/{name}.md + planLock。

### AssetCitation
- Asset 反向引用计数（自动维护）。引用方变更 +1，archive 保留，删除要求 citations===0。

### AssetFrontmatter
- Asset .md 文件的 YAML frontmatter schema（含 entity/version/name/abstract/references/citations/status/auditTrail 字段）。

### AssetFileResolver
- Asset 路径解析器（resolveAssetFile / resolveAssetDir），v0.6 primary `.openxenon/assets/{kind}/{name}.md` + v0.5 fallback。

## 边界内引用

### External
- 边界内 `## Externals` H2 category，从 Asset 类型降级。url/path 二选一 + kind enum + 状态索引；ADR-0056。

### FunnelEffect
- Blueprint props ≠ Part props 合集的漏斗原理；通过硬编码/拼接/默认值吸收子层复杂度；ADR-0001。

### ArsenalResolver
- 资产解析器优先级链 @prj > @gbl > @oxn；Work 看到的是 Resolver 而非 BuiltinArsenal；ADR-0004。

### Anchor
- MD `{#anchor-id}` slug 文档锚点，与 Domain term 的 `anchor` 字段双向绑定；编译期校验存在性；ADR-0029 / RFC v0.7.2。
