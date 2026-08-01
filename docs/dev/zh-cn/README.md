# dev/ — OpenXenon 开发者操作指南

> 本目录是 OpenXenon 维护者 + 贡献者写给开发者看的操作手册，不是产品文档。
>
> 术语查询见 [术语表](/product/zh-cn/concepts/glossary.md)（RFC-0017 单一权威源）；架构说明见 [架构总览](./architecture.html)。

## 1. OpenXenon 文档分类

OpenXenon 的文档分 5 类（不使用"L1/L2/L3 三层架构"等内部术语）：

| 分类 | 物理位置 | 受众 |
|---|---|---|
| **Getting Started Guide** | `docs/product/zh-cn/introduction.md` + `quickstart.md` | 新用户 |
| **Developer Guide** | `docs/dev/zh-cn/` + 本 README | 贡献者 |
| **API Reference** | `docs/product/zh-cn/reference/` | 使用者 |
| **Architecture Guide** | `docs/dev/zh-cn/architecture.md` | 理解架构 |
| **Migration Guide** | `docs/product/zh-cn/changelog/` + `.changes/` | 升级用户 |
| **Glossary** | [`/product/zh-cn/concepts/glossary.md`](/product/zh-cn/concepts/glossary.md) | 全员（术语汇总，RFC-0017 单一权威源） |

> **dev/ 目录的文档不进 VitePress 构建**（仅作仓库内部手册）；其他 5 类进站点。

## 2. 当前内容

| 文件 | 用途 |
|---|---|
| `README.md`（本文件） | 开发者操作指南入口 |
| `_index.md` | 开发手册首页（站点入口） |
| `getting-started.md` | 入门（环境 + 仓库布局） |
| `architecture.md` | 架构总览（E1-E4 + L0-L3） |
| `monorepo.md` | Monorepo 双包（packages/cli + packages/engine） |
| `l0-l3-constitution.md` | L0-L3 宪法（依赖图 + 越界解读） |
| `oxn-cli.md` | OXN CLI 开发者手册 |
| `oxn-engine.md` | OXN Engine 开发者手册 |
| `extending/` | 扩展点（custom-probe / custom-part / dsl-extension / skill-authoring） |
| `three-tier-docs.md` | 三层文档守门（pre-commit hook） |
| `ai-collaboration.md` | AI 协作工作流 |
| `testing.md` | 测试策略 |
| `releasing.md` | 发布流程 |
| `debugging.md` | 调试指南 |
| `conventions.md` | 代码规范 |

## 3. 待建文档

| 主题 | 预期文件 | 触发时机 |
|---|---|---|
| 新贡献者入门 | `getting-started-dev.md` | 新人第一次 clone 仓库 |
| 本地开发流程 | `dev-workflow.md` | 多人协作时统一约定 |
| AI Agent 协作深入 | `ai-collaboration-deep.md` | 跨多人 + AI 时补充 |

> **新文件创建方式**：
> 1. 用 `oxn work create <work-name> --type doc --blueprint doc-dev-workflow` 走 IAP
> 2. 落地后 `git add dev/<filename> && git commit -m "docs(dev): add <title>"`
> 3. 更新本 README「当前内容」表

## 4. 与 doc-dev-workflow Blueprint 的关系

`doc-dev-workflow` 是 OXN Asset 系统中本目录专用的撰写 Blueprint（slot DAG），dev/ 目录是其"人类可读"对应物。`doc-dev-workflow` 通过 `## Use` 引用：

- **execution**：`@prj/workflows/doc-author`（6 slot：pick-domain → aggregate-terms → outline → author → validate → publish）
- **vocabulary**：`@prj/domains/oxn-engine-domain`, `oxn-asset-domain`, `oxn-domain`
- **implementation**：`@prj/stack/oxn-stack`

> **强约束**：`doc-author.validate` slot 校验产物禁止出现 `.openxenon/` 相对路径——dev/ 文档作为外部手册无法感知该目录。术语引用必须指向 [`/product/zh-cn/concepts/glossary.md`](/product/zh-cn/concepts/glossary.md)。

## 5. 术语与概念

dev/ 文档涉及的术语汇总见 [术语表](/product/zh-cn/concepts/glossary.md)（RFC-0017 单一权威源，按字母序排列 140 term）。

## 6. 版本

| 字段 | 值 |
|---|---|
| 创建 | 2026-07-09（最初 v0.6 落地） |
| 重构 | 2026-07-09（从「L2 独立开发文档区」收敛为「开发者操作指南专用入口」） |
| v0.7 适配 | 2026-07-18（移除三层文档架构，引入 5 段式 docs 分类 + glossary 术语汇集） |
