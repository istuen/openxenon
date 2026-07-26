---
title: 工程术语
synced-at: 2026-07-26
source: oxn-project-domain.md
---

# 工程术语

> 适用：OXN 项目工程元层（文档架构 / 内置 Asset 机制 / 自举种子豁免 / RFC 演进策略）。
> v0.7 新增；与 [核心术语](./core-terms)、[引擎术语](./engine-terms)、[资产术语](./asset-terms)、
> [工作术语](./work-terms)、[证明术语](./proof-terms)、[洞察术语](./insight-terms)、[CLI 术语](./cli-terms) 并列。

## 文档情态

### Definitional Modality（定义性情态）
- Asset 的文档情态——回答"X 是什么"。住 `.openxenon/assets/{kind}/*.md`（E1 Asset）。
- 见 [oxn-asset-domain](../../product/zh-cn/concepts/asset.html)。

### Prescriptive Modality（规定性情态）
- RFC 的文档情态——回答"为什么决定 X"。住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`。
- 见 [RFC](#rfc)。

### Descriptive Modality（描述性情态）
- Doc 的文档情态——回答"怎么用 X"。住 `docs/{product,dev}/{zh-cn,en}/*.md`。
- 见 [OpenXenon 介绍](../../product/zh-cn/introduction.html)。

## 文档架构

### RFC
- OpenXenon 规范（规定性文档）；住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`；
  frozen + errata 演进策略；顺序编号 + theme 字段；中文 only；只引用 `docs/glossary/`。
- 替代旧 ADR + OXP 双层（v0.7 废除 OXP）。
- 详细生命周期见 [OXP 索引](../../rfc/zh-cn/README.html)（Phase 3 重写为 RFC 索引）。

### Built-in Asset
- 随 OXN 发布的内置 Asset；住 `src/builtin/`；通过 `@oxn/` scope 解析；
  项目可用 `@prj/` override。自举种子——手动创建不经 Work。
- v0.6.1 Registry mock 与 `.md` 文件 SSOT 不一致（F1）；v0.7 Phase 4 收窄为 probes + blueprints。

### Starter Asset
- `oxn init --starter` 拷贝到 `.openxenon/assets/` 的 Built-in Asset 副本；
  用户拥有可改。与 `@oxn/` fallback 两层覆盖。
- v0.7 RFC-0011 锁定；当前 Phase 4 不实现 `--starter` flag（D18 延后）。

## 自举

### Bootstrap Seed Exemption（自举种子豁免）
- `src/builtin/` 内置 Asset 手动创建不经 Work（self-bootstrap）；
  存在后后续变更走 asset-evolve Work。
- 适用条件：仅 src/builtin/（项目工程工作台）；项目 `.openxenon/assets/` 变更必须经 Work。
- v0.7 RFC-0012 锁定（meta-RFC）。

## 演进策略

### FrozenPlusErrata
- RFC frozen + errata 演进策略——RFC accepted 后核心冻结，仅可追加 errata 段；version bump patch。
- Supersede 走新 RFC 标 `superseded-by` / `supersedes`。
- v0.7 RFC-0010 锁定（meta-RFC）。