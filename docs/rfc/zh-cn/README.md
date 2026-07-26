---
title: OXP 索引
---

# OXP 索引

> OpenXenon Proposal (OXP) 决策记录归档。
> 来源：`.openxenon/drafts/rfc/` 内的 ADR（Architecture Decision Record）经 doc-rfc-workflow promote 后形成 OXP。
> ADR 是内部决策日志（append-only），OXP 是外部可见的决策归档（核心冻结，仅可追加 errata）。

## 已 promote 的 OXP（首批 2026-07-22）

| OXP | 标题 | 状态 | 来源 ADR | promote 日期 |
|---|---|---|---|---|
| [OXP-0001](./OXP-0001-terminology-simplification) | 术语精简——废弃叙事层冗余术语，统一到 Proof | ✅ Accepted | [ADR-0066](../../.openxenon/drafts/rfc/0066-terminology-simplification.md) | 2026-07-22 |
| [OXP-0002](./OXP-0002-no-judgment-principle) | 彻底不判原则的代码贯彻 | ✅ Accepted | [ADR-0067](../../.openxenon/drafts/rfc/0067-no-judgment-principle.md) | 2026-07-22 |
| [OXP-0003](./OXP-0003-daemon-responsibility-boundary) | Daemon 职责边界——运行时状态监听 + 事件监听 | ✅ Accepted | [ADR-0068](../../.openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md) | 2026-07-22 |

## OXP 生命周期

```
.openxenon/drafts/xxx-draft.md（散落，无格式）
    ↓ oxn work create promote-xxx --blueprint doc-rfc-workflow
    ↓ lock → run → submit → finalize
docs/rfc/zh-cn/OXP-XXXX-xxx.md（accepted 后核心冻结，仅可追加 errata 段）
```

Promote 流程定义见 Blueprint：[doc-rfc-workflow](../../.openxenon/assets/blueprints/doc-rfc-workflow.md)

## ADR ↔ OXP 关系

| 关系 | 说明 |
|---|---|
| ADR 是 SSOT（append-only） | `.openxenon/drafts/rfc/` 内 ADR 一旦写入不编辑不删除 |
| OXP 是外部镜像（核心冻结） | `docs/rfc/zh-cn/` 内 OXP 镜像 ADR 核心内容，accepted 后仅追加 errata |
| Promote 是单向投影 | ADR → OXP；OXP → ADR 反向同步通过 errata 段追加 |

## 后续批次

下一批 promote 候选（按当前优先级）：
- OXP-0004: ADR-0059 Domain 引用模型 v2
- OXP-0005: ADR-0060 Domain 词汇边界
- OXP-0006: ADR-0061 数据流契约
- OXP-0007: ADR-0054 三边界框架

Promote 入口：`oxn work create promote-XXX --blueprint doc-rfc-workflow`