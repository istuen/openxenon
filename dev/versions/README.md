# `dev/versions/` — 已绑版本 Roadmap 目录

> **情态**：描述性 Doc（前瞻性已绑版本）
> **命名**：`0-X-Y-<slug>.md`（如 `0-7-0-emergence.md`）
> **frontmatter**：`version` / `date` / `type` / `status`
> **锁定**：RFC-0013 D3 + Errata 2026-07-27（grilling session 引入 `dev/pool/` 备选池）

## 目录说明

`dev/versions/` 存放**已绑版本**的 Roadmap——描述某具体未来版本将包含什么。每个文件对应一个尚未发布的版本，按版本号命名（如 `0-7-0-emergence.md` 对应 0.7.0 版本计划）。

## 与 `dev/pool/` `dev/meta/` 的关系

| 维度 | `dev/pool/` | `dev/versions/` | `dev/meta/` |
|---|---|---|---|
| **语义** | 备选池（无版本绑定）| 已绑版本（带 version 字段）| meta 文档（跨版本不变）|
| **何时入** | 工程师 mental commit | scheduling 决定时从 pool 移过来 | 跨版本不变的元信息 |
| **frontmatter** | `id` / `theme` / `priority` / `scheduled-version: ~` | `version: 0.X.Y` / `date` / `type` | `entity: dev-meta` / `type: meta` |

详细语义见 [`dev/pool/README.md`](../pool/README.md) 与 [`dev/meta/README.md`](../meta/README.md)。

## 生命周期

1. **scheduling**：工程师判定 `dev/pool/<slug>.md` 进入下一开发周期 → `git mv` 到 `dev/versions/0-X-Y-<slug>.md` + 补 version 字段
2. **开发**：开发期间可迭代更新（添加 feature、补 RFC 引用）
3. **转正**：版本转正时（alpha → stable）：
   - 创建对应的 `.changes/0-X-Y-*.md`（Version Fragment）作为变更日志
   - `git mv dev/versions/0-X-Y-<slug>.md .openxenon/.archived/dev/versions/`
   - 归档目录保留历史 Roadmap 作为"该版本曾经规划了什么"的审计痕迹

## 命名约定

- 文件名：`0-X-Y-<slug>.md`（如 `0-7-0-emergence.md`）
- slug 用 kebab-case，描述版本主题（如 `emergence`、`ai-three-modes`、`anchor-slot`）
- 对应版本号：`0.X.Y`（X、Y 是 minor 和 patch 数字）

## 当前内容

| 版本 | 文件 | 主题 | 状态 |
|---|---|---|---|
| 0.7.0 | `0-7-0-asset-graph.md` | Asset 影响图 + Hall v0.5 集成 | 📝 planned |
| 0.7.0 | `0-7-0-emergence.md` | 涌现层骨架：Insight 工程化 + Hall v0.5 + Infra Ports 扩展 | 📝 planned |
| 0.7.0 | `0-7-0-infra-ports.md` | Infra 扩展：ResourcePort / CachePort / WorkSnapshot | 📝 planned |
| 0.7.0 | `0-7-0-oxn-deprecation.md` | .oxn 切割：Langium 完整退役 + git rm 全量 .oxn + CLI 清理 | 📝 planned（baseline ship v0.6.1）|
| 0.7.0 | `0-7-0-work-unified-model.md` | Work 统一模型 + 引用收敛 + Round 改进 | 📝 planned |
| 0.7.1 | `0-7-1-ai-three-modes.md` | AI 三档监督模式（Guided / Adaptive / Unmanaged）| 📝 planned |
| 0.7.2 | `0-7-2-anchor-slot.md` | Insight Anchor + Slot 双向绑定 | 📝 planned |
| 0.8.0 | `0-8-0-term-upstream-dag.md` | Term 跨域物理引用 + `@upstream` DAG | 📝 planned |
| 0.8.1 | `0-8-1-probe-system-evolution.md` | Probe 体系演进（追溯 + 内外拆 + 目标成果分类）| 📝 planned |

## 参考

- RFC-0013 D3 版本相关文档三情态分离 + Errata 2026-07-27（规划池补充）
- RFC-0013 D4 AssetMap ≠ Roadmap
- [`dev/pool/README.md`](../pool/README.md) —— 备选池定义
- [`dev/meta/README.md`](../meta/README.md) —— meta 文档定义
- `.openxenon/assets/domains/oxn-project-domain.md#planning-pool` —— 本术语权威定义