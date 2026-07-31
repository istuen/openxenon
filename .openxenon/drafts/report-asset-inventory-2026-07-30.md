# Report: `.openxenon/assets/` Asset 清单与结构分析

- **DraftType**: report（调研报告）
- **创建日期**: 2026-07-30
- **触发场景**: scene=explore → workflow=`explore-analyze-report`
- **数据源**: `find .openxenon/assets -name "*.md"` + frontmatter 扫描

## TL;DR

`.openxenon/assets/` 当前共 **31 个 active Asset**（无 archived），覆盖 **5 类 AssetKind**（blueprints/domains/roadmaps/stacks/workflows 全集）。Domain 9 个为术语权威源，Workflow 15 个为操作手册，两者数量合计占 77%。Domain 与 Workflow 各有明显版本分化（v0.4.x vs v1.1.0），表明 v0.6.2 处于"核心域稳定 + 工作流持续细化"的过渡期。

---

## 1. 总量与分布

| AssetKind | 数量 | 占比 | 文件位置 |
|---|---:|---:|---|
| blueprints | 5 | 16.1% | `.openxenon/assets/blueprints/` |
| domains | 9 | 29.0% | `.openxenon/assets/domains/` |
| roadmaps | 1 | 3.2% | `.openxenon/assets/roadmaps/` |
| stacks | 1 | 3.2% | `.openxenon/assets/stacks/` |
| workflows | 15 | 48.4% | `.openxenon/assets/workflows/` |
| **合计** | **31** | **100%** | — |

**观察**：5 类全部覆盖（无空类）。Workflow 接近半数，Roadmap/Stack 各 1 个（与"单一系统级入口"的设计一致）。

---

## 2. 完整清单（按 AssetKind 分组）

### 2.1 blueprints（5 个）— 4 条 Promote 通道 + 1 自描述

| 文件 | version | 用途 |
|---|---:|---|
| `asset-workflow.md` | 0.2.0 | Draft → Asset 提升通道 |
| `doc-dev-workflow.md` | 0.2.0 | Draft → `docs/dev/` 通道 |
| `doc-prod-workflow.md` | 0.3.0 | Draft → `docs/product/` 通道 |
| `doc-rfc-workflow.md` | 0.3.0 | Draft → `docs/rfc/` 通道 |
| `oxn-blueprint.md` | 0.3.0 | Blueprint 自身定义（自描述） |

### 2.2 domains（9 个）— 系统术语单一权威源

| 文件 | version | 覆盖范围 |
|---|---:|---|
| `oxn-asset-domain.md` | 0.3.0 | Asset 生命周期（5 AssetKind + 状态机） |
| `oxn-cli-domain.md` | 0.4.2 | CLI 子命令架构（`oxn` 命令面） |
| `oxn-domain.md` | 0.4.1 | OXN 范式总览（Domain 自身的 Domain） |
| `oxn-draft-domain.md` | 0.1.0 | Draft 状态机（active/archived/discarded） |
| `oxn-engine-domain.md` | 0.4.2 | Engine 内核（kernel/infra/oxl/l0-l2） |
| `oxn-insight-domain.md` | 0.2.0 | Insight 池（approved/applied/archived） |
| `oxn-project-domain.md` | 0.2.0 | 工程术语（Dev/Project 域） |
| `oxn-proof-domain.md` | 0.2.2 | Proof 验证闭环（frozen.json） |
| `oxn-work-domain.md` | 0.2.2 | Work 编排（IAP 三阶段） |

### 2.3 roadmaps（1 个）— AI Agent 路由入口

| 文件 | version | 说明 |
|---|---:|---|
| `oxn-system.md` | 3 | 覆盖 6 scene（doc/dev/debug/test/release/onboard），是 `oxn roadmap suggest` 的查询目标 |

### 2.4 stacks（1 个）— 技术栈声明

| 文件 | version | 说明 |
|---|---:|---|
| `oxn-stack.md` | 0.1.0 | Bun（构建/测试）+ pnpm（依赖）+ Biome（格式）+ ESLint（架构守卫）+ lefthook（hook）+ VitePress（文档站点） |

### 2.5 workflows（15 个）— 操作手册

**v1.1.0 主力批次（11 个）**：

| 文件 | 用途 |
|---|---|
| `add-cli-subcommand.md` | 新增 `oxn` 子命令 |
| `asset-archive.md` | Asset 归档（移到 `.openxenon/.archived/`） |
| `asset-create.md` | Asset 创建 |
| `asset-evolve.md` | Asset 演进（版本升级） |
| `explore-analyze-report.md` | 调研报告（本 Draft 触发场景） |
| `fix-issue.md` | 问题修复（含 frozen 异常） |
| `git-workflow.md` | 分支/PR/commit 规范 |
| `migrate-version.md` | 版本迁移（含 breaking change） |
| `refactor-safe.md` | 重构安全检查 |
| `release-cut.md` | 发版切版本号 |
| `ts-retrieve-design-develop-test.md` | 三阶段：检索 → 设计 → 开发 → 测试 |

**v0.x 早期批次（4 个）— 待演进**：

| 文件 | version | 状态 |
|---|---:|---|
| `dev-workflow.md` | 0.2.0 | 通用开发流程 |
| `doc-author.md` | 0.2.0 | 文档编写 |
| `doc-publish.md` | 0.4.0 | 文档发布（VitePress 部署） |
| `oxn-workflow.md` | 0.2.0 | OXN 通用工作流 |

---

## 3. 版本演进分析

### 3.1 Domain 层版本分布

```
0.1.0  ▓         oxn-draft-domain (v0.6.2 新增)
0.2.0  ▓▓▓       oxn-insight-domain, oxn-project-domain
0.2.2  ▓▓        oxn-proof-domain, oxn-work-domain
0.3.0  ▓         oxn-asset-domain
0.4.1  ▓         oxn-domain
0.4.2  ▓▓        oxn-cli-domain, oxn-engine-domain
```

**观察**：
- 最新前沿：0.4.2（CLI + Engine，与 monorepo 双包结构同步）
- 稳定层：0.2.x（Proof/Work/Insight/Project — 早期概念已收敛）
- 新生层：0.1.0（Draft，v0.6.2 才引入）

### 3.2 Workflow 层代际差异

```
v0.2.0  ▓▓▓  dev-workflow, doc-author, oxn-workflow   (早期通用流程)
v0.4.0  ▓    doc-publish                                  (VitePress 集成)
v1.1.0  ▓▓▓▓▓▓▓▓▓▓▓  11 个细粒度操作                    (v0.6.x 重构后)
```

**观察**：v1.1.0 批次明显是 v0.6.x monorepo 拆分后的批量升级产物——粒度更细、覆盖更全（11 个 vs 早期 3 个）。遗留的 v0.2.0 三个通用流程（`dev-workflow` / `doc-author` / `oxn-workflow`）要么被 v1.1.0 细分取代，要么需要演进到统一版本号规范。

---

## 4. 命名规范

**项目域 Asset**（domain/blueprint/roadmap/stack）：统一 `oxn-{kind}-{name}.md`
- 例：`oxn-asset-domain.md`、`oxn-blueprint.md`、`oxn-system.md`

**Workflow 域**：贴近操作动词 `{verb}-{noun}.md`
- 例：`add-cli-subcommand.md`、`fix-issue.md`、`release-cut.md`

**收益**：命名一致性使 AI Agent 路由匹配 scene 时无需模糊猜测——`doc-*` 一律走 doc scene，`fix-*` 一律走 debug scene。

---

## 5. 关键发现与后续建议

### 5.1 健康度
- ✅ 5 类 AssetKind 全覆盖，无缺失类
- ✅ 无 archived 资产（说明生命周期健康，无废弃积累）
- ✅ Domain 层版本号反映实际演进节奏

### 5.2 待办候选（可走 `oxn asset evolve`）

1. **v0.2.0 workflow 升级**：`dev-workflow` / `doc-author` / `oxn-workflow` 是否与 v1.1.0 批次合并/废弃？
2. **Domain 版本对齐**：`oxn-proof-domain` 0.2.2 与 `oxn-work-domain` 0.2.2 是历史遗留双胞胎，是否随 v0.6.x 重构升到 0.4.x？
3. **Roadmap 版本号统一**：roadmap 用整数 `3`，与其他类 semver 不一致，是否在 RFC-0013 versioning-policy 中给出例外规则？

### 5.3 本报告的下一步

按 Promote 规则（`report` 类型推荐目标 = Doc(prod) / Doc(dev)）：

- 若用户认可 → 走 `oxn work create --blueprint doc-dev-workflow` 晋升为开发者文档，落 `docs/dev/zh-cn/asset-catalog.md`
- 若仅为一次性参考 → 归档到 `.openxenon/drafts/.archived/` 即可

**与 §5.2 候选名单的关系**：§5.2 列出的 4 个 v0.x workflow 候选（`dev-workflow` / `doc-author` / `doc-publish` / `oxn-workflow`）走独立的 `oxn asset evolve` 路径，**与本报告本体晋升是两件事**——前者是修改既有 Asset 的 version 号，后者是把 Draft 提升为 SSOT 文档。

---

## 附：原始采集命令

```bash
ls .openxenon/assets/                                    # 5 类目录
ls .openxenon/assets/{blueprints,domains,...}/*.md       # 31 文件
head -3 .openxenon/assets/**/*.md                        # frontmatter
awk '/^# /' .openxenon/assets/**/*.md                    # H1 title
```