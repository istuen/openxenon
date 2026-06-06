# OpenXenon

> **人机对齐框架** — 沉淀工程师意图与验证标准，积累工程资产，约束 AI 边界并确定性构建软件。

## 0. 一句话总结

> **三轴分离，主导权不交叉，证明不可绕过。**

OpenXenon 通过 **IAP 范式（Intent-Align-Proof）** 把"业务/技术声明"与"动态编排/执行"以及"产物是否真的满足意图"严格区分到三轴上：

- **Intent 轴（声明/静态）**：Domain（业务限界上下文）、Blueprint（技术流水线模板）— 工程师主定
- **Align 轴（实例/动态）**：Work（编排器）、Task（执行单元）、Part（零件）— AI 主导
- **Proof 轴（证明/判定）**：Probe（验证）+ Proof(Verdict) — Core Engine 主给

**工程师写 Intent，AI 在 Align 中执行，Core Engine 物理观测 + 纯函数判决，三轴主导权不交叉，证明不可被 `--force` 绕过。**

## 1. 探索目标

0.X 阶段，OpenXenon 在探索一个核心问题：

> **工程师的经验，能否成为驾驭 AI 的能力？**

将工程师的审查经验前置为结构化资产与验证标准，让 AI 在约束边界内执行，由 Core Engine 协助工程师判定 AI 执行符合工程师意图的产物。

## 2. 三轴主导权

OpenXenon 的架构灵魂是 **IAP 三轴主导权**——工程师、AI、Core Engine 分别在各自轴上**主导**，在其他轴上**协作**而不僭越：

| 主导轴 | 主导者 | 职责 | 协作方 | 对抗机制 |
|---|---|---|---|---|
| **Intent 轴** | **工程师** | 定义 Domain term / Blueprint slot / Probe 标准 | AI 补全意图细节 + Core 校验合法性 | Domain term 锁定边界 |
| **Align 轴** | **AI** | 编排 Work / Task 序列、选择 Part、声明 Probe | 工程师审核 + Core 约束 | Blueprint slot 锁定路径 |
| **Proof 轴** | **Core Engine** | 产出 Proof(Verdict)；Kernel 裁判 + Infra 法医 + Daemon 法警 | AI 诊断 + 工程师决策 | Daemon 逃逸机制阻止假完成 |

**Core Engine 内部三模块**（证明轴的执行机制）：

| 模块 | 定位 | 职责 | 约束 |
|---|---|---|---|
| **Kernel** | 裁判 | 纯逻辑验证，零 IO | 不允许 `fs.existsSync()` 等副作用 |
| **Infra** | 法医 | 副作用 / IO，获取事实 | 只回答事实，不做判定 |
| **Daemon** | 法警 | 运行时管理 + **逃逸机制** | Probe FAIL 时阻止 Work 进入 done |

**交互原则（三轴主导权）**：

> **工程师**主定 Intent——Domain 与 Blueprint 的**唯一合法生产者**，持有业务语义与技术意图。
> **AI** 主导 Align——把 Intent 展开为 Work / Task / Part 编排与选件。
> **Core Engine** 主给 Proof——通过 Kernel 裁判 + Infra 法医 + Daemon 法警三模块，判定 AI 产物是否真的满足工程师意图。
>
> **主导权不交叉；证明不可被 `--force` 绕过。**

**IAP 纯洁性约束**（三模块的边界）：

- Infra **不能**绕过 Daemon 自我宣布完成（行政不能自己给自己盖章）
- Daemon **不能**修改 Kernel 的规则（司法不能立法）
- Kernel **不能**直接执行 Task（立法不能行政）

> 详见 [docs/core/iap-paradigm.md](docs/core/iap-paradigm.md) 第三节"Core Engine：证明轴的执行机制"

## 3. IAP 范式（架构灵魂）

> 详细：[docs/core/iap-paradigm.md](docs/core/iap-paradigm.md)（IAP 三轴权威指南）
> 子集视图：[docs/core/intent-align.md](docs/core/intent-align.md)（IAP 的 Intent/Align 两轴详解）

| 层级 | Intent 轴（声明/静态） | Align 轴（实例/动态） | Proof 轴（证明/判定） | 关系 |
|---|---|---|---|---|
| **业务** | **Domain**（DDD 限界上下文：term / ban / invariant） | — | — | Domain 是 Align 引用的业务词典 |
| **技术** | **Blueprint**（slot 拓扑模板 + Probe 标准） | — | — | Blueprint 是 Align 引用的技术模板 + Proof 引用 Probe 标准 |
| **编排** | — | **Work**（资源池 + task DAG） | — | Work 可引用多个 Domain + Blueprint |
| **执行** | Blueprint 内 **Slot** | **Part**（align 到 slot） | — | 1:N（一个 slot 可被多个 part align） |
| **观测** | Blueprint slot 的 **Observe** 数组 | **Probe**（align 到 observe） | — | 1:N |
| **判定** | Probe 标准（from Blueprint） | Artifact 事实（from Task 执行） | **Proof(Verdict)** | Proof 是 Intent 与 Align 交叉汇合的产物 |

**核心原则**：每一种实体落在 Intent / Align / Proof **三轴之一**；**Proof 是独立第三轴**，不是 Align 轴的附属物。

### 逃逸机制（Proof 轴的核心能力）

> 当 Kernel 判定 Probe FAIL 时，**Daemon 触发逃逸**——这是 IAP 范式阻止"假完成"的终极防线，**无 `--force` 绕过**：

1. **预警**（notify）— 通知工程师与 AI "执行结果未达预期"
2. **阻止**（block）— Work 保持 `running` 状态，不允许进入 `done`
3. **诊断**（diagnose）— 提供意图→对齐→证明的完整链路快照

```json
{
  "work": "trial-deploy",
  "task": "deploy-prod",
  "proof": {
    "verdict": "FAIL",
    "probe": "@oxn/probes/fs-exists",
    "expected": "found",
    "actual": "not_found",
    "escape_action": "BLOCK_DONE"
  }
}
```

## 4. 五个核心实体

> 详细：[docs/core/concepts.md](docs/core/concepts.md)

| 实体 | 所属轴 | 主导者 | 定义 | 物理位置 |
|---|---|---|---|---|
| **Domain** | Intent | 工程师 | DDD 限界上下文，承载 term / ban / invariant / context_map | `.openxenon/domains/<kebab>.oxn` |
| **Blueprint** | Intent | 工程师 | 技术流水线模板，定义 slot 拓扑（DAG） + Probe 标准 | `.openxenon/blueprints/<name>.oxn` |
| **Work** | Align | AI | 工程师的意图沙盒，声明 ref 池，编排 task DAG | `.openxenon/works/<work>/work.oxn` |
| **Task** | Align | AI + Core | 1 blueprint + N parts 的执行单元；align 到 blueprint 的具体 slot | `.openxenon/works/<w>/tasks/<t>/task.oxn` |
| **Proof** | Proof | Core Engine | Probe 标准（Intent）⊕ Artifact 事实（Align）→ Verdict；Proof 是独立第三轴的产出 | `.openxenon/works/<w>/tasks/<t>/proof.json` |

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
│ L2: Module（Builtin + Domain + Work）          │
├────────────────────────────────────────────────┤
│ L1: Foundation（OXN DSL + Infra / Port）        │
├────────────────────────────────────────────────┤
│ L0: Kernel（Schema / Contract / Processor）     │
└────────────────────────────────────────────────┘
```

| 层级 | 核心约束 | IAP 角色 |
|---|---|---|
| L0 Kernel | 纯函数、零 IO、零状态 | **Core Engine / Kernel（裁判）**：纯逻辑验证 |
| L1 Foundation | DSL 解析 + 物理 IO 收口（FsPort/PathPort/ProbePort） | **Core Engine / Infra（法医）**：只获取事实，不做判定 |
| L2 Module | 业务与工程模块自治（Builtin + Domain + Work） | 资产层：Domain / Blueprint / Work / Task 落盘位置 |
| L3 Runtime | 入口与外部交互（CLI / Daemon / Skill / Hall） | **Core Engine / Daemon（法警）**：运行时 + 逃逸机制 |

> **关于 L2 命名**：L2 命名为 **Module** 而非 "Domain"——避免与 OXN DSL 中的 `Domain` 实体产生歧义。详见 [ADR-0006](docs/adr/0006-l2-named-module.md)。
>
> **关于 v0.0.x Arsenal 教训**：v0.0.x Arsenal 时代，Core Engine 僭越了 Intent 轴（`arsenals/builtin.ts` 硬编码侵入工程师意图）和 Align 轴（`part-port.ts` 替代 loader 做对齐），导致三轴混权。v0.1 的 `cleanup-arsenal-remaining-coupling` Change 本质上是将主导权归还各轴——这是 IAP 范式最好的反面教材。

### Y 型生产权链

IAP 范式的生产权不是直线，而是 **Y 型**——Intent 轴与 Align 轴并行展开，在 Proof 轴汇合：

```
            Intent轴                       Align轴
       Domain(.oxn)                    Work(.oxn)
            │                              │
            ▼                              ▼
       Blueprint(.oxn)               Task → Artifact
            │                              │
            │   Probe标准                  │    Artifact事实
            │   (from Intent 轴)            │    (from Align 轴)
            └──────────────┬─────────────────┘
                           │
                           ▼
                       Proof轴
                    Proof(Verdict)
                Kernel + Infra + Daemon
```

**核心流转**：
- **Intent 轴**：工程师产出 Domain + Blueprint，锁定业务语言与技术拓扑
- **Align 轴**：AI 在 Blueprint slot 约束下编排 Work → Task → Part → Artifact
- **Proof 轴**：Core Engine 把 Probe 标准（Intent）与 Artifact 事实（Align）汇合，产出 Verdict

## 6. 开发计划

| 版本 | 目标 | 核心功能 | 状态 |
|---|---|---|---|
| **v0.1** | **IAP 范式（Intent-Align-Proof）落地** | Domain / Blueprint / Work / Task / Proof 五类实体；term/ban/invariant；ref 池；声明式 align；Core Engine 三模块（Kernel/Infra/Daemon） | ✅ |
| v0.2 | 运行时监控与容错 | 守护进程、文件监听、状态熔断、异常恢复；**Daemon 逃逸机制**（预警 + 阻止 + 诊断）；Slot 契约；language-ban-checker Probe | 🔜 |
| v0.3 | 多 AI 助手适配 | 适配多种 AI 助手软件 | 📋 |
| v0.4 | 多运行时 | 支持 Node.js（当前仅 Bun） | 📋 |

### 未来硬约束（v0.2+ 门控）

> 当 Work 流程完全跑通后，以下门控必须从软约束升级为硬约束。第四条是 **IAP 范式的终极防线**——如果证明可被 `--force` 绕过，整个 IAP 就名存实亡。

| 门控点 | 软约束（当前） | 硬约束（v0.2+ 目标） |
|---|---|---|
| Domain → Blueprint | Blueprint 可引用未定义的 term | Kernel 拒绝编译 |
| Blueprint → Work | Work 可引用未 validate 的 Blueprint | `oxn work create` 必须传 validate 通过的 Blueprint |
| Work → Task | Task Part 可不在 Blueprint slot 中声明 | Task Part 必须匹配 Blueprint slot |
| **Probe → Proof** | Probe 声明后无强制验证 | **Daemon 逃逸机制阻止未通过 Proof 的 Work 进入 done；无 `--force` 绕过** |

## 7. 快速开始

> 完整指南：[docs/guides/getting-started.md](docs/guides/getting-started.md)

```bash
# 1. 构建与初始化
pnpm install && pnpm build
./dist/oxn init

# 2. 定义 Domain（业务 Intent）
./dist/oxn domain create MemberContext
# 编辑 .openxenon/domains/member-context.oxn
./dist/oxn domain validate MemberContext

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
  - [iap-paradigm.md](docs/core/iap-paradigm.md) — **IAP 范式理念指南（三轴权威文档）**
  - [philosophy.md](docs/core/philosophy.md) — 核心理念
  - [intent-align.md](docs/core/intent-align.md) — IAP 范式的 Intent/Align 两轴子集视图
  - [concepts.md](docs/core/concepts.md) — 5 个核心实体
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
  - [0002-intent-align-paradigm.md](docs/adr/0002-intent-align-paradigm.md) — ⚠️ 已被 ADR-0007 取代
  - [0007-iap-three-axes.md](docs/adr/0007-iap-three-axes.md) — IAP 三轴范式升级决策
- [docs/blog/](docs/blog/) — 博文与随笔
- [docs/changelog/CHANGELOG.md](docs/changelog/CHANGELOG.md) — 变更日志

## License

MIT
