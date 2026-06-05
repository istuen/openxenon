# OpenXenon

> **人机对齐框架** — 沉淀工程师意图与验证标准，积累工程资产，约束 AI 边界并确定性构建软件。

## 0. 一句话总结

OpenXenon 通过 **Intent-Align 范式** 把"业务/技术声明"和"动态编排/执行"严格区分：

- **Intent**（声明/静态）：Domain（业务限界上下文）、Blueprint（技术流水线模板）
- **Align**（实例/动态）：Work（编排器）、Task（执行单元）、Part（零件）、Probe（验证）

工程师写 Intent，AI 在 Align 中执行，Core 物理观测 + 纯函数判决。

## 1. 探索目标

0.X 阶段，OpenXenon 在探索一个核心问题：

> **工程师的经验，能否成为驾驭 AI 的能力？**

将工程师的审查经验前置为结构化资产与验证标准，让 AI 在约束边界内执行，由 Core Engine 协助工程师判定 AI 执行符合工程师意图的产物。

## 2. 核心角色

OpenXenon 的架构建立在三个核心角色的职责分离之上：

| 角色 | 定位 | 职责 | 数据边界 |
|---|---|---|---|
| **工程师** | 决策者与验收者 | 定义意图、设定验证标准、审查最终结果 | 拥有全局视野，定义系统资产，验收执行产出 |
| **AI 助手** | 调度者与执行者 | 接收任务目标，选择执行策略，调度 Core CLI，实施代码操作 | 接收任务级目标与执行指令，**无法感知验证标准** |
| **Core Engine** | 判决者与记录者 | 编译资产、执行校验、记录状态 | 独占验证标准与执行结果，提供 CLI 供 AI 调用，输出客观判定 |

**交互原则**：

> 工程师通过 AI 助手软件与 AI 模型交互，定义规则并验收；AI 助手驱动流程并执行操作；Core 比对规则与事实。**AI 不了解标准，Core 不产生逻辑，工程师不介入实时审查。**

## 3. Intent-Align 范式（架构灵魂）

> 详细：[docs/core/intent-align.md](docs/core/intent-align.md)

| 层级 | Intent（声明 / 静态） | Align（实例 / 动态） | 关系 |
|---|---|---|---|
| **业务** | **Domain**（DDD 限界上下文：term / ban / invariant） | — | Domain 是 Align 引用的业务词典 |
| **技术** | **Blueprint**（slot 拓扑模板） | — | Blueprint 是 Align 引用的技术模板 |
| **编排** | — | **Work**（资源池 + task DAG） | Work 可引用多个 Domain + Blueprint |
| **执行** | Blueprint 内 **Slot** | **Part**（align 到 slot） | 1:N（一个 slot 可被多个 part align） |
| **观测** | Blueprint slot 的 **Observe** 数组 | **Probe**（align 到 observe） | 1:N |
| **数据** | **Prop Definition** | **Prop Assignment** | 1:1 |

**核心原则**：每一种实体要么是 Intent，要么是 Align，**不存在第三种状态**。

## 4. 四个核心实体

> 详细：[docs/core/concepts.md](docs/core/concepts.md)

| 实体 | 范式 | 定义 | 物理位置 |
|---|---|---|---|
| **Domain** | Intent（业务） | DDD 限界上下文，承载 term / ban / invariant / context_map | `.openxenon/domains/<kebab>.oxn` |
| **Blueprint** | Intent（技术） | 技术流水线模板，定义 slot 拓扑（DAG） | `.openxenon/blueprints/<name>.oxn` |
| **Work** | Align（编排） | 工程师的意图沙盒，声明 ref 池，编排 task DAG | `.openxenon/works/<work>/work.oxn` |
| **Task** | Align（执行） | 1 blueprint + N parts 的执行单元；align 到 blueprint 的具体 slot | `.openxenon/works/<w>/tasks/<t>/task.oxn` |

### 完整示例

```oxn
// .openxenon/domains/member-context.oxn （Intent：业务）
domain "MemberContext" {
  description = "会员限界上下文"

  term {
    "Member":   "注册会员实体",
    "Register": "提交注册表单"
  }

  ban { "User", "Customer" }

  invariant { "密码任何时候都不能明文存储" }
}
```

```oxn
// .openxenon/blueprints/dev-workflow.oxn （Intent：技术）
blueprint "dev-workflow" {
  description = "开发工作流：构建 → 测试 → 验证"
  version = 1

  slot "build" { deps = [] }
  slot "test"  { deps = ["build"] }
}
```

```oxn
// .openxenon/works/onboarding/work.oxn （Align：编排）
work "Onboarding" {
  context {
    goal = "完成新会员注册";
    loop_policy { max_iterations = 3 }
  }

  domain "MemberContext"   ref "@prj/domains/MemberContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "RegisterMember" {
    domain "MemberContext";
    blueprint "dev-workflow";

    part "build" { skill_context = "实现 Member 注册" }
    part "test"  { skill_context = "写 Member 注册测试" }
    deps = [];
  }
}
```

```oxn
// .openxenon/works/onboarding/tasks/register-member/task.oxn （Align：执行）
task "register-member" {
  domain "MemberContext";
  blueprint "dev-workflow";

  part "build" { skill_context = "实现 Member 注册，遵循 Member 命名，禁用 User/Customer" }
  part "test"  { skill_context = "写 Member 注册测试" }
}
```

## 5. L0-L3 四层架构

> 详细：[docs/architecture/overview.md](docs/architecture/overview.md)

```
┌────────────────────────────────────────────────┐
│ L3: Runtime（CLI / Daemon / Skill / Hall）     │
├────────────────────────────────────────────────┤
│ L2: Module（Arsenal + Domain + Work）         │
├────────────────────────────────────────────────┤
│ L1: Foundation（OXN DSL + Infra / Port）        │
├────────────────────────────────────────────────┤
│ L0: Kernel（Schema / Contract / Processor）     │
└────────────────────────────────────────────────┘
```

| 层级 | 核心约束 |
|---|---|
| L0 Kernel | 纯函数、零 IO、零状态 |
| L1 Foundation | DSL 解析 + 物理 IO 收口（FsPort/PathPort/ProbePort） |
| L2 Module | 业务与工程模块自治（Arsenal + Domain + Work） |
| L3 Runtime | 入口与外部交互（CLI / Daemon / Skill / Hall） |

> **关于 L2 命名**：L2 命名为 **Module** 而非 "Domain"——避免与 OXN DSL 中的 `Domain` 实体产生歧义。详见 [ADR-0006](docs/adr/0006-l2-named-module.md)。

**核心流转**：
- **编排流**：`Domain + Blueprint (Intent) ─[Work 引用]─▶ Task DAG (Align)`
- **执行流**：`Task.part ─[align Slot]─▶ AI 写代码 ─[Probe 验证]─▶ frozen.json`

## 6. 开发计划

| 版本 | 目标 | 核心功能 | 状态 |
|---|---|---|---|
| **v0.1** | **Intent-Align 范式落地** | Domain / Blueprint / Work / Task 四类实体；term/ban/invariant；ref 池；声明式 align | ✅ |
| v0.2 | 运行时监控与容错 | 守护进程、文件监听、状态熔断、异常恢复；Slot 契约；language-ban-checker Probe | 🔜 |
| v0.3 | 多 AI 助手适配 | 适配多种 AI 助手软件 | 📋 |
| v0.4 | 多运行时 | 支持 Node.js（当前仅 Bun） | 📋 |

## 7. 快速开始

> 完整指南：[docs/guides/getting-started.md](docs/guides/getting-started.md)

```bash
# 1. 构建与初始化
pnpm install && pnpm build
./dist/oxn init

# 2. 定义 Domain（业务 Intent）
./dist/oxn domain create --name MemberContext
# 编辑 .openxenon/domains/member-context.oxn
./dist/oxn domain validate --name MemberContext

# 3. 准备 Blueprint（技术 Intent）
mkdir -p .openxenon/blueprints
cat > .openxenon/blueprints/dev-workflow.oxn <<'EOF'
blueprint "dev-workflow" {
  description = "开发工作流"
  version = 1
  slot "build" { deps = [] }
  slot "test"  { deps = ["build"] }
}
EOF

# 4. 创建 Work（编排 Align）
./dist/oxn work create --name onboarding
# 编辑 .openxenon/works/onboarding/work.oxn
# 加 domain ref + task 编排块

# 5. 创建 Task（执行 Align）
./dist/oxn work add-task \
  --work-name onboarding \
  --task-name register-member \
  --blueprint dev-workflow \
  --domain MemberContext

# 6. 获取 AI 上下文（全量隔离：只看 align 到的 domain）
./dist/oxn work context --work onboarding --task register-member --json

# 7. AI 执行（在 AI 助手软件中）
# (按 taskParts 顺序写代码，遵守 allowedLanguage)

# 8. 推进状态机
./dist/oxn work run    --work-file .openxenon/works/onboarding/work.oxn --json
./dist/oxn work submit --work-name onboarding --task register-member --json
./dist/oxn work status --work-name onboarding --json

# 9. 审查 frozen.json
cat .openxenon/works/onboarding/tasks/register-member/frozen.json
```

## 8. 自举验证

| 级别 | 定义 | 状态 |
|---|---|---|
| L1 编译自举 | `pnpm build` → `oxn` 可执行 | ✅ |
| L2 资产自举 | Domain/Blueprint/Work/Task 全链路跑通 | ✅ |
| L2+ DSL 自举 | Grammar → Schema → Validator → Generator 联动 | ✅ |
| L3 质量自举 | OpenXenon 自身开发过程通过 OpenXenon 管理 | 🔜 0.2 目标 |

**测试**：414/414 通过（33 个测试文件，1525 expect calls）

## 9. 文档

- [docs/README.md](docs/README.md) — 文档入口
- [docs/core/](docs/core/) — 核心理念与概念
  - [philosophy.md](docs/core/philosophy.md) — 核心理念
  - [intent-align.md](docs/core/intent-align.md) — Intent-Align 范式
  - [concepts.md](docs/core/concepts.md) — 4 个核心实体
  - [terminology.md](docs/core/terminology.md) — 术语表
- [docs/architecture/](docs/architecture/) — 架构
  - [overview.md](docs/architecture/overview.md) — L0-L3 四层
  - [domain.md](docs/architecture/domain.md) — Domain 详解
  - [blueprint.md](docs/architecture/blueprint.md) — Blueprint 详解
  - [work-and-task.md](docs/architecture/work-and-task.md) — Work + Task 详解
  - [state.md](docs/architecture/state.md) — 双层 state.json
  - [information-hiding.md](docs/architecture/information-hiding.md) — 信息隐藏原则
- [docs/reference/](docs/reference/) — 参考
  - [oxn-dsl.md](docs/reference/oxn-dsl.md) — OXN DSL 完整语法
  - [cli-reference.md](docs/reference/cli-reference.md) — CLI 命令
  - [state-schema.md](docs/reference/state-schema.md) — state.json schema
  - [probe-types.md](docs/reference/probe-types.md) — Probe 类型
- [docs/guides/](docs/guides/) — 指南
  - [getting-started.md](docs/guides/getting-started.md) — 5 分钟跑通
  - [ddd-workflow.md](docs/guides/ddd-workflow.md) — 端到端示例
  - [probe-development.md](docs/guides/probe-development.md) — 自定义 Probe
  - [troubleshooting.md](docs/guides/troubleshooting.md) — 故障排查
- [docs/adr/](docs/adr/) — 架构决策记录
- [docs/blog/](docs/blog/) — 博文与随笔
- [docs/changelog/CHANGELOG.md](docs/changelog/CHANGELOG.md) — 变更日志

## License

MIT
