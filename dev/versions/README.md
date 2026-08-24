# `dev/versions/` — 已绑版本 Roadmap 沉淀区（保留占位）

> **情态**：描述性 Doc（已绑版本 Roadmap 历史占位）
> **当前状态**：⚠️ **已停用**（保留目录作为版本号政策的历史锚点）

## 目录说明

`dev/versions/` 在 v0.4.0 / D5+ 之前用于存放**前瞻性版本计划文档**——每个 Roadmap 1:1 锁定一个未来版本号。v0.4.0 / D5+ 起，Roadmap 概念整体退役：

- **前瞻 intent** 移到 `dev/pool/` 的 Goal 层（无版本号、晚绑）
- **回顾记录** 移到 `.changes/0-X-Y-*.md` 的 Version 层（cut 时冻结）
- **`dev/versions/` README 已归档**到 `.openxenon/.archived/dev/versions/`

详见 [oxn-project-domain Inv12GoalVersionRename](../openxenon/assets/domains/oxn-project-domain.md#inv12goalversionrename) + [RFC-0026 Version 迭代重设计](../rfc/zh-cn/RFC-0026-version-iteration-redesign.md)。

## 为何保留此目录

虽然 Roadmap 概念已退役，目录本身保留有两个目的：

1. **历史溯源入口**——曾经存放在此目录的 10 个 Roadmap（2026-08-06 已回滚到 `dev/pool/`）的版本号政策可被外部检索到
2. **未来版本迭代模式可扩展性**——若未来出现 Goal / Version 之外的"已绑版本 Roadmap"需求（如季度战略文档、跨 Goal 的版本合并计划），此目录是物理锚点

## 当前内容

```
(目录保留作为占位；无 active 文件)
```

## 与 Goal / Version 的关系

| 维度 | `dev/versions/`（已退役） | `dev/pool/` Goal | `.changes/` Version |
|---|---|---|---|
| **情态** | 描述性 Doc（已绑版本前瞻） | 描述性 Doc（前瞻承诺）| 描述性 Doc（回顾记录）|
| **frontmatter `version` 字段** | ✅ 必填 | ❌ 无（晚绑）| ✅ 必填（cut 时分配）|
| **创建时机** | scheduling 时 | 开发前（commit 时）| cut 时（frozen-at-cut）|
| **可变性** | 可演进 | planned → in-progress → done → archived | frozen（cut 后不可变）|

## 归档触发

如需"已绑版本 Roadmap"专题文档：

1. 创建 `dev/versions/<slug>.md`（RFC-0013 D3 锁定情态）
2. frontmatter 必填：`version: 0.X.Y` / `theme` / `status` / `goals[]`
3. cut 后归档到 `.openxenon/.archived/dev/versions/<slug>.md`

## 参考

- [`oxn-project-domain.md#roadmapdeprecated`](../openxenon/assets/domains/oxn-project-domain.md#roadmapdeprecated) — Roadmap 退役历史
- [`dev/pool/README.md`](./../pool/README.md) — Goal 当前规划池
- [`.changes/`](./../../.changes/) — Version 回顾记录
- [`docs/rfc/zh-cn/RFC-0026-version-iteration-redesign.md`](../rfc/zh-cn/RFC-0026-version-iteration-redesign.md) — 总体设计