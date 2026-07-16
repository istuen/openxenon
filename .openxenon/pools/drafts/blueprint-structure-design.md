# Blueprint 结构重组设计（探索稿）

> **状态**：Draft（探索稿 · Pool）
> **日期**：2026-07-14
> **触发**：在 two-layer-proof-design.md §六「边界 → Probe 统一映射模型」基础上，进一步设计 Blueprint 如何用 Boundary 衔接三边界到 Work
> **定位**：产品层设计 + 语法结构重组方案（面向产品 / 用户视角，附带与当前实现的差距分析）
> **落点**：本稿为 Pool 探索稿；定稿后走 `oxn work create blueprint-structure --blueprint doc-promote` 提升为 `docs/zh-cn/asset.md` + `docs/zh-cn/work.md` 的补充章节
> **素材来源**：代码调研（`packages/engine/src/oxl/md-bridge/compilers/` + `oxl/md-pipeline/transformers/` + `Work/work-manager.ts` + `Work/work-skeleton.ts` + `Work/per-work-blueprints-merger.ts`）+ `docs/zh-cn/{asset,work,asset-paper,core-concepts}.md` + ADR-0054/0055/0056 + `.openxenon/assets/` 实际文件

---

## 一、设计背景

### 1.1 当前问题

| 问题 | 现状 | 证据 |
|---|---|---|
| Blueprint 文件不存在 | `assets/blueprints/` 目录为空（只有 .gitkeep） | `ls .openxenon/assets/blueprints/` |
| BlueprintIR 无 Refs 字段 | `BlueprintIR` 只有 `props + slots`，不提取 Refs | `transformers/blueprint.ts:33-41` |
| Work 直接引用 Workflow | Work 的 `## Refs` 指向 `@prj/workflows/`，不经 Blueprint | `work-skeleton.ts:62-66` |
| Workflow 承担编排 + 步骤 | Workflow 有 slot 名 + deps + observe，职责过重 | `assets/workflows/fix-issue.md` |
| Stack 完全缺失 | `assets/stacks/` 目录不存在，Stack 无下游消费 | `ls .openxenon/assets/stacks/` → 不存在 |
| observe 不执行 | Workflow observe 只用于 E4 覆盖率分析，不触发 Probe | `pipeline-compute.ts:164-197` |
| 三边界未组合 | Domain / Workflow / Stack 各自独立存在，无组合层 | ADR-0055 设计了但未落地 |

### 1.2 设计目标

Blueprint 用 **Boundary** 作为编排单元，衔接三边界到 Work：

- **Domain / Workflow / Stack 保持独立 Asset**——可复用、可演化
- **Blueprint 用 Boundary 编排**——替代当前 Slot 的编排角色，Boundary 引用 1-3 个边界 + 自带 observe + deps
- **Workflow 退化为步骤定义**——只剩 slot 名 + desc，无 deps 无 observe
- **observe 统一到 Boundary**——Domain / Stack 不带 observe，Probe 声明只在 Blueprint Boundary 层

---

## 二、四个结构决策

### 2.1 Domain / Workflow / Stack 保持独立 Asset

三边界不合并，各自独立 .md 文件，保持可复用性。

| 边界 | 角色 | 层级 |
|---|---|---|
| Domain | 业务顶层设计——做什么、说什么、约束什么 | terms / ban / invariant |
| Workflow | 步骤定义——分几步做、每步做什么 | slot 名 + desc |
| Stack | 技术实现——用什么工具、什么格式、什么环境 | tools |

### 2.2 Blueprint 用 Boundary 替代 Slot

Boundary = Blueprint 内的编排单元，替代当前的 Slot。

| | 当前 Slot（在 Workflow 里） | 重组后的 Boundary（在 Blueprint 里） |
|---|---|---|
| 位置 | Workflow .md 的 `## Slots` | Blueprint .md 的 `## Boundaries` |
| 引用边界 | 不引用（Workflow 独立存在） | 引用 1-3 个 Domain/Workflow/Stack |
| observe | 有（但当前不执行） | 有（Probe 类型清单，统一在这） |
| deps | 有（slot 间依赖） | 有（Boundary 间依赖） |
| 跟 Task 的关系 | slot → Task | Boundary → Task |

**关键变化**：编排权从 Workflow 上移到 Blueprint。Workflow 退化为"步骤说明书"，Blueprint 用 Boundary 编排步骤并绑定边界。

### 2.3 Workflow 去 deps 去 observe

Workflow 只保留 slot 名 + desc：

| 字段 | 当前 | 重组后 |
|---|---|---|
| slot 名 | ✅ 保留 | ✅ 保留 |
| desc | ✅ 保留 | ✅ 保留 |
| deps | ✅ 有 | ❌ 删除（移到 Blueprint Boundary） |
| observe | ✅ 有 | ❌ 删除（移到 Blueprint Boundary） |

**理由**：
- 单一 deps 源——deps 只在 Blueprint Boundary 层定义，无矛盾风险
- Workflow 只定义"有哪些步骤、每步做什么"，不定义"怎么编排"
- Blueprint 是编排者——Boundary 的 deps 定义编排顺序

### 2.4 observe 统一到 Blueprint Boundary

三边界都不带 observe，Probe 声明统一在 Blueprint 的 Boundary 里：

| Asset | 当前 observe | 重组后 |
|---|---|---|
| Domain invariant | 曾提议加 `probes` 字段 | ❌ 不加——Domain 只做业务约束 |
| Workflow slot | 有 `observe` | ❌ 删除——Workflow 只做步骤定义 |
| Stack tools | 隐含 catalog 映射 | ❌ 不加 observe——Stack 只声明工具 |
| **Blueprint Boundary** | — | ✅ **唯一声明 observe 的地方** |

**理由**：Boundary 是唯一声明"这个编排单元用什么 Probe 验证"的地方。三边界只提供约束和工具，怎么验证由 Blueprint 编排决定。

---

## 三、语法统一规则

### 3.1 Use 替代 Refs

Blueprint / Work / Task 的 `## Refs` 改为 `## Use`。

**理由**：`## Refs` 的语义是"使用模板来源"，不是论文引用。跟 frontmatter 的 `references`（论文引用 DAG）语义不同，不该用同一个词。

| 层 | 引用类型 | 命名 | 位置 |
|---|---|---|---|
| 所有 Asset | 论文引用（DAG + citations） | `references` | frontmatter |
| Blueprint / Work / Task | 使用模板来源 | `## Use` | H2 头部 |
| Blueprint Boundary 内部 | 引用哪些边界 | `refs:` | 字段级（Boundary 内） |
| Proof / Task 的 Probe | 引用哪个 Probe | `ref:` | 字段级（Probe 内） |

### 3.2 Use 位置统一到头部

所有实体的 `## Use` 统一在正文最前面（frontmatter 之后第一个 H2）：

```
Blueprint:  frontmatter → ## Use → ## Boundaries
Work:       frontmatter → ## Use → ## Context → ## Tasks
Task:       frontmatter → ## Use → ## Parts → ## Probes
```

**理由**：先声明依赖再看内容，符合自顶向下阅读习惯；跟 frontmatter 对齐——元信息 → 依赖信息 → 正文。

### 3.3 references 在 frontmatter（仅无 Use 的 Asset）

`references` 是**没有 `## Use` 的 Asset**（Domain / Workflow / Stack）的跨 Asset 引用方式，用于构建引用 DAG + citations 自动计算。

**有 `## Use` 的 Asset**（Blueprint / Work / Task）不需要 frontmatter `references`——`## Use` 就是它的引用声明，更具体（带 `@prj/` 路径）。

| Asset | 有 `## Use` 吗 | 跨 Asset 引用什么方式 |
|---|---|---|
| Domain | ❌ 没有 | `references`（frontmatter） |
| Workflow | ❌ 没有 | `references`（frontmatter，可选） |
| Stack | ❌ 没有 | `references`（frontmatter） |
| Blueprint | ✅ 有 | `## Use`（不需要 `references`） |
| Work | ✅ 有 | `## Use`（不需要 `references`） |
| Task | ✅ 有 | `## Use`（不需要 `references`） |

Domain / Stack 的 `references` 示例：

```yaml
---
entity: domain
name: DocDomain
references:
  - asset: CommonContext       # 引用另一个 Domain
citations: 0                   # 自动维护
---
```

### 3.4 external 并入 references

当前 Domain / Workflow 有 `## Externals` H2 分类（ADR-0056 已 Superseded ADR-0048）。external 的本质是"引用外部非 Asset 资源"——跟 Asset 引用统一到 frontmatter 的 `references`，用 `url:` 区分：

```yaml
references:
  - asset: CommonContext          # Asset 引用
  - url: https://axios.com/docs    # 外部引用
  - url: https://github.com/xxx   # 外部引用
```

不需要单独的 `## Externals` H2 分类。

### 3.5 命名统一表

| 层 | 引用类型 | 命名 | 位置 | 范围 |
|---|---|---|---|---|
| 无 `## Use` 的 Asset | 论文引用（DAG + citations） | `references` | frontmatter | Domain / Workflow / Stack |
| Blueprint / Work / Task | 使用模板来源 | `## Use` | H2 头部 | Blueprint / Work / Task |
| Blueprint Boundary 内部 | 引用哪些边界 | `refs:` | 字段级（Boundary 内） | Domain / Workflow / Stack |
| Probe | 引用哪个 Probe | `ref:` | 字段级（Probe 内） | `@oxn/probes/*` |

---

## 四、Stack 合并

### 4.1 Runtimes / Linters / Tests 合并为 Tools

当前 Stack 有三个 H2 分类：`## Runtimes` / `## Linters` / `## Tests`（+ `## Externals`）。合并为 `## Tools`：

```markdown
## Tools

### markdown
- format: md
- encoding: utf-8

### markdownlint
- ruleset: .markdownlintrc

### link-check
- check: internal
```

### 4.2 无 role 分类

不保留 `role: runtime` / `role: linter` / `role: tester` 字段。catalog 自己知道映射——`markdown` 在 catalog 里没有对应 Probe（它只是格式声明），`markdownlint` 映射到 `lint-check`，`bun-test` 映射到 `test-pass`。

**理由**：Stack 只声明"用什么工具"，工具类型由 catalog 映射时自动识别。不需要 Stack 自己分类。

---

## 五、各边界 reference 归属

`references`（frontmatter）是所有 Asset 的通用能力。各边界是否需要：

| Asset | 需要 `references` 吗 | 为什么 |
|---|---|---|
| **Domain** | ✅ 需要 | Domain 引用其他 Domain——如 `PaymentContext` 引用 `CommonContext`（共享术语） |
| **Stack** | ✅ 需要 | Stack 引用其他 Stack——如 `react-ts` 引用 `node-ts`（React 技术栈建立在 Node 之上） |
| **Workflow** | ⚠️ 可选 | Workflow 是步骤定义，通常不引用其他 Workflow。但可能引用"基础 Workflow" |
| **Blueprint** | ❌ 不需要 | 有 `## Use` 声明引用的边界，不需要 frontmatter `references` |
| **Work** | ❌ 不需要 | 有 `## Use` 声明引用的 Blueprint |
| **Task** | ❌ 不需要 | 有 `## Use` 声明引用的 Blueprint + Boundary |

---

## 六、完整 Doc 示例

以"创建 API 参考文档"为例，展示重组后的完整语法。

### 6.1 Domain

```markdown
---
entity: domain
version: 0.3.0
name: DocDomain
references:
  - asset: CommonContext
citations: 0
---

# Domain: DocDomain

> 文档创建限界上下文：约束文档的内容规范、统一术语、不变量

## Terms

### DocGuide
- desc: 对外文档指南 — 介绍产品功能与用法的面向用户的文档

### ApiReference
- desc: API 参考文档 — 描述接口、参数、返回值的面向开发者的文档

### Section
- desc: 文档章节 — 文档内的 H2 级结构单元

## Bans

### forbidden-words
- items:
  - 手册
  - 说明书
  - Tutorial
- desc: 禁止使用"手册""说明书""Tutorial"等过时术语，统一用"文档"

## Invariants

### inv-doc-exists
- value: 交付的文档必须存在于 docs/ 目录下

### inv-has-api-section
- value: 文档必须包含 API 参考 section

### inv-no-placeholder
- value: 文档内容不能包含 TODO 或占位符文本
```

### 6.2 Workflow

```markdown
---
entity: workflow
version: 1
name: create-doc
---

# Workflow: create-doc

> 创建文档流程的步骤定义

## Slots

### outline
- desc: 规划文档大纲，确定章节结构和覆盖范围

### write
- desc: 按大纲编写文档正文，填充各章节内容

### validate
- desc: 校验文档格式、链接完整性、术语合规

### publish
- desc: 发布文档到 docs/ 目录，确认可访问
```

### 6.3 Stack

```markdown
---
entity: stack
version: 0.3.0
name: markdown-docs
references:
  - asset: node-ts
citations: 0
---

# Stack: markdown-docs

> Markdown 文档技术栈

## Tools

### markdown
- format: md
- encoding: utf-8

### markdownlint
- ruleset: .markdownlintrc

### link-check
- check: internal
```

### 6.4 Blueprint

```markdown
---
entity: blueprint
version: 1
name: create-doc-md
---

# Blueprint: create-doc-md

> 创建 Markdown 文档的编排模板：DocDomain + create-doc + markdown-docs

## Use
- domain: DocDomain @prj/domains/DocDomain
- workflow: create-doc @prj/workflows/create-doc
- stack: markdown-docs @prj/stacks/markdown-docs

## Boundaries

### outline
- refs:
  - workflow: create-doc
- observe:
  - fs-exists
- deps: []

### write
- refs:
  - domain: DocDomain
  - workflow: create-doc
  - stack: markdown-docs
- observe:
  - fs-content-match
- deps:
  - outline

### validate
- refs:
  - domain: DocDomain
  - workflow: create-doc
  - stack: markdown-docs
- observe:
  - fs-exists
  - fs-content-match
- deps:
  - write

### publish
- refs:
  - workflow: create-doc
  - stack: markdown-docs
- observe:
  - fs-exists
- deps:
  - validate
```

### 6.5 Work

```markdown
---
entity: work
version: 0.7.0
name: create-api-guide
---

# Work: create-api-guide

## Use
### create-doc-md
- kind: blueprint
- ref: @prj/blueprints/create-doc-md

## Context
### main
- goal: 创建 API 参考文档，放在 docs/zh-cn/api-reference.md
- max_iterations: 3
- constraints:
  - 文档必须包含 API 参考 section
  - 禁止使用"手册""说明书"等术语
  - 文档路径必须在 docs/ 目录下

## Tasks
### outline
- blueprint: create-doc-md
- boundary: outline
- skill_context: 规划 API 参考文档大纲，确定章节结构

### write
- blueprint: create-doc-md
- boundary: write
- skill_context: 按大纲编写 API 参考文档正文，确保包含 API 参考 section

### validate
- blueprint: create-doc-md
- boundary: validate
- skill_context: 校验文档格式、链接完整性、术语合规

### publish
- blueprint: create-doc-md
- boundary: publish
- skill_context: 发布文档到 docs/zh-cn/api-reference.md
```

### 6.6 Task

```markdown
---
entity: task
version: 0.7.0
name: write
---

# Task: write

## Use
- blueprint: create-doc-md
- boundary: write

## Parts
### implement
- skill_context: 按大纲编写 API 参考文档正文，填充各章节内容，确保包含 API 参考 section

## Probes
### doc-has-api-section
- ref: @oxn/probes/fs-content-match
- params:
  - path: docs/zh-cn/api-reference.md
  - contains: ## API 参考

### no-placeholder
- ref: @oxn/probes/fs-content-match
- params:
  - path: docs/zh-cn/api-reference.md
  - contains: TODO
```

### 6.7 Proof

```markdown
---
entity: proof
version: 0.7.0
name: doc-proof
proofs-target-work: create-api-guide
---

# Proof: doc-proof

> 验证 API 参考文档创建结果

## Description
### primary
- value: 验证文档存在、包含 API 参考 section、无占位符

## Probes
### doc-exists
- ref: @oxn/probes/fs-exists
- params:
  - path: docs/zh-cn/api-reference.md

### doc-has-api-section
- ref: @oxn/probes/fs-content-match
- params:
  - path: docs/zh-cn/api-reference.md
  - contains: ## API 参考
```

---

## 七、信息流总结

```
Domain（独立 Asset）       Workflow（独立 Asset）      Stack（独立 Asset）
  terms/ban/invariant        slot 名 + desc              tools
  （无 observe）             （无 deps，无 observe）      （无 observe）
  references: DAG            references: 可选            references: DAG
  （frontmatter）            （frontmatter）             （frontmatter）
       │                          │                          │
       └──────────┬───────────────┴──────────────────────────┘
                  │
            Blueprint（编排模板 · Asset）
            ## Use（引用三边界，不需要 references）
            ## Boundaries
              ### write
                refs: [domain, workflow, stack]     ← 引用哪些边界
                observe: [fs-content-match]         ← Probe 类型统一在这
                deps: [outline]                     ← deps 统一在这
                  │
                  ↓
            Work create 时：
            Blueprint Boundaries → Task 骨架
            每个 Boundary 的 refs → 该 Task 可用的边界约束
            每个 Boundary 的 observe → 该 Task 的 Probe 类型清单
            每个 Boundary 的 deps → Task DAG
                  │
                  ↓
            AI Agent 编排：
            从 observe 选 Probe + 设参数（AI 知道执行了什么）
            可自由调整（增删 Task / Probe）
                  │
                  ↓
            Engine 执行：
            跑 Probe（用 AI Agent 设的参数）
            Kernel 判定（标准对 AI 不可见）
            产出 Verdict
```

**核心收敛**：
- Domain = 业务约束（给 AI 上下文）
- Workflow = 步骤定义（slot 名 + desc，无 deps 无 observe）
- Stack = 技术工具（tools，无 observe）
- Blueprint = 编排模板（Boundary 带 refs + observe + deps）
- Work = 引用 Blueprint + 声明 Intent
- Task = AI Agent 设 Probe 参数 + 执行
- Proof = Engine 跑 Probe → Verdict

---

## 八、与当前实现的差距

| 目标 | 现状 | 需要的改动 |
|---|---|---|
| Blueprint 文件存在 | `assets/blueprints/` 为空 | 创建 Blueprint .md 文件 |
| BlueprintIR 有 Refs 字段 | 只有 `props + slots` | 扩展 BlueprintIR 加 `use` + `boundaries` 字段 |
| Blueprint 有 `## Boundaries` | 不存在（只有 `## Slots`） | 新增 Boundary 解析（refs + observe + deps） |
| Blueprint 有 `## Use` | 不存在（`## Refs` regex 不匹配 .md） | 新增 Use 解析（domain / workflow / stack ref） |
| Work 引用 Blueprint | Work 直接引用 Workflow | Work 的 `## Use` 指向 `@prj/blueprints/` |
| Work 的 `## Refs` → `## Use` | 当前叫 `## Refs` | 改名 |
| Task 的 `## Refs` → `## Use` | 当前叫 `## Refs` | 改名 |
| Task 有 `boundary` 字段 | 当前只有 `blueprint` + `part` | 新增 `boundary` 字段 |
| Workflow 去 deps | 当前 slot 有 deps | 删除 slot.deps（移到 Blueprint Boundary） |
| Workflow 去 observe | 当前 slot 有 observe | 删除 slot.observe（移到 Blueprint Boundary） |
| Stack 合并 Tools | 当前 Runtimes/Linters/Tests 三个 H2 | 合并为 `## Tools` |
| Stack 目录存在 | `assets/stacks/` 不存在 | 创建目录 + Stack .md 文件 |
| Domain `## Externals` 删除 | 当前 Domain 有 Externals H2 | 删除（external 并入 frontmatter references） |
| `references` 在 frontmatter | v0.6.3 设计但未全面落地 | Domain/Workflow/Stack 的 frontmatter 支持 references + citations（Blueprint/Work/Task 不需要，用 `## Use`） |
| Boundary observe → Task Probe | observe 不自动注入 | Work create 时从 Boundary observe 生成 Task 可用 Probe 清单 |
| Boundary refs → 边界约束传递 | 不存在 | Work create 时从 Boundary refs 读对应边界 Asset，传给 AI Agent 上下文 |

---

## → 参考

### 代码引用索引

| 主题 | 引用 |
|---|---|
| BlueprintIR（无 Refs 字段） | `packages/engine/src/oxl/md-pipeline/transformers/blueprint.ts:33-41` |
| Blueprint H2 分类（只有 Props/Slots） | `packages/engine/src/oxl/md-bridge/compilers/blueprint-compiler.ts:33` |
| parseBlueprintSlim（refs regex 不匹配 .md） | `packages/engine/src/Work/per-work-blueprints-merger.ts:189-257` |
| Work create（直接引用 Workflow） | `packages/engine/src/Work/work-manager.ts:78-169` |
| Work skeleton（Refs 指向 workflows/） | `packages/engine/src/Work/work-skeleton.ts:62-66` |
| Workflow H2 分类（有 Slots + Externals） | `packages/engine/src/oxl/md-bridge/compilers/workflow-compiler.ts:36` |
| Domain H2 分类（有 Externals） | `packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts:45` |
| Stack H2 分类（Runtimes/Linters/Tests） | `packages/engine/src/oxl/md-bridge/compilers/stack-compiler.ts:43` |
| Task H2 分类（Parts/Probes） | `packages/engine/src/oxl/md-bridge/compilers/task-compiler.ts:35` |
| Work H2 分类（Context/Tasks） | `packages/engine/src/oxl/md-bridge/compilers/work-compiler.ts:36` |
| EntityCompiler 注册 | `packages/engine/src/oxl/md-bridge/compilers/index.ts:40-47` |
| observe 仅 E4 覆盖率分析 | `packages/engine/src/kernel/verdicts/pipeline-compute.ts:164-197` |
| Asset Paper Schema（references + citations） | `docs/zh-cn/asset-paper.md` §2-3 |

### 文档链接
<!-- boundary:ignore -->
- [Asset](../../docs/zh-cn/asset.md) — E1 边界资产
- [Work](../../docs/zh-cn/work.md) — E2 协作空间 + Round + IAP
- [Asset Paper Schema](../../docs/zh-cn/asset-paper.md) — Asset-as-Paper + 引用计数 + DAG
- [Core Concepts](../../docs/zh-cn/core-concepts.md) — E1-E4 + 信任链

### ADR 链接
- [ADR-0054 三边界框架](../docs/adrs/0054-three-boundary-framework.md)
- [ADR-0055 Blueprint 组合模板](../docs/adrs/0055-blueprint-as-composition-template.md)
- [ADR-0056 External inline 收敛](../docs/adrs/0056-external-inline-and-status.md)

### 同层探索稿
- [两层 Proof 设计与边界映射分析](./two-layer-proof-design.md) — §六 边界 → Probe 统一映射模型
- [OpenXenon 产品设计](./openxenon-product-design.md) — 产品视角全景
- [信任链产品模型](./trust-chain-product-model.md) — 信任链四层确定性
