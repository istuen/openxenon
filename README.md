# OpenXenon

> OpenXenon 是一个人机对齐框架——沉淀工程师意图与验证标准，积累工程资产，约束 AI 边界并确定性构建软件。

## 1. 探索目标

0.X 阶段，我们在探索一个核心问题：

**工程师的经验，能否成为驾驭 AI 的能力？**

将工程师的审查经验前置为结构化资产与验证标准，让 AI 在约束边界内执行，由 Core Engine 协助工程师判定 AI 执行符合工程师意图的产物。

## 2. 核心角色与职责

OpenXenon 的架构建立在三个核心角色的职责分离之上：

| 角色             | 定位           | 职责                                                           | 数据边界                                                  |
| ---------------- | -------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| **工程师**       | 决策者与验收者 | 定义意图、设定验证标准、审查最终结果、通过 Hall 可视化项目状态 | 拥有全局视野，定义系统资产，验收执行产出                  |
| **AI 助手**      | 调度者与执行者 | 接收任务目标，选择执行策略，调度 Core CLI，实施代码操作        | 接收任务级目标与 target+action 指令，**无法感知验证标准** |
| **Core  Engine** | 判决者与记录者 | 编译资产、下发指令、执行校验、记录状态                         | 独占验证标准与执行结果，提供 CLI 供 AI 调用，输出客观判定 |

**交互原则**：工程师通过 AI 助手软件与 AI 模型交互，定义规则并验收；AI 助手驱动流程并执行操作；Core 比对规则与事实。AI 不了解标准，Core 不产生逻辑，工程师不介入实时审查。

## 3. 核心概念

> v0.1 起，OpenXenon 引入 **DDD 双层架构**（参见 [v0.1 架构说明](docs/architecture/v01-ddd-dual-layer.md)）。
> 核心概念从 v0.0.x 的"三层资产"扩展为"四层领域"。

### 3.1 概念层级表（v0.1）

| 概念         | 定位     | 定义                                                | 物理归属                                       |
| ------------ | -------- | --------------------------------------------------- | ---------------------------------------------- |
| **Domain**   | 业务     | DDD 限界上下文，承载语言 (noun/verb/ban) 与业务规则 | `.openxenon/domains/<kebab>.oxn`               |
| **Blueprint**| 资产     | 技术流水线模板，定义 slot 拓扑（DAG）              | `.openxenon/blueprints/<name>.oxn`             |
| **Probe**    | 资产     | 原子检查，物理观测 + 纯函数判定                     | `.oxn` 资产（builtin / arsenal）               |
| **Work**     | 工作区   | 工程师的意图沙盒，编排 use_domain + use_blueprint + task DAG | `.openxenon/works/<work-name>/work.oxn` |
| **Task**     | 工作区   | 绑定 1 份 Blueprint + 注入 1+ Domain 的执行单元    | `.openxenon/works/<work>/tasks/<task>/task.oxn`|
| **Part**     | 资产     | 零件，target/action/spec/probes 四字段（Arsenal）   | Arsenal 资产                                   |
| **State**    | 运行时   | 双层 state.json（workspace + task）                 | `.openxenon/works/<w>/state.json`              |
| **CONTEXT**  | 运行时   | AI 可见的 task 工作上下文（**全量隔离**）           | `.openxenon/works/<w>/CONTEXT.md`              |
| **frozen.json** | 运行时 | 验证后生成的判决书                                | task 目录内                                    |
| **Hall**     | UI       | 研讨厅，工程师查看任务状态的 Web 控制台             | Web UI                                         |

### 3.2 Intent-Align 对偶（v0.1 核心范式）

| 层级 | Intent（静态/声明） | Align（动态/实例） | 关系 |
| ---- | ------------------- | ------------------ | ---- |
| 系统 | **Blueprint**（DDD 限界上下文 + slot 拓扑） | **Work**（工程意图沙盒） | 1:N（一个 Blueprint 可被多 work 用） |
| 阶段 | **Slot**（业务阶段/能力插槽） | **Task**（执行步骤） | 1:N（一个 Blueprint slot 可被多 task align） |
| 验证 | **Observe**（业务观测点） | **Probe**（技术探测） | 1:N（一个 observe 可由多 probe 验证） |
| 数据 | **Prop Definition**（属性意图） | **Prop Assignment**（属性赋值） | 1:1 |

### 3.3 关键约束

- **资产层级关系**：`Probe → Part → Blueprint`（v0.0.x 保留）
- **Domain 隔离**：`oxn get-context` 只返回 task.inject 的 domain，**全量隔离**（v0.1）
- **Type 锁定铁律**：Work 的运行时类型与 Blueprint 的 type 属性强绑定（v0.0.x 保留）
- **边界与留痕原则**：OpenXenon 固化边界以指导 AI 工作，而非杜绝逃逸。系统通过 `frozen.json`、`work-trace.jsonl` 等不可篡改的快照记录全量证据，交由工程师最终判决。

## 4. 交互流程

### 4.1 资产构建流程

**交互链路：工程师 → Arsenal**

1. 工程师通过 `oxn forge` 定义 Probe、Part、Blueprint，产出存入 `drafts/` 目录
2. 工程师审查 Draft 资产内容
3. 工程师将审查通过的资产通过 `oxn arsenal promote` 提交为 Canonical，归入 `arsenal/` 目录

```
Forge (drafts/) ──[审查]──▶ Promote (arsenal/)
        ↓                          ↓
  drafts/<type>/           →    arsenal/<type>/
```

> 注：此阶段仅做 Schema 语法与结构校验，**不生成 frozen.json**。

### 4.2 任务执行流程

**交互链路：工程师 → AI 助手 (内部分化为 Main/Sub Agent)  → Core CLI → Sub Agent → 工程师**

1. **任务下达**：工程师通过 AI 助手软件里的 Skill（如 `/oxn-task`）下达任务目标
2. **实例化**：Main Agent 根据任务目标，自动选择匹配的 Blueprint（受 Work Type 强约束），通过 CLI 创建 Work 实例
3. **循环执行与动态绑定**：Main Agent 通过结构化指令与 Core CLI 交互，形成闭环：
   - Main Agent 调用 Core CLI 请求下一指令（`work next`），获取 `target` + `action`
   - Main Agent 将执行指令下发给 Sub Agent，Sub Agent 实施代码操作构建 Artifact
   - Main Agent 根据执行结果，通过 CLI CRUD 将具体产物路径动态绑定到 Work 空间内 Blueprint 的 Probe 参数中，完成从"抽象模板"到"具体实例"的映射
   - 提交验证（`work verify`），L1 Infra 探测，L0 Kernel 判决
   - **若验证通过，生成 `frozen.json` 等快照证据链**
4. **动态修正**：若执行漂移，Main Agent 可通过 CLI CRUD 调整 Blueprint，或基于 `frozen.json` 定位错误节点继续修正
5. **结果交付**：Sub Agent 执行完成后，交由 Main Agent 整理，交工程师审查最终产出

```
工程师 ──▶ Main Agent ──▶ Core CLI ──▶ Sub Agent ──▶ Main Agent ──▶ 工程师
  │          │              │            │            │            │
  │          │              │            │            │            │
  下达    实例化          返回指令      执行         汇总          验收
  目标    Work           (target+     构建        证据链         结果
                              action)   Artifact
                                    │
                            ┌───────┴───────┐
                            │               │
                      [L1 Infra探测]  [L0 Kernel判决]
                            │               │
                            └───────┬───────┘
                                    │
                      [验证通过] 生成证据链快照
```

## 5. 当前状态

版本: **v0.1** — DDD 双层架构落地

**自举验证**：

| 级别        | 定义                                       | 状态       |
| ----------- | ------------------------------------------ | ---------- |
| L1 编译自举 | `pnpm build` → `oxn forge probe` 可执行   | ✅          |
| L2 资产自举 | Forge→Task→Verify 全链路跑通              | ✅          |
| L2+ DSL 自举 | Grammar → Schema → Validator → Compiler 联动 | ✅          |
| L3 质量自举 | OpenXenon 自身开发过程通过 OpenXenon 管理 | 🔜 0.2 目标 |

**v0.1 已实现**（基于 [DDD 双层架构](docs/architecture/v01-ddd-dual-layer.md)）：

- **四层领域模型**：`Domain` / `Blueprint` / `Work` / `Task`（v0.1 新增 Domain 与 Task）
- **统一 OXN DSL 语法**：Grammar 增量化（Domain/Task 顶层实体），Zod schema 同步（向后兼容既有 Blueprint）
- **Intent-Align 对偶**：Blueprint/Work、Slot/Task、Observe/Probe、Prop 定义/赋值 一一对应
- **CLI 命令**：
  - `oxn domain {new,validate,list}` — DDD 限界上下文管理（v0.1 新增）
  - `oxn work task {new,status,list}` — workspace 内 task 生命周期（v0.1 新增）
  - `oxn get-context` — AI 上下文获取（v0.1 新增，**全量隔离**）
  - `oxn work migrate` — 旧 work 硬迁移工具（v0.1 新增）
- **双层 State**：`WorkspaceState`（work.oxn 级）+ `TaskState`（task.oxn 级）独立读写
- **既有能力保留**：
  - 5 份 builtin blueprint 零回归
  - CLI 直连模式（不依赖 Daemon）
  - Arsenal DRAFT→CANONICAL 生命周期
  - frozen.json 验证后快照
  - 内置资产编译进二进制
  - BUILTIN_PARTS：git-commit / create-branch / develop-feature
  - Part 是单文件（非目录），Probe 统一单文件存储
  - oxn arsenal fork / extract / unpack / repack
- **测试**：417/417 通过（33 个测试文件，1527 expect calls）

**v0.1 限制**：

- Slot inputs/outputs 契约未实装（v0.2 引入）
- language 约束不接 Probe（v0.2 引入 `language-ban-checker`）
- task 编排只支持串行 deps（v0.2 引入并行）

## 6. 开发计划

| 版本     | 目标             | 核心功能                                |
| -------- | ---------------- | --------------------------------------- |
| **v0.1** | **DDD 双层落地** | ✅ Domain/Task/Work 三层领域 + 上下文隔离 |
| v0.2     | 运行时监控与容错 | 守护进程、文件监听、状态熔断、异常恢复；Slot 契约；language-ban-checker Probe |
| v0.3     | 多 AI 助手适配   | 适配多种 AI 助手软件（当前仅 OpenCode） |
| v0.4     | 多环境适配       | 支持 Node.js（当前仅 Bun）              |

## 7. 快速开始

```bash
# 1. 构建与初始化
pnpm install && pnpm build
./dist/oxn init

# 2. v0.1 新增：定义一个 DDD 限界上下文
./dist/oxn domain new --name MemberContext
# 编辑 .openxenon/domains/member-context.oxn，填写 language/domain_rules/context_map
./dist/oxn domain validate --name MemberContext

# 3. 资产库（v0.0.x 流程，仍可用）
./dist/oxn arsenal list
./dist/oxn forge probe --save '<yaml>' --name my-check
./dist/oxn arsenal promote probes/my-check

# 4. v0.1 新增：在 work 中引用 domain + blueprint
mkdir -p .openxenon/blueprints
# 编辑 .openxenon/blueprints/dev-workflow.oxn
mkdir -p .openxenon/works/onboarding
cat > .openxenon/works/onboarding/work.oxn <<'EOF'
work "Onboarding" {
  context { goal = "test"; constraints = []; loop_policy { max_iterations = 3 } }
  use_domain "MemberContext";
  use_blueprint "dev-workflow";
  task "register" align "MemberContext.Register" { deps = [] }
}
EOF

# 5. v0.1 新增：创建 task（绑 1 blueprint + 注入 1 domain）
./dist/oxn work task new --work onboarding --task register \
  --blueprint dev-workflow --inject MemberContext

# 6. v0.1 新增：获取 AI 上下文（全量隔离）
./dist/oxn get-context --work onboarding --task register

# 7. 既有：执行 work（leader 流程，v0.1 也兼容）
./dist/oxn leader new --name onboarding --blueprint-file .openxenon/blueprints/dev-workflow.oxn
./dist/oxn leader run --work-file .openxenon/works/onboarding/work.oxn
./dist/oxn leader submit --work-name onboarding

# 8. v0.1 迁移工具（旧 work.oxn 升级到新格式）
./dist/oxn work migrate --dry-run
./dist/oxn work migrate
```

## 8. 架构概要

OpenXenon 采用严格的 L0-L3 四层架构宪法，确保核心逻辑真空、物理副作用收口、领域职责分离。

### 8.1 分层架构图

```
┌─────────────────────────────────────────────────────────────────┐
│ L3: Runtime                                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│ │    CLI    │ │  Daemon   │ │   Skill   │ │   Hall    │         │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ L2: Domain Service                                                │
│ ┌──────────────────────────┐ ┌──────────────────────────────┐  │
│ │        Arsenal           │ │            Work              │  │
│ │ 管理 Blueprint/Part/Probe │ │   管理 Artifact / Snapshot    │  │
│ │ - Forge                  │ │ - 执行动作构建 Artifact      │  │
│ │ - Promote                │ │ - 提交验证生成 frozen.json    │  │
│ └──────────────────────────┘ └──────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ L1: Foundation                                                    │
│ ┌──────────────────────┐ ┌──────────────────────────────────┐  │
│ │       OXN DSL        │ │             Infra                │  │
│ │ - Grammar/Parser     │ │ - FsPort/PathPort/ProbePort       │  │
│ │ - CRUD               │ │ - 收口所有 IO                    │  │
│ └──────────────────────┘ └──────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ L0: Kernel                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐    │
│ │    Schema    │ │   Contract   │ │       Processor        │    │
│ └──────────────┘ └──────────────┘ └────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 核心流转

| 流转类型   | 路径                                                                                                    | 说明             |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---------------- |
| **资产流** | `Drafts ─[Promote]─▶ Arsenal`                                                                           | 资产生命周期管理 |
| **执行流** | `Work ─[Type绑定]─▶ Blueprint → 获取 Part → 构建 Artifact`                                              | 运行时任务执行   |
| **验证流** | `Main Agent CRUD 绑定实例 ─[SubAgent执行]─▶ Probe ─[L1 Infra探测]─▶ L0 Kernel判决 ─▶ L2 生成证据链快照` | 验证与留痕       |

### 8.3 层级职责说明

- **L0 Kernel**：纯逻辑推演，零 IO。基于 Schema 校验事实，**输出 Verdict 纯数据**，不生成任何文件
- **L1 Foundation**：
  - *OXN DSL*：提供语法解析与 CLI CRUD，确保 `.oxn` 文件合法性
  - *Infra*：收口文件系统与进程 IO，负责物理 Artifact 的观测
- **L2 Domain**：
  - *Arsenal*：围绕 Blueprint/Part/Probe 提供 Forge 与 Promote 能力
  - *Work*：围绕 Blueprint Type 提供运行时调度与独立工作区间管理
- **L3 Runtime**：CLI、Daemon、Skill、Hall 等系统入口，组装一切并驱动工作流

## 9. 文档

### 中文

- [快速开始](docs/zh-cn/guides/getting-started.md)
- [核心概念](docs/zh-cn/architecture/concepts.md)
- [CLI 参考](docs/zh-cn/guides/cli-reference.md)
- [架构设计](docs/zh-cn/architecture/)
  - [DDD 双层架构 (v0.1)](docs/zh-cn/architecture/ddd-dual-layer.md) — Domain/Task/Work 详解
- [故障排查](docs/zh-cn/guides/troubleshooting.md)

### 英文

- [English docs](docs/en/)

### 根级架构（最新 v0.1 文档）

- [v0.1 DDD Dual-Layer Architecture](docs/architecture/v01-ddd-dual-layer.md)
- [Project Domain Index](docs/architecture/project-domains.md)
- [Unification Notes (v0.0.27)](docs/architecture/unified.md)

## License

MIT
