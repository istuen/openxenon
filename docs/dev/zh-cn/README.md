# dev/ — OpenXenon 消费者开发者手册（站点入口）

> **入口定位**：本目录是 OpenXenon **消费者**的开发者手册——回答"如何用 OXN 开发**你的项目**"。
>
> **与 root `dev/` 的边界**：见 [oxn-project-domain Inv15DevGuideInterface](../assets/domains/oxn-project-domain.md#inv15devguideinterface)。root `dev/` = OXN 项目自身 meta 手册（如何开发 OXN 本身）；本目录 = OXN 消费者手册（如何用 OXN 开发项目）。
>
> **术语查询**：[术语表](/openxenon/product/zh-cn/concepts/glossary.html)（RFC-0017 单一权威源）；**架构说明**：[架构总览](./architecture.html)。

## 1. OpenXenon 文档分类

OpenXenon 的对外文档分 5 类（不使用 L1/L2/L3 三层架构等内部术语）：

| 分类 | 物理位置 | 受众 |
|---|---|---|
| **Getting Started Guide** | [`docs/product/zh-cn/introduction.md`](./../../product/zh-cn/introduction.html) + [`quickstart.md`](./../../product/zh-cn/quickstart.html) | 新用户 |
| **Developer Guide** | `docs/dev/zh-cn/` + 本 README | 贡献者 |
| **API Reference** | [`docs/product/zh-cn/reference/`](./../../product/zh-cn/reference/) | 使用者 |
| **Architecture Guide** | [`docs/dev/zh-cn/architecture.md`](./architecture.html) | 理解架构 |
| **Migration Guide** | [`docs/product/zh-cn/changelog/`](./../../product/zh-cn/changelog/) + [`.changes/`](./../../../changes/) | 升级用户 |
| **Glossary** | [`docs/product/zh-cn/concepts/glossary.md`](./../../product/zh-cn/concepts/glossary.html) | 全员（RFC-0017 单一权威源） |

> **dev/ 目录的文档不进 VitePress 构建**（仅作仓库内部手册）；其他 5 类进站点。

## 2. 当前内容

| 文件 | 用途 |
|---|---|
| `README.md`（本文件） | 消费者开发者手册入口 |
| [`_index.md`](./_index.html) | 开发手册首页（站点入口） |
| [`getting-started.md`](./getting-started.html) | 入门（环境 + 仓库布局） |
| [`architecture.md`](./architecture.html) | 架构总览（E1-E4 + L0-L3） |
| [`monorepo.md`](./monorepo.html) | Monorepo 双包（packages/cli + packages/engine） |
| [`asset-structure-v2.md`](./asset-structure-v2.html) | Asset 结构 v2 Schema（Group / Axiom / Theorem 三层模型） |
| [`l0-l3-constitution.md`](./l0-l3-constitution.html) | L0-L3 宪法（依赖图 + 越界解读） |
| [`oxn-cli.md`](./oxn-cli.html) | OXN CLI 开发者手册 |
| [`oxn-engine.md`](./oxn-engine.html) | OXN Engine 开发者手册 |
| [`extending/`](./extending/custom-probe.html) | 扩展点（custom-probe / custom-part / dsl-extension / skill-authoring） |
| [`three-tier-docs.md`](./three-tier-docs.html) | 三层文档守门（pre-commit hook） |
| [`ai-collaboration.md`](./ai-collaboration.html) | AI 协作工作流 |
| [`testing.md`](./testing.html) | 测试策略 |
| [`releasing.md`](./releasing.html) | 发布流程 |
| [`debugging.md`](./debugging.html) | 调试指南 |
| [`conventions.md`](./conventions.html) | 代码规范 |
| [`error-code-registry.md`](./error-code-registry.html) | 错误码注册表 |

## 3. 待建文档

| 主题 | 预期文件 | 触发时机 |
|---|---|---|
| 新贡献者入门 | `getting-started-dev.md` | 新人第一次 clone 仓库 |
| 本地开发流程 | `dev-workflow.md` | 多人协作时统一约定 |
| AI Agent 协作深入 | `ai-collaboration-deep.md` | 跨多人 + AI 时补充 |

> **新文件创建方式**：
> 1. 用 `oxn work create <work-name> --type doc --blueprint doc-dev-workflow` 走 IAP
> 2. 落地后 `git add docs/dev/zh-cn/<filename> && git commit -m "docs(dev): add <title>"`
> 3. 更新本 README「当前内容」表

## 4. 与 doc-dev-workflow Blueprint 的关系

`doc-dev-workflow` 是 OXN Asset 系统中本目录专用的撰写 Blueprint（slot DAG）。`doc-dev-workflow` 通过 `## Use` 引用：

- **execution**：`@prj/workflows/doc-author`（6 slot：pick-domain → aggregate-terms → outline → author → validate → publish）
- **vocabulary**：`@prj/domains/oxn-engine-domain`, `oxn-asset-domain`, `oxn-domain`
- **implementation**：`@prj/stack/oxn-stack`

> **强约束**：`doc-author.validate` slot 校验产物禁止出现 `.openxenon/` 相对路径——dev/ 文档作为外部手册无法感知该目录。术语引用必须指向 [`glossary.md`](./../../product/zh-cn/concepts/glossary.html)。

## 5. OXN 项目自身 meta 流转

- **Goal 入池 / Version cut / Release 流程 / Asset 自身修改**：见 root [`dev/`](./../../dev/)（属 OXN 项目自身维护者手册）
- **本仓库 RFC / ADR 索引**：见 [`docs/rfc/zh-cn/`](./../rfc/zh-cn/) + [`docs/adrs/`](./../adrs/)

## 6. 术语与概念

dev/ 文档涉及的术语汇总见 [术语表](/openxenon/product/zh-cn/concepts/glossary.html)（RFC-0017 单一权威源）。