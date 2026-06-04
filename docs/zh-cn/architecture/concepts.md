# 2. 核心概念

> v0.1 起，OpenXenon 引入 **DDD 双层架构**。
> 核心概念从 v0.0.x 的"三层资产"扩展为"四层领域"——Domain / Blueprint / Work / Task。
> 详见 [v0.1 DDD 双层架构说明](./ddd-dual-layer.md)。

## L0-L3 四层架构

OpenXenon 采用四层架构设计，各层职责分明：

```
┌─────────────────────────────────────────────────────────────────┐
│ L3: Runtime (应用交互层)                                        │
│ 职责: 系统入口，人/AI 交互，进程守护，视图渲染                   │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│ │    CLI    │ │   Daemon  │ │   Skill   │ │    Hall   │       │
│ │ 外部指令集 │ │ 后台监控   │ │ AI 助手技能│ │ 可视化研讨厅│       │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
└────────────────────────────┬────────────────────────────────────┘
                              │
┌────────────────────────────▼────────────────────────────────────┐
│ L2: Domain (领域实体层)                                         │
│ 职责: 业务限界上下文 (DDD) + 资产生命周期 + 任务执行           │
│ ┌─────────────────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ Arsenal (资产域)        │ │  Domain 域   │ │   Work 域    │ │
│ │ Probe/Part/Blueprint   │ │ 限界上下文    │ │ 编排 + 执行  │ │
│ │ - Forge                │ │ - language    │ │ - 沙盒       │ │
│ │ - Promote              │ │ - domain_rules│ │ - Task DAG   │ │
│ │ - Fork/Extract         │ │ - context_map │ │ - Frozen     │ │
│ └─────────────────────────┘ └──────────────┘ └──────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                              │ 依赖 L1 进行 IO 与文本解析
┌────────────────────────────▼────────────────────────────────────┐
│ L1: Foundation (基建层)                                          │
│ 职责: 提供领域语言解析能力 与 宿主环境副作用收口                 │
│ ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│ │   OXN DSL (语义基座)    │ │     Infra (物理基座)         │   │
│ │ - Grammar (语法定义)    │ │ - FsPort (文件系统)          │   │
│ │ - Parser (解析器)      │ │ - PathPort (路径计算)        │   │
│ │ - Validator (校验器)   │ │ - ProbePort (系统观测)       │   │
│ └─────────────────────────┘ └─────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                              │ 供给 L0 数据与接口契约
┌────────────────────────────▼────────────────────────────────────┐
│ L0: Kernel (核心真空层)                                         │
│ 职责: 绝对的逻辑圣殿，零依赖，零 IO                             │
│ ┌────────────┐ ┌────────────┐ ┌────────────────────────────┐  │
│ │   Schema   │ │  Contract  │ │        Processor            │  │
│ │ (数据骨架)  │ │ (外部插座)  │ │     (纯逻辑推演机)         │  │
│ └────────────┘ └────────────┘ └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**层次说明**：
- **L0 Kernel**：纯数据契约 + 纯逻辑推演，零 IO
- **L1 Foundation**：OXN DSL 语义解析 + Infra 宿主适配
- **L2 Domain**：
  - *Arsenal* — 资产生命周期（Probe/Part/Blueprint）
  - *Domain* — DDD 限界上下文（v0.1 新增）
  - *Work* — 任务执行（Work/Task 双层）
- **L3 Runtime**：CLI/Daemon/Skill/Hall 对外交互

---

## Domain（v0.1 新增）

Domain 是 DDD 的"限界上下文"——一个领域内聚的、有明确边界的业务概念集合。

### Domain 结构

```oxn
domain "MemberContext" {
  description = "会员限界上下文：管理注册、认证、会员等级"

  language {
    noun "Member" desc "注册会员实体"
    noun "Account" desc "会员的登录凭证"
    verb "Register" desc "提交注册表单创建 Member"
    verb "Authenticate" desc "校验登录凭证"
    ban = ["User", "Customer", "AccountHolder"]
  }

  domain_rules {
    rule "PasswordNeverPlaintext" desc "密码任何时候都不能明文存储"
    rule "EmailMustBeUnique" desc "同一邮箱在同一上下文内不可重复注册"
  }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

### Domain 字段

| 字段 | 必需 | 含义 |
|------|------|------|
| `description` | 否 | 一句话描述限界上下文的业务边界 |
| `language.nouns` | 否 | 领域名词（AI 必须使用） |
| `language.verbs` | 否 | 领域动作（AI 必须使用） |
| `language.ban` | 否 | 禁用词（AI 不能用） |
| `domain_rules` | 否 | 业务不变量（v0.1 仅文档化，v0.2 接 Probe） |
| `context_map.imports` | 否 | 跨域依赖（防腐层） |

### Domain 物理结构

```
.openxenon/domains/
├── member-context.oxn
├── order-context.oxn
└── marketing-context.oxn
```

- **文件名** = kebab-case（如 `member-context.oxn`）
- **Domain 名** = PascalCase（如 `MemberContext`）
- **Context Map alias** = 简短 PascalCase 别名

---

## Blueprint

Blueprint 是 OpenXenon 的"工程图"，定义了任务的完整结构。
v0.1 起，Blueprint 仅作为**技术流水线模板**，业务语义由 Domain 承载。

### Blueprint 结构

```oxn
blueprint "dev-workflow" {
  version = 1
  description = "开发工作流"
  slot "develop" { }
  slot "test" { deps = ["develop"] }
}
```

### Blueprint 与 Work/Task 的关系

| 关系 | 描述 |
|------|------|
| Blueprint 是 Intent | 静态声明业务需要经过哪些阶段 |
| Task 是 Align | 动态实例：在 task.oxn 中 `blueprint "X"` 绑定一份 Blueprint |

### Blueprint.type 与 Work.type 强绑定

Work 的 type 与 Blueprint 的 type 强绑定：
- `Task` 类型的 Work，只能实例化 `type: task` 的 Blueprint
- `Plan` 类型的 Work，只能实例化 `type: plan` 的 Blueprint
- `Explore` 类型的 Work，只能实例化 `type: explore` 的 Blueprint

---

## Part

Part 是 Arsenal 资产中的"零件"，包含 target/action/spec/probes 四字段，内置 _version 版本号。

### Part 结构

```oxn
part "develop-feature" {
  description = "执行开发任务并通过测试验证"
  prop "feature_desc" { type = string; required = true }
  prop "cwd" { type = string; default = "." }

  observe = ["ShellExec"]

  probe "build" ref "@oxn/probes/shell-exec" {
    params = { command = "pnpm build" }
  }
  probe "test" ref "@oxn/probes/shell-exec" {
    params = { command = "pnpm test" }
  }

  execution = [build, test]
}
```

### Part 四字段结构

| 字段     | 可见性       | 含义                         |
| -------- | ------------ | ---------------------------- |
| `target` | 对 AI 可见   | 约束执行的作用域             |
| `action` | 对 AI 可见   | 下发给 AI 的执行指令         |
| `spec`   | 对 AI 不可见 | 工程师对意图的结构化约束     |
| `probes` | 对 AI 不可见 | 校验该工序是否完成的探针集合 |

---

## Probe

Probe 是 L1 的"原子检查"，通过物理观测获取事实，由 Kernel 纯函数判定结果。

### 内置 Probe 类型

| 类型 | 能力层实现 | 评判层逻辑 |
|------|-----------|-----------|
| `fs_exists` | `glob()` 扫描文件系统 | `found.length > 0` |
| `fs_not_exists` | `glob()` 扫描文件系统 | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `pattern.test(content)` |
| `shell_exec` | `spawn()` 执行命令 | `exitCode === 0` |

---

## Arsenal

Arsenal 是 OpenXenon 的"资产库"，存放所有标准资产。

### 资产类型

| 类型 | 层级 | 描述 |
|------|------|------|
| **Domain** | L2 (v0.1) | DDD 限界上下文，承载业务语言与规则 |
| **Blueprint** | L2 | 技术流水线模板，编排 slot 拓扑 |
| **Part** | L2 | 零件，含 target/action/spec/probes |
| **Probe** | L1 | 原子化检查 |

### Arsenal 物理结构

```
.openxenon/
├── arsenals/                ← 标准资产（v0.0.x 旧布局）
├── blueprints/              ← v0.1 推荐：技术流水线模板放这里
│   ├── dev-workflow.oxn
│   ├── fix-issue.oxn
│   └── explore-analyze-report.oxn
└── domains/                 🌟 v0.1 新增：DDD 限界上下文
    ├── member-context.oxn
    ├── order-context.oxn
    └── marketing-context.oxn
```

### 生命周期

所有 Arsenal 资产必须经过两态生命周期（v0.0.x 兼容）：

```
Draft ──[oxn arsenal promote]──▶ Formal
```

Domain 资产不经过此生命周期（直接落入 `domains/`，由工程师 review）。

---

## Work（v0.1 改造）

v0.1 起，**Work = Workspace 编排器**，不再绑定单一 Blueprint，而是声明用到的 Domain + Blueprint + Task DAG。

### Work 类型

| 类型 | 说明 | Blueprint.type 绑定 |
|------|------|---------------------|
| **Task** | 任务执行 | `task` |
| **Plan** | 计划编排 | `plan` |
| **Explore** | 探索执行 | `explore` |

### Work 结构（v0.1）

```oxn
work "Onboarding" {
  context {
    goal = "完成新会员注册";
    constraints = ["不能直接读订单库"];
    loop_policy { max_iterations = 5; }
  }

  use_domain "MemberContext";
  use_domain "MarketingContext";
  use_blueprint "dev-workflow";

  task "RegisterMember" align "MemberContext.Register" {
    deps = []
    prop "username" = "new_user_123"
  }
  task "GrantWelcomeBonus" align "MarketingContext.GrantWelcomeBonus" {
    deps = ["RegisterMember"]
    prop "targetMemberId" = "RegisterMember.outputs.memberId"
  }
}
```

### Work 物理结构

```
.openxenon/works/<work-name>/
├── work.oxn              ← 编排器
├── state.json            ← workspace 级 state
├── work-trace.jsonl      ← workspace 级 trace
├── CONTEXT.md            ← AI 上下文摘要（自动生成）
└── tasks/
    ├── <task-name>/
    │   ├── task.oxn     ← 绑 1 Blueprint + 注入 N Domain
    │   ├── state.json
    │   ├── work-trace.jsonl
    │   └── frozen.json    ← 验证通过后生成
    └── ...
```

### Work 生命周期

1. **CREATED** — Work 已创建，task.oxn 待填
2. **IN_PROGRESS** — Work 正在执行（按 task DAG 推进）
3. **PASSED** — 所有 task 通过
4. **FAILED** — 某个 task probe 失败

### Work 执行流程

1. AI 通过 `oxn work task new` 创建 task
2. AI 通过 `oxn get-context --work X --task Y` 获取上下文（全量隔离）
3. AI 执行 task 工作（写代码、跑命令）
4. AI 通过 `oxn leader submit --work-name X` 推进 part
5. Kernel 用 Probe 校验 Artifact，判定成败
6. 验证通过后生成 `frozen.json` 快照

---

## Task（v0.1 新增）

Task 是 Work 内的**单次执行单元**，绑定一份 Blueprint + 注入若干 Domain。
跨域处理：拆 2 个 Task，每个 Task 单域纯净。

### Task 结构

```oxn
task "register-member" blueprint "dev-workflow" {
  inject "MemberContext"

  context {
    objective = "实现会员注册逻辑"
    constraints = [
      "必须使用 noun.Member 命名类",
      "禁止使用 ban 列表中的 User/Customer"
    ]
  }

  slot "develop" { deps = [] }
  slot "test" { deps = ["develop"] }
}
```

### Task 字段

| 字段 | 必需 | 含义 |
|------|------|------|
| `blueprint` | 是 | 绑定的 Blueprint 名（必须出现在 work.oxn 的 use_blueprint 列表中） |
| `inject` | 否 | 注入的 Domain 列表（必须出现在 work.oxn 的 use_domain 列表中） |
| `context.objective` | 否 | 任务目标 |
| `context.constraints` | 否 | 任务硬约束 |
| `slot` | 可多个 | 引用的 slot，与 Blueprint 中的 slot 名字对应 |

---

## 全量隔离（v0.1 关键能力）

`oxn get-context` 的核心设计是**全量隔离**——AI 只能看到当前 task 自己 inject 的 domain，**看不到 work 中其他 domain**。

```
work.oxn 声明: use_domain [A, B, C]
task.oxn 注入: inject "A"
get-context 输出: 只含 A 的 language/domain_rules，B、C 一律不可见
```

这样：
- AI 不会被无关 domain 的术语干扰
- 跨域操作必须显式声明（注入 → 必须 align 到对应域的能力）
- 领域边界在 AI 视角下强制隔离

---

## Hall (研讨厅)

Hall 是 OpenXenon 的"研讨厅"，提供项目状态的可视化视图。

### 功能

- 查看 Work 列表和状态
- 查看 Draft/Formal 资产
- 查看执行轨迹和判定结果

### CLI 命令

```bash
oxn hall              # 打开研讨厅
oxn hall --open       # 在浏览器中打开
```

---

## 术语表

### 系统角色

| 术语 | 定义 |
|------|------|
| **工程师** | 提供高层意图和约束，不直接写代码 |
| **AI 助手** | 解析工程师意图，生成 Blueprint 和代码 |
| **oxn CLI** | 命令行入口，不依赖 Daemon 即可使用核心功能 |

### L0-L3 架构

| 层级 | 组件 | 职责 |
|------|------|------|
| **L0** | Schema/Contract/Processor | 数据契约 + 纯逻辑推演 |
| **L1** | OXN DSL + Infra | 语义解析 + 宿主适配 |
| **L2** | Arsenal + Domain + Work | 资产管理 + DDD + 执行调度 |
| **L3** | CLI/Daemon/Skill/Hall | 外部交互 |

### 核心概念（v0.1）

| 术语 | 定义 |
|------|------|
| **Domain** | DDD 限界上下文，承载业务语言与规则 |
| **Blueprint** | 技术流水线模板，定义 slot 拓扑 |
| **Probe** | 原子化检查（如 fs_exists、shell_exec） |
| **Work** | 工程师意图的工作区沙盒（v0.1 改造为编排器） |
| **Task** | Work 内的执行单元，绑 1 Blueprint + 注入 N Domain |
| **State** | 双层 state.json（workspace + task） |
| **Hall** | 研讨厅，项目状态可视化 |

---

## 概念关系图（v0.1）

```
L3 Runtime
  └── CLI / Daemon / Skill / Hall
        ↓ invokes

L2 Domain
  ├── Arsenal ──────► Blueprint / Part / Probe
  ├── Domain  ──────► language / domain_rules / context_map  🌟 v0.1
  └── Work
        ├── workspace-level state
        │     └── task DAG (use_domain + use_blueprint + task blocks)
        └── Task (×N)
              ├── bound 1 Blueprint
              ├── inject N Domain
              └── isolated CONTEXT.md

L1 Foundation
  ├── OXN DSL ──► Grammar / Parser / Validator
  └── Infra ──────► FsPort / PathPort / ProbePort

L0 Kernel
  └── Schema / Contract / Processor
```

---

## 下一章

下一章将介绍 [v0.1 DDD 双层架构详解](./ddd-dual-layer.md) 与 [CLI 命令参考](../guides/cli-reference.md)。
