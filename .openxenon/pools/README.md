# .openxenon/pools/ — 开发性文档池（临时/探索）

> **三层文档规则**：对外 `docs/{zh-cn,en}/` → 对内-沉淀 `.openxenon/docs/` → 对内-探索 `.openxenon/pools/`
>
> pools/ 是流动的——可自由编辑、删除。定稿后通过 `doc-promote` Work 提升到 `.openxenon/docs/rfcs/` 或 `.openxenon/docs/adrs/`。

## 目录

| 目录 | 内容 | 提升目标 |
|---|---|---|
| `drafts/` | 探索性设计、未定稿 RFC、审计报告、sprint 元信息 | `.openxenon/docs/rfcs/`（定稿后） |
| `issues/` | 工程问题记录（ISS-*） | — |
| `journals/` | session 日志（人工复盘、E2E 验证记录） | — |
| `spikes/` | spike 决策记录 | — |

## 提升流程（RFC 生命周期）

```
pools/drafts/xxx-draft.md（散落，无格式）
    ↓ oxn work create promote-xxx --type doc --blueprint doc-promote --domain DocEngineeringContext
    ↓ validate → lock → run → submit → finalize
.openxenon/docs/rfcs/xxx-rfc.md（确定性，不再改）
    ↓ 决策落地后
.openxenon/docs/adrs/00XX-xxx.md（append-only）
```

## 约定

- pools/ 内容 **可改可删**（流动层）
- 提升到 docs/ 必须 **走 Work（doc-promote blueprint）**，不能直接复制
- 多个 draft 可综合提升为一个 ADR/RFC（多对一映射）
