# `dev/versions/` — Roadmap 目录

> **情态**：描述性 Doc（前瞻性版本计划）
> **命名**：每个文件以 `0-X-Y-<slug>.md` 命名，对应一个未来版本的 Roadmap
> **frontmatter**：`version` / `date` / `type` / `status: planned`
> **锁定**：RFC-0013 D3（版本相关文档三情态分离）

## 目录说明

`dev/versions/` 存放 OXN 项目**前瞻性版本计划**——描述未来版本将包含什么。每个文件对应一个尚未发布的版本，按版本号命名（如 `0-7-0-emergence.md` 对应 0.7.0 版本计划）。

## 与 `.changes/` 的区别

| 维度 | `.changes/0-X-Y-*.md`（Version Fragment） | `dev/versions/0-X-Y-*.md`（Roadmap） |
|---|---|---|
| **情态** | 描述性 Doc（回顾性） | 描述性 Doc（前瞻性） |
| **时间向** | 版本转正后落盘 | 版本规划时落盘 |
| **状态** | `status: released` | `status: planned` |
| **可见性** | 公开（README + CHANGELOG.md 引用） | 开发者面向（不公开） |
| **引用边界** | 不引用 `.openxenon/` 内部路径 | 允许引用 `.openxenon/` 内部 RFC 草稿、sprint 设计稿 |
| **转正后** | — | **归档**（移到 `.openxenon/.archived/dev/versions/`，不删除） |

## 生命周期

1. **规划**：版本规划时创建 `dev/versions/0-X-Y-<slug>.md`，`status: planned`
2. **开发**：开发期间可迭代更新（添加 feature、补 RFC 引用）
3. **转正**：版本转正时（alpha → stable）：
   - 创建对应的 `.changes/0-X-Y-*.md`（Version Fragment）作为变更日志
   - 将 `dev/versions/0-X-Y-<slug>.md` 移到 `.openxenon/.archived/dev/versions/`（归档，不删除）
   - 归档目录保留历史 Roadmap 作为"该版本曾经规划了什么"的审计痕迹

## 命名约定

- 文件名：`0-X-Y-<slug>.md`（如 `0-7-0-emergence.md`）
- slug 用 kebab-case，描述版本主题（如 `emergence`、`ai-three-modes`、`anchor-slot`）
- 对应版本号：`0.X.Y`（X、Y 是 minor 和 patch 数字）

## 当前内容

| 版本 | 文件 | 主题 | 状态 |
|---|---|---|---|
| 0.7.0 | `0-7-0-emergence.md` | 涌现层骨架：Insight 工程化 + Hall v0.5 + Infra Ports | 📝 planned |
| 0.7.0 | `0-7-0-asset-graph.md` | Asset 关系图（Mermaid 渲染） | 📝 planned |
| 0.7.1 | `0-7-1-ai-three-modes.md` | AI 三模式（Edit/Plan/Apply） | 📝 planned |
| 0.7.2 | `0-7-2-anchor-slot.md` | Anchor slot 机制 | 📝 planned |
| 0.8.0 | `0-8-0-term-upstream-dag.md` | Term 上游 DAG | 📝 planned |

## 参考

- [RFC-0013 D3 版本相关文档三情态分离](../docs/rfc/zh-cn/RFC-0013-versioning-policy.md)
- [RFC-0013 D4 AssetMap ≠ Roadmap](../docs/rfc/zh-cn/RFC-0013-versioning-policy.md)
- `.changes/` 目录——回顾性 Version Fragment 存放处