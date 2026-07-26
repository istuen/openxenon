---
version: 0.6.1
date: 2026-07-18
type: minor
rfc:
  - .openxenon/drafts/rfc/v0.7-domain-hierarchy-restructure-rfc.md
adr:
  - .openxenon/drafts/rfc/0052-langium-retirement-oxn-deprecation.md
  - .openxenon/drafts/rfc/0059-domain-reference-model-v2.md
  - .openxenon/drafts/rfc/0060-domain-vocabulary-boundary.md
---

# 0.6.1 — Domain 三层架构与 MD-native 实态对齐

> 原规划使用 v0.7 名称，实际实现已随 0.6.1 合入。本片段按当前资产与代码重新记录已落地范围。

## 核心变化

### Domain 三层结构

- Root Domain：`oxn-domain`。
- Package Domain：`oxn-engine-domain`、`oxn-cli-domain`。
- Module Domain：`oxn-asset-domain`、`oxn-work-domain`、`oxn-proof-domain`、`oxn-insight-domain`。
- 子域通过 `references` 指向 root/package 上游，root 不向下引用。
- 旧 Domain 已收敛为 7 个 active Domain，工程实现词不再作为稳定业务词汇暴露。

### Engine Domain

- `oxn-engine-domain` 升级到 v0.4.2，聚焦 Kernel、Infra、Daemon、OXL、错误契约和 TrustChain 等稳定概念。
- `IAPError`、`OXNCrash`、`CliInputError` 按物理归属进入 Engine Domain。
- 删除 Langium 注册机制与易漂移的实现细节词；`EntityCompiler`、`EntityRegistry`、`md-pipeline`、`md-bridge` 保留在代码和开发文档中，不进入稳定 Domain 词表。
- Engine/CLI 包边界、CLI↔Daemon socket 边界和 Lambda Vacuum 继续由 invariants 与架构守卫约束。

### CLI Domain

- `oxn-cli-domain` 升级到 v0.4.2，聚焦 Command、SubCommand、Arg、OutputFormat、ExitCode、Skill、Locale 和 Config。
- 错误类型定义归 Engine，CLI 只保留 TopCatch 与 ExitCode 的消费契约。
- 增加 CLI 禁止穿透 Engine 内部路径、CLI↔Daemon 仅走 socket 的不变量。

### Root Stack

- `oxn-stack` 升级到 v0.2.0。
- 增加 Monorepo、Constitution、LayeredNarrative 三项架构元数据，描述 Bun workspaces 双包、L0–L3 宪法及 E1–E4/L0–L3 双层叙事。

### MD-native 切换

- Langium driver 与依赖已删除，`.md` 成为唯一 canonical 格式。
- OXL 统一使用 unified/md-pipeline，EntityCompiler 与 EntityRegistry 继续作为实现层组件。
- 完整切换与迁移说明见 `.changes/0-6-1-oxn-deprecation.md`。

## 兼容性

- Domain 术语集合发生收敛，依赖旧实现词的引用需要迁移到开发文档或具体代码符号。
- Domain references 方向保持 sub→root；L0–L3 物理分层不变。
