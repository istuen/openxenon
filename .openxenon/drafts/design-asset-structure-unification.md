# Design: Asset 结构收敛 — Group + Axiom + Theorem 三层模型

- **DraftType**: design（设计稿）
- **状态**: draft（grilling session 收束，待 promote 为 RFC）
- **创建日期**: 2026-08-08
- **主题**: Asset（Domain / Workflow / Stack / Blueprint）正文统一为 `## Group → ### Axiom → - Theorem` 三层结构；Blueprint 保留 `## Use <Asset Type> + ## Slot + 顶层 ###` 特例。
- **关联**:
  - `dev/OXN-Knowledge-Architecture-Proposal.md`（早期简化方案；本设计在此基础上收敛）
  - `.openxenon/drafts/design-blueprint-context-template.md`（Blueprint 上下文工程元结构）
  - `.openxenon/drafts/design-stack-operation-referent.md`（Stack Operation 引用机制）
  - `docs/product/zh-cn/concepts/glossary.md`（外部 glossary 与 Domain 锚点对应）
- **Grilling 来源**: 2026-08-08 `/grilling` session（grill-with-docs + domain-modeling skill）

---

## 1. 背景与目标

### 1.1 当前问题

OpenXenon 当前（v0.6.3）已有 9 个 Domain 文件 + 16 个 Workflow + 3 个 Stack + 4 个 Blueprint。每个 AssetKind 的正文结构各异：

| AssetKind | 当前结构 | 段数 |
|---|---|---|
| Domain | `## Terms:` / `## Bans` / `## Invariants` H3 字段 | 3 段 |
| Workflow | `## Slots` H3 + `observe/deps/desc` 字段 | 1 段 |
| Stack | `## Tools` H3 + `version/operations/role` 字段 | 1 段 |
| Blueprint | `## Use` / `## Boundaries` / `## Scope` / `## Context Template` | 4 段 |

问题：

1. **结构碎片化** — 4 种 AssetKind 解析路径不同，Engine 必须按 kind 走不同 parser；Domain 内 `Terms` / `Bans` / `Invariants` 三段语义被 Engine 单独处理。
2. **学习成本叠加** — 工程师写 Domain 学一套规则，写 Workflow 又学一套，写 Stack 再学一套；Blueprint 又是另一套。
3. **术语边界模糊** — `Terms`（定义）/ `Bans`（禁用）/ `Invariants`（不变量）作为段名时，工程师难以判断某条规则该进哪一段。
4. **与早期提案割裂** — `dev/OXN-Knowledge-Architecture-Proposal.md` v1.0 提出过 `## Group + Definition` 简化模型，但 v0.6 多轮迭代后未落地。

### 1.2 目标

让 **Asset（Domain / Workflow / Stack）正文统一为同一种结构**；Blueprint 保留必要的结构特例（Use / Slot / 顶层字段），但仍然在 `### Axiom` + `- Theorem` 这条骨架上生长。

最终效果：

- 工程师写 Asset 只需记 1 套规则（`## Group` + `### Axiom` + `- Theorem`）
- Engine 只需 1 套解析器（Blueprint 加特例识别）
- 段名（`Concept` / `Phases` / `Foundation` / `Boundary` / `Forbidden`）都是 free-form Group，Engine 不解释业务含义

---

## 2. 核心设计

### 2.1 三层结构（Domain / Workflow / Stack 统一）

```markdown
# Asset: <Kind>/<Name>

## [Group Name]            ← 任意 Group 名（Concept / Boundary / Forbidden / Practice / Foundation / Tools / Quality 皆是）
  ### [Axiom Name]         ← 公理（Term / 阶段 / 工具 / 概念 皆是）
    - [Theorem]            ← 定理（隶属于最近公理）
    - [Theorem]
  ### [Axiom Name]
    - [Theorem]
## [Another Group]
  ### [Axiom]
    - [Theorem]
```

**核心规则**：

- `## <Group>` — 关注点分组，名字 free-form（Concept / Boundary / Forbidden / Practice / Foundation / Tools / Quality 等皆可）
- `### <Axiom>` — 公理（原子性、原生性定义）。**可缺省** —— 见形态 C
- `- <text>` 在 `###` 下 — 定理（隶属于上方最近公理）
- `- <text>` 直接在 `##` 下 — 跨公理的定理（composite rule，无主公理）。**Group 下也可以只有 `-`，没有 `###`**

**3 种合法形态**（可混排）：

| 形态 | 描述 | 例子 |
|---|---|---|
| **A** Axiom + 定理 | `## Group` 下 `### Axiom` + 多条 `-` | `## Auth` 下 `### Sanctum` 配 2 条 `-` |
| **B** 纯 Axiom | `## Group` 下只有 `### Axiom`（无 `-`，基础术语） | `## Core Entities` 下 `### Product` / `### SKU` / `### Order` |
| **C** 纯 Theorem | `## Group` 下直接 `-`（无 `### Axiom`，跨公理派生规则） | `## Business Rules` 下 3 条 `-`；`## Failure Stop` 下 1 条 `-` |

**形态 C 的常见场景**：

- 业务规则（跨多实体公理派生的不变量）
- 失败处置规则（跨多阶段公理派生的策略）
- 标语 / Slogan（无需分组术语的扁平表述）
- 引用约束（`## Reference` 下的 plain 列表）

→ 形态 C 是 **同等地位合法形态**，不是 A 的退化。Group 下可同时包含 A / B / C 三种内容（混排）。

### 2.2 Blueprint 特例结构

```markdown
# Blueprint: <Name>

## Use <Asset Type>        ← 多个 H2，每个 Asset Type 一个（workflow / domain / stack / ...）
  ### [Asset Path]
    - group: <Group Name>
## Use <Another Asset Type>
  ### [Asset Path]
    - group: <Group Name>

## Slot                    ← 单一 H2
  ### [Slot Axiom]
    - observe: [...]
    - operate: [...]
    - deps: [...]

### [Blueprint's Own H3]   ← 顶层 H3（与 ## 同级）
  - field: value
### [Blueprint's Own H3]
  - field: value
```

**Blueprint 与通用 Asset 的差异**：

| 维度 | Domain / Workflow / Stack | Blueprint |
|---|---|---|
| `## Group` | free-form 任意组名 | 固定为 `## Use <Asset Type>` + `## Slot` |
| `### Axiom` | 自由命名 | 路径名 / Slot 名 / 顶层字段 |
| 顶层 `###` | 不存在 | 存在（Scope / Context Template） |
| 解析器分支 | 通用解析器 | 通用解析器 + 4 段识别 |

### 2.3 字段化约定（Stack / Slot / Scope）

部分 Axiom 体承载结构化字段（Stack Tool 版本、Slot observe、Scope allow/forbid）。约定：

- **Stack Tool**：`### <tool>` 下用 `- field: value` 形式（如 `version: ">=1.3.0"`, `operations: ...`）
- **Slot**：`### <slot>` 下用 `- observe: [...]` `- operate: [...]` `- deps: [...]`
- **Scope**：`### Scope` 顶层 H3，下用 `- allow: [...]` `- forbid: [...]`

这些字段是 Engine 解析锚点，不参与 Theorem 派生树。

---

## 3. 4 个 AssetKind 落地示例

### 3.1 Domain: OxnWorkDomain

```markdown
---
entity: domain
version: 0.4.0
name: OxnWorkDomain
abstract: OXN Work 业务领域
references: [oxn-domain, oxn-engine-domain, oxn-asset-domain, oxn-proof-domain]
citations: 0
synced-at: 2026-08-08
---
# Domain: OxnWorkDomain

> Work 是 E2 人机协作工作空间（ADR-0072 修正：不是 A 而是协议/接口）。
> IAP 三阶段：Intent → Align → Proof 顺序不可跳；Round × N 多轮循环。

## Concept
### Work
- E2 人机协作工作空间；必经 create→lock→run→submit×N→finalize
### Phase
- 单个 IAP 阶段（Intent/Align/Proof 之一）；顺序不可跳
### Task
- Align 执行单元，对齐 1 Blueprint + 引用 N Domain；DAG 无环
### Slot
- Blueprint 内拓扑节点，Engine 校验无环
### Part
- Task 内 skill 执行单元（skill_context + acceptance）；内联不可独立成文件
### Probe
- 物理观测单元（prop 输入 + output 判定）；标准来自 Blueprint observe 数组
### Round
- Work 多轮 IAP 循环（v0.6 新增）；手动触发；maxIterations 硬限制 3
### BirthCert
- Work 静态门禁卡（.work 目录）；写一次后只读
### PlanLock
- BirthCert 内不可变快照（5 组件 hash + allHash）
### Artifact
- Align 阶段产出的物理事实（被 Probe 观测）
### Frozen
- Work finalize 后不可变证据文件（frozen.json）

## Context Engineering
### WorkContext
- Work 级上下文（语义层）；AI Agent 按 Blueprint Context Template 从 Use refs 抽取
### TaskContext
- Task 级上下文（语义层）；按 Blueprint ## Slot 每个 Slot 拆分
### memory
- Work 级动态记忆（memory.md）；append-only，不入 PlanLock
### ContextTemplate
- Blueprint 内 ## Use 末尾的组装指令；可选，缺省 Engine 走内置默认
### Scope
- Blueprint 顶层 ### Scope 字段（allow/forbid glob）；PlanLock 保护
### ArtifactDeclaration
- Task 内声明的预期产物路径列表；lock 时 Engine 校验 ⊆ Scope
### operate
- Blueprint ## Slot 内执行参照数组；声明 AI 应运行的 Operation 名（参照不强制）

## Boundary
### IAP Phase Order
- 顺序不可跳（违反 → IAPError 拒绝，inv-1）
### Run Lock Sequence
- lock 成功前不能 run（inv-4）；run 成功前不能 submit（inv-5）
### PlanLock Hash
- 漂移即篡改 → LOCK_HASH_MISMATCH（inv-7）
### Reference Existence
- 引用 Asset 必须实际存在（@prj 寻址 fail-fast，inv-12）
### Slot Alignment
- Task Part 名必须对齐 Blueprint Slot 名（inv-13）
### DAG Cycles
- Task DAG 必须无环（Kahn 校验，inv-14）
### Channel Tracking
- Work 追踪只覆盖 OXN 通道内行为（inv-31 channel-only-tracking）
### Reverse Flow
- 反向改 Blueprint 禁止（inv-29 task-no-reverse-blueprint）
### Domain Isolation
- Domain 与 Blueprint 互不引用（inv-26 domain-blueprint-isolated）
### Operate Resolution
- operate 引用必须能在 Stack tool.operations 解析（inv-27）
### Scope Boundary
- ArtifactDeclaration ⊆ Scope.allow AND ∩ Scope.forbid = ∅（inv-35）
### Context Lifecycle
- context.md 必须在 lock 前写完（inv-33）；纳入 PlanLock 5-hash（inv-32）

## Forbidden
### Outdated CLI
- 用 oxn work new（inv-17）
- 用 oxn work task create
### Auto Promotion
- 自动 promote Work 跳过 Draft
### Semantic Confusion
- 用 Job / Pipeline / Plugin / Hook / PromptTemplate 描述 Work
- 用 Skill 代替 Blueprint
### PEAS Misalignment
- 把 Work 当作 A 或 Proof 看作 S（ADR-0072）
### Quality Judgment
- OXN 评判 AI 执行质量（ADR-0066/0067）
### Track Enforcement
- 通道外行为强制追踪

## Cross-Cutting Rule
- 无主公理的跨公理派生规则（形态 C：纯 Theorem）
- Work 是 Insight 唯一客观数据源（inv-30 work-insight-data-source）
- 上游冻结后下游才能展开：Blueprint 未通过 `oxn blueprint validate` → Work 不许实例化（inv-28）
- 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明（v0.6 slogan）

## Slogan
- OXN = 工程师定义 AI Agent 协作边界的工具（v0.6.2-alpha.2）
```

### 3.2 Workflow: dev-workflow

```markdown
---
entity: workflow
version: 0.3.0
name: dev-workflow
abstract: 通用开发工作流：retrieve → design → develop → test
references: ["@md/domains/oxn-work-domain", "@md/domains/oxn-engine-domain"]
---
# Workflow: dev-workflow

> OpenXenon 通用开发工作流。AI Agent 在 Asset 边界内做开发时的默认流程。

## Phases
### retrieve
- 读代码结构
- 理解上下文
- 定位变更点
- 术语支撑：oxn-work-domain
### design
- 设计结构与类型签名
- 确认与 L0-L3 边界兼容
- Kernel 零 IO / Infra 仅做事实
### develop
- 按设计编写实现
- 遵循 Biome 风格 + ESLint 架构守卫
- 术语支撑：oxn-engine-domain
### test
- typecheck + bun test 全通过
- OXN 验证执行结果但不评判质量（ADR-0067）

## Practice
### Failure Handling
- 失败即停：lint / typecheck / test 任意一关失败 → 回到 design 阶段
### Quality Stance
- 验证不评判质量

## Reference
### Source Definition
- 根工作流：oxn-workflow
- 4 阶段原始定义：ts-retrieve-design-develop-test.md

## Failure Stop
- 跨阶段公理派生的失败处置规则（形态 C：纯 Theorem）
- 任一 Quality Gate 失败 → 立即停 → 回到 design 阶段
- 失败信息必须落 `.openxenon/drafts/` Issue Draft（不与 Work 上下文混）
```

### 3.3 Stack: oxn-stack

```markdown
---
entity: stack
version: 0.2.0
name: oxn-stack
abstract: OpenXenon 技术栈：TypeScript ≥5.0 + Node ≥20 + Bun
references: []
citations: 0
synced-at: 2026-08-08
---
# Stack: oxn-stack

> OpenXenon 工程实现技术栈（OXN CLI + Engine 共用）。

## Foundation
### TypeScript
- version: ">=5.0.0"
- operations:
  - typecheck: "bun run typecheck" — tsc --noEmit
### Node
- version: ">=20.0.0"
### Bun
- version: ">=1.3.0"
- role: runtime + package manager + 单文件 CLI 编译
- operations:
  - install: "bun install"
  - build: "bun run build"

## Tools
### biome
- role: 格式 + 风格
- operations:
  - check: "bun run check"
  - format: "bun run format"
### eslint
- role: 架构守卫（L0-L3 import 限制）
- operations:
  - lint: "bun run lint"
### bun-test
- command: "bun test"
- operations:
  - test: "bun test"
  - test-file: "bun test <FILE>"
  - test-filtered: "bun test --filter $PATTERN"
### lefthook
- role: pre-commit + pre-push
- operations:
  - pre-commit: "lefthook run pre-commit"
  - pre-push: "lefthook run pre-push"

## Quality
### Format
- format + lint：biome.json 单一配置
### Architecture Guard
- 架构守卫：eslint.config.js
### Failure Stop
- 任一 hook 失败阻断 commit/push

## Toolchain
- 跨工具公理派生的工具链规则（形态 C：纯 Theorem）
- 锁文件唯一权威：bun.lock（不用 package-lock.json / pnpm-lock.yaml）
- pre-commit 跑 biome + eslint-arch + typecheck + heading-skeleton + doc-boundary
- pre-push 跑 bun test
- CI 永不复用 lock 文件（必须 fresh install）
```

### 3.4 Blueprint: bug-fix-blueprint

```markdown
---
entity: blueprint
version: 0.2.0
name: bug-fix-blueprint
abstract: Bug 修复组合模板：diagnose → locate → fix → verify
references: ["@md/workflows/fix-issue", "@md/domains/oxn-engine-domain", "@md/domains/oxn-work-domain", "@md/stacks/oxn-stack"]
citations: 0
synced-at: 2026-08-08
---
# Blueprint: bug-fix-blueprint

> Bug 修复组合模板。AI Agent 在 `.openxenon/drafts/issue-*.md` 描述的 bug 上跑 4 阶段流水线。
> 产物：1 个 commit（含回归测试）落在源码树。

## Use workflow
### fix-issue
- path: @md/workflows/fix-issue

## Use domain
### oxn-engine-domain
- path: @md/domains/oxn-engine-domain
### oxn-work-domain
- path: @md/domains/oxn-work-domain

## Use stack
### oxn-stack
- path: @md/stacks/oxn-stack
### git-stack
- path: @md/stacks/git-stack

## Slot
### diagnose
- 复现问题：从 issue Draft / 错误日志 / 测试失败出发
- 定位错误堆栈相关源码（fs-content-match）
- 记录触发条件 + 期望 vs 实际
- observe: [fs-content-match]
- operate: [git-status]
- deps: []
### locate
- 用 git-blame 定位根因（行号 + 作者 + 最近一次相关修改）
- 证据落 .openxenon/drafts/diagnose-<id>.md
- observe: [fs-exists, git-blame]
- operate: [git-blame-on-file]
- deps: [diagnose]
### fix
- 按诊断修代码 + 加回归测试（覆盖原 bug 触发路径）
- observe: [ts-compiles, test-pass]
- operate: [typecheck, test, git-add, git-commit]
- deps: [locate]
### verify
- 全量回归三关全过：lint-check + ts-compiles + test-pass
- 加 probe 锁死修复（防未来回归）
- observe: [lint-check, ts-compiles, test-pass]
- operate: [lint, typecheck, test]
- deps: [fix]

### Scope
- allow: [packages/cli/src/**, packages/engine/src/**, packages/cli/src/__tests__/**, packages/engine/src/__tests__/**]
- forbid: [packages/engine/src/kernel/**, .openxenon/assets/**]

### Context Template
- business: IAP 闭环 + 错误契约（oxn-engine-domain）
- implementation: lint/typecheck/test 工具（oxn-stack）
- process: 4 slot 拓扑（diagnose / locate / fix / verify）
- carry: 每个 Task 携带 Work Context 子集 + 前序 Task 诊断产物
- special: diagnose 阶段必须落 .openxenon/drafts/diagnose-<id>.md 证据
```

---

## 4. 解析规则（Engine 侧）

### 4.1 通用解析器（Domain / Workflow / Stack）

| Markdown 元素 | 解析为 | 含义 |
|---|---|---|
| `# Asset: <kind>/<name>` | 标题 | Asset 标识 |
| `## <Group>` | Group | 关注点分组（free-form） |
| `### <Name>` | Axiom | 公理（Term / 阶段 / 工具） |
| `- <text>` 在 `###` 下 | Theorem | 定理（隶属于最近 Axiom） |
| `- <text>` 直接在 `##` 下（无 `###`） | Composite Theorem | 跨公理派生规则（形态 C） |

**形态 A / B / C 解析差异**：

- **A**：`### Axiom` 容器存在，下属 `-` 全部 bind 到这个 Axiom
- **B**：`### Axiom` 容器存在但下属为空（Axiom 是 leaf 节点）
- **C**：跳过 `### Axiom` 层级，`-` 直接 bind 到 `## Group`（无 Axiom parent）

**Group 解析保证**：

- 一个 Group 可同时包含 A / B / C 三种形态
- 解析器对 `-` 行做最近祖先绑定：先找 `###` 再找 `##`
- 如果 `-` 直接在 `##` 下（无 `###`），归为 Composite Theorem（无 Axiom 父）

### 4.2 Blueprint 解析器（在通用基础上加 4 段识别）

| Markdown 元素 | 解析为 | 备注 |
|---|---|---|
| `## Use <Asset Type>` | Use Group | Asset Type ∈ {workflow, domain, stack, blueprint, roadmap} |
| `### <name>` 在 `## Use` 下 | Asset 路径 | 路径名 + group 字段 |
| `## Slot` | Slot Group | 单一 H2 |
| `### <name>` 在 `## Slot` 下 | Slot Axiom | 解析 observe/operate/deps 字段 |
| `### <name>` 顶层（与 ## 同级） | Blueprint 字段 | Scope / Context Template 等 |

### 4.3 解析流程

```
1. 扫描 H2/H3 结构
2. 当前 H3 绑定到最近的 H2（Group）
3. `-` 行绑定到最近的 H3（Axiom）
4. 顶层 `### <name>` 标记为 Blueprint 字段（无 Group 父）
5. `## Use <type>` → push 到 Use Group（type=<Asset Type>）
6. `-` 行首出现的 `field: value` 按字段名解析（observe/operate/deps/version/operations/role/command/allow/forbid/path/group）
```

### 4.4 与 Glossary 锚点兼容

- `### Term` H3 锚点保留（外部 `docs/glossary/<lang>/<domain>.md` 链接兼容）
- `glossary-ref` 字段收敛到 `### Term` 自身（不再额外标）

---

## 5. 落地路径

### Phase 1 — 守门脚本（不写 Asset）

- **新增** `bun scripts/check-asset-structure.ts`
- **验证规则**：
  1. `## Group` 不重名（同一 Asset 内 H2 唯一）
  2. `### Axiom` 行下只允许 `-` bullet + 字段负载（形态 A）
  3. Group 下可仅含 `-`（无 `### Axiom`）—— 形态 C 合法
  4. Group 下可仅含 `### Axiom`（无 `-`）—— 形态 B 合法
  5. Blueprint 模板识别：`## Use <type>` / `## Slot` / 顶层 `###`
  6. Stack Tool 字段负载解析（version/operations/role/command）
- **接入** `lefthook` pre-commit 钩

### Phase 2 — 标杆改造（4 文件）

| 文件 | 当前 | 目标 |
|---|---|---|
| `.openxenon/assets/domains/oxn-asset-domain.md` | 291 行（Terms/Bans/Invariants） | ~70 行（Group + Axiom + Theorem） |
| `.openxenon/assets/workflows/dev-workflow.md` | 51 行（Slots H3） | ~30 行（Phases/Practice/Reference） |
| `.openxenon/assets/stacks/oxn-stack.md` | 61 行（Tools H3） | ~50 行（Foundation/Tools/Quality） |
| `.openxenon/assets/blueprints/bug-fix-blueprint.md` | 121 行（4 段 H2） | ~75 行（Use <type> + Slot + 顶层 ###） |

**验证**：
- `oxn asset check` 通过
- `oxn asset compile` 通过
- `bun scripts/check-asset-structure.ts` 通过
- `bun run typecheck`
- `bun run lint`
- 现有 Engine 解析（kind-isolation / refs DAG / observe resolution）继续工作

### Phase 3 — 批量改写（8 Domain + 16 Workflow + 3 Stack + 3 Blueprint）

- 顺序：Domain → Workflow → Stack → Blueprint
- 配脚本：`oxn asset migrate --to=v2` 自动收编（仅做表层重构）
- 验证：全套守门 + Engine 解析 + glossary 重建

### Phase 4 — 文档化

- 新增 `docs/dev/zh-cn/asset-structure-v2.md`（Schema 文档）
- 8 个 glossary 索引重生成
- 12 RFC 增补新结构映射（如 stack-operation-referent / blueprint-context-template）
- 守门脚本接入 CI

---

## 6. 决策记录（Grilling 锁定项）

| # | 问题 | 锁定答案 | 理由 |
|---|---|---|---|
| 1 | Term 用 `### Term` 还是 `- [Term]` 行标记？ | **`### Term` H3** | T1 形式天然兼容 `docs/glossary/` 锚点；新写 parser 风险大 |
| 2 | 机器契约（inv-* / IAP_*）放哪？ | **留在 Asset 内**（`## Boundary` Group 收纳） | sidecar 改造成本高；Engine 解析时识别 + 跳过 Definition 树 |
| 3 | Stack Tool 字段化？ | **保留 H3 + 字段负载**（version/operations/role） | Engine 必须解析 `operate: [name]` → `tool.operations[name]` 映射 |
| 4 | Glossary 锚点？ | **保留 `### Term` H3 锚点** | 兼容现有 `docs/glossary/<lang>/<domain>.md` 链接 |
| 5 | 改造范围？ | **S2：9 Domain + 1 示范 Workflow/Stack/Blueprint** | 先标杆化再批量；Engine 验证充分 |
| 6 | `## Term` / `## Boundary` / `## Forbidden` 段位？ | **同名 Group（free-form）** | Engine 不解释 Group 业务含义；统一三层结构 |
| 7 | Blueprint 4 段（Use / Boundaries / Scope / Context Template）？ | **`## Use <Asset Type>` + `## Slot` + 顶层 `### Scope` / `### Context Template`** | Blueprint 是结构层，与 Definition 树正交 |
| 8 | Group 下可不可以只有 `-`（无 `### Axiom`）？ | **可以 —— 形态 C（纯 Theorem）** | 跨公理派生规则不需要主公理；逻辑上是无主定理；`## Business Rules` / `## Failure Stop` / `## Slogan` 都是形态 C |

---

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| Engine 解析代码（`packages/engine/src/Asset/`）需重写 | 守门脚本先跑；新 parser 写完后做双轨运行（旧 + 新）2 周过渡 |
| `## Terms:` 段消失 → 现有外部 `docs/glossary/` 链接 404 | Phase 4 与 glossary 重生成同步；长链迁移用 301 重定向 |
| Stack Tool 字段（version/operations）解析改动 | Phase 2 标杆 + 兼容性测试 1 周 |
| `## Boundaries` H2 改为 `## Slot` → 现有 Blueprint 解析失效 | 同步修改 `packages/engine/src/Asset/blueprint/parser.ts` |
| 现有 `bun scripts/check-doc-boundary.ts` 守门规则需更新 | 增量 PR 接入 |

---

## 8. 下一步

1. **退出 grilling，enter Work**：本文作为 Draft，提交 `oxn draft create` 注册（已通过本盘会话产出）
2. **Promote 路径**：`oxn draft promote --target asset/rfc` —— 工程师决定升为 RFC 落地还是升为 Asset 模板
3. **Phase 1 开工**：写 `bun scripts/check-asset-structure.ts` 守门脚本，作为后续改造的硬约束
4. **Phase 2 标杆**：4 个示例文件改造 → 端到端验证 Engine 兼容

---

> **本文本质**：把 `dev/OXN-Knowledge-Architecture-Proposal.md` v1.0 的简化模型收敛到 v0.6.3 现状——保留 IAP/Round/Proof/Context/Scope/PlanLock 等机器契约，但正文结构统一为 Group + Axiom + Theorem。OXN 管结构稳定，LLM 管推理质量，工程师管知识判断。
