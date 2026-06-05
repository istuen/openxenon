# 术语表

> OpenXenon v0.1 统一术语表。**不列废弃术语**（如 stage/expectation/rule/inject/align 字符串拼接等）。

## 1. 角色与职责

| 术语 | 定义 |
|---|---|
| **工程师** (Engineer) | 决策者与验收者；定义意图、设定验证标准、审查最终结果 |
| **AI 助手** (AI Assistant) | 调度者与执行者；接收任务目标，选择执行策略，调度 Core CLI |
| **Core Engine** | 判决者与记录者；编译资产、执行校验、记录状态 |

## 2. Intent 端（声明 / 静态）

| 术语 | 定义 |
|---|---|
| **Domain** | DDD 限界上下文；自治的业务语言载体；含 term/ban/invariant/context_map |
| **term** | Domain 内的核心词汇（nouns/verbs 合并）；AI 必须使用 |
| **ban** | Domain 内禁止 AI 使用的词 |
| **invariant** | Domain 内的业务不变量（v0.1 文档化，v0.2 强校验） |
| **context_map** | Domain 的跨域引用声明（仅声明，不传递依赖） |
| **Blueprint** | 技术流水线模板；只声明 slot 拓扑，不含业务/验证语义 |
| **Slot** | Blueprint 内的最小拓扑节点；可被 Task 的 part align |
| **Observe** | Slot 上声明要观察的物理信号（如 ShellExec） |
| **Prop Definition** | Blueprint/Part 上的属性声明（类型 + 默认值 + 必填） |

## 3. Align 端（实例 / 动态）

| 术语 | 定义 |
|---|---|
| **Work** | 工程师的意图沙盒；声明 domain/blueprint ref + 编排 task DAG |
| **Task** | 1 blueprint + N parts 的执行单元；align 到 blueprint 的具体 slot |
| **Part** | Task 内的动态执行单元；align 到 Blueprint 的 slot；含 skill_context + probe |
| **ref** | 资源引用（@oxn / @prj 两种作用域） |
| **Align** | 实例化对齐（Part align Slot，Task align Blueprint，Work 编排 Tasks） |
| **Prop Assignment** | 在 Align 端对 Intent Prop 的具体赋值 |

## 4. 运行时

| 术语 | 定义 |
|---|---|
| **WorkspaceState** | Work 级 state.json（任务列表 + 编排状态） |
| **TaskState** | Task 级 state.json（part 执行历史 + probe 结果） |
| **frozen.json** | 验证后生成的只读判决快照（task 目录内） |
| **work-trace.jsonl** | Work 级追加写追踪日志 |
| **task-trace.jsonl** | Task 级追加写追踪日志 |
| **CONTEXT.md** | AI 可见的 task 工作上下文（**全量隔离**） |

## 5. 工具

| 术语 | 定义 |
|---|---|
| **OXN DSL** | OpenXenon 领域特定语言（`.oxn` 文件 + Langium grammar） |
| **OXN CLI** | OpenXenon 命令行入口（`oxn <command>`） |
| **Skill** | 嵌入到 AI 助手软件的命令手册（`/oxn-*`） |
| **Arsenal** | 资产库（v0.0.x 兼容，不在 v0.1 核心流程） |
| **Hall** | 工程师用的 Web 控制台（🔜 v0.2） |
| **Probe** | 物理观测 + 纯函数判定（fs_exists/shell_exec 等） |

## 6. 架构

| 术语 | 定义 |
|---|---|
| **L0 Kernel** | 纯逻辑推演，零 IO（Schema / Contract / Processor） |
| **L1 Foundation** | OXN DSL 解析 + Infra 适配（FsPort/PathPort/ProbePort） |
| **L2 Module** | 业务与工程模块层（Arsenal + Domain + Work 三个并列模块） |
| **L3 Runtime** | 入口层（CLI / Daemon / Skill / Hall） |
| **Intent-Align 范式** | Intent（声明）与 Align（实例）的二元对偶 — v0.1 架构灵魂 |

## 7. 文件位置约定

| 文件 | 位置 |
|---|---|
| Domain 资产 | `.openxenon/domains/<kebab-case>.oxn` |
| Blueprint 资产 | `.openxenon/blueprints/<name>.oxn` |
| Work 编排器 | `.openxenon/works/<work-name>/work.oxn` |
| Task 执行单元 | `.openxenon/works/<w>/tasks/<t>/task.oxn` |
| Workspace state | `.openxenon/works/<w>/state.json` |
| Task state | `.openxenon/works/<w>/tasks/<t>/state.json` |
| Task 判决快照 | `.openxenon/works/<w>/tasks/<t>/frozen.json` |
| Trace 日志 | `work-trace.jsonl` / `task-trace.jsonl` |
| AI 上下文 | `CONTEXT.md` |

## 8. 命名约定

| 类别 | 约定 | 示例 |
|---|---|---|
| Domain 名 | PascalCase | `MemberContext` |
| Domain 文件名 | kebab-case | `member-context.oxn` |
| Context Map alias | 简短 PascalCase | `Order` |
| Blueprint 名 | kebab-case | `dev-workflow` |
| Work 名 | kebab-case | `onboarding` |
| Task 名 | kebab-case | `register-member` |
| Part 名 | kebab-case | `build` |
| Slot 名 | kebab-case | `develop` |
| ref 作用域 | `@oxn` / `@prj` | `@oxn/probe/shell-exec` |

## 9. 废弃术语（**不要使用**）

| 旧术语 | 替代 |
|---|---|
| `noun` / `verb` | `term` (map 格式) |
| `domain_rules { rule }` | `invariant { "..." }` |
| `use_domain` / `use_blueprint` | `domain "X" ref "..."` / `blueprint "X" ref "..."` |
| `task "X" align "Y.Z"` | `task "X" { blueprint "Y"; part "Z" }` |
| `inject "X"` | `task "X" { domain "X" }` |
| `expectation` / `rule`（Blueprint 内） | **删除**（验证标准由 Probe 承载） |
| `Stage` | `Slot`（Blueprint）/ `Part`（Work） |
| `Map` / `Maps to` | **删除**（cross-domain 通过 context_map.imports） |
| YAML / JSON Blueprint | **OXN DSL 单一权威** |
