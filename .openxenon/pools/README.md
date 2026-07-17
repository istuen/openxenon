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

## 当前状态（2026-07-17 archive-mirror-structure 后）

| 目录 | 当前内容数 | 备注 |
|---|---|---|
| `drafts/` | 6 个活跃 | 53 篇历史 drafts 已迁 `.archived/pools/drafts/`(含 `2026-06/` 月份目录) |
| `issues/` | 3 个 | ISS-001/002/003 全部 ✅ Fixed 并已关闭 |
| `journals/` | 2 个活跃 | 4 篇历史 journals 已迁 `.archived/pools/journals/` |
| `spikes/` | 1 个（probe-converge，从 `.archived/pools/drafts/2026-06/` 修复归位） | 历史 spike |

**pools-audit-D4（2026-07-15）** 已完成：
- A：53 篇 drafts/_archive + 2 篇 rfcs/_archive + 1 篇 docs/_archive 提交归档
- B：ISS-002 重写为 ✅ Fixed（依据 commit `140f9f5` 重新审计 L0→L3 反向依赖已消除）
- C：3 篇 v0.3 journals 移入 `journals/_archive/`
- D：spikes/ 双层目录错位（`spikes/spikes/probe-converge/`）修复为单层 + 归位顶层

**archive-mirror-structure（2026-07-17）** 已完成：
- 把 D4 的 4 处 `_archive/` 子目录彻底清空迁移到 `.archived/pools/{drafts,journals}/`(共 57 篇)
- `.archived/pools/` 镜像 active 结构:空目录占位 `issues/` + `spikes/`
- 后续历史文档归档统一走 `.archived/`,不再用 `_archive/` 内嵌

## 约定

- pools/ 内容 **可改可删**（流动层）
- 提升到 docs/ 必须 **走 Work（doc-promote blueprint）**，不能直接复制
- 多个 draft 可综合提升为一个 ADR/RFC（多对一映射）
