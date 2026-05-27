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

### 3.1 概念层级表

| 概念 | 定位 | 定义 | 物理归属 |
|------|------|------|---------|
| **Blueprint** | Class | 任务工程图，定义执行拓扑（DAG）与 Type | `arsenal/blueprints/<name>/` |
| **Part** | Class | 零件，包含 target/spec/action/probes 四字段 | `arsenal/parts/` |
| **Probe** | Class | 原子检查，物理观测 + 纯函数判定 | `arsenal/probes/` |
| **Work** | Instance | Blueprint Type 的运行时实例，独立执行沙箱 | `work/<type>/<type-id>/` |
| **Artifact** | Instance | Work 执行产生的物理产物，被 Probe 观测的对象 | `work/<type>/<type-id>/` |
| **frozen.json** | Snapshot | 验证后生成的判决书，不可篡改的回溯锚点 | `work/<type>/<type-id>/` |
| **Hall** | UI | 研讨厅，工程师查看任务状态的 Web 控制台 | Web UI |

### 3.2 Part 四字段结构

| 字段 | 可见性 | 含义 |
|------|--------|------|
| `target` | 对 AI 可见 | 约束执行的作用域 |
| `action` | 对 AI 可见 | 下发给 AI 的执行指令 |
| `spec` | 对 AI 不可见 | 工程师对意图的结构化约束 |
| `probes` | 对 AI 不可见 | 校验该工序是否完成的探针集合 |

### 3.3 关键约束

- **资产层级关系**：`Probe → Part → Blueprint`
- **Type 锁定铁律**：Work 的运行时类型与 Blueprint 的 type 属性强绑定。Task 类型的 Work 只能加载 Task 类型的 Blueprint。

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

**交互链路：工程师 → AI 助手 → Core CLI → AI 助手 → 工程师**

1. **任务下达**：工程师通过 AI 助手软件里的 Skill（如 `/oxn-task`）下达任务目标
2. **实例化**：AI 助手根据任务目标，自动选择匹配的 Blueprint（受 Work Type 强约束），通过 CLI 创建 Work 实例
3. **循环执行**：AI 助手通过结构化指令与 Core CLI 交互，形成闭环：
   - AI 助手调用 Core CLI 请求下一指令（`work next`）
   - Core 返回 `target` + `action`，**隐藏 spec/probes 验证标准**
   - AI 助手执行代码操作，构建 Artifact
   - AI 助手调用 Core CLI 提交验证（`work verify`）
   - L1 Infra 探测 Artifact，L0 Kernel 执行 Probes 校验并判定成败
   - **若验证通过，生成 `frozen.json` 作为不可篡改的判决书快照**
4. **动态修正**：若执行漂移，AI 可通过 CLI CRUD 调整 Blueprint，或基于 `frozen.json` 定位错误节点继续修正
5. **结果交付**：AI 助手执行完成后，交由工程师审查最终产出

```
工程师 ──▶ AI 助手 ──▶ Core CLI ──▶ AI 助手 ──▶ 工程师
  │          │           │          │           │
  │          │           │          │           │
  下达    实例化       返回指令     执行       验收
  目标    Work        (隐藏标准)   构建       结果
                                      │
                              ┌───────┴───────┐
                              │               │
                        [L1 Infra探测]  [L0 Kernel判决]
                              │               │
                              └───────┬───────┘
                                      │
                              [验证通过] 生成 frozen.json
```

## 5. 当前状态

版本: 0.0.27 — 探索阶段

**自举验证**：

| 级别        | 定义                                      | 状态       |
| ----------- | ----------------------------------------- | ---------- |
| L1 编译自举 | `pnpm build` → `oxn forge probe` 可执行   | ✅          |
| L2 资产自举 | Forge→Task→Verify 全链路跑通              | ⚠️ 待验证   |
| L3 质量自举 | OpenXenon 自身开发过程通过 OpenXenon 管理 | 🔜 0.2 目标 |

**已实现**：

- CLI 直连模式（不依赖 Daemon）
- Forge 约束 + AI 生成 Draft
- Arsenal DRAFT→CANONICAL 生命周期
- Blueprint → frozen.yaml 编译管线（仅作 Schema 校验用）
- 内置资产编译进二进制
- Part 是单文件（非目录），Probe 统一单文件存储
- BUILTIN_PARTS：git-commit / create-branch / develop-feature
- _version 内置版本号，min_version 编译期校验
- oxn arsenal fork 创建 Part 变体
- oxn arsenal extract 从 Task 提取历史版本
- Forge unpack/repack 解包编辑
- **Arsenal 采用类型优先的目录结构，状态嵌套于类型之下**：
  - `arsenal/probes/` (正式) 与 `arsenal/probes/drafts/` (草稿)
  - `arsenal/parts/` (正式) 与 `arsenal/parts/drafts/` (草稿)
  - `arsenal/blueprints/<name>/` (正式) 与 `arsenal/blueprints/drafts/<name>/` (草稿)
- **Work 采用 Type 锁定的独立工作区间**：`work/<type>/<type-id>/`
- **frozen.json 改为验证后生成的快照**，而非执行前预生成

**0.1 目标 = L2 通过**

## 6. 开发计划

| 版本     | 目标             | 核心功能                                |
| -------- | ---------------- | --------------------------------------- |
| **v0.1** | 核心闭环验证     | 跑通全流程，资产与产物形成良性循环      |
| **v0.2** | 运行时监控与容错 | 守护进程、文件监听、状态熔断、异常恢复  |
| **v0.3** | 多 AI 助手适配   | 适配多种 AI 助手软件（当前仅 OpenCode） |
| **v0.4** | 多环境适配       | 支持 Node.js（当前仅 Bun）              |

## 7. 快速开始

```bash
# 1. 构建与初始化
pnpm install && pnpm build
./dist/oxn init

# 2. 查看资产库
./dist/oxn arsenal list

# 3. 构建资产（定义意图与标准）- 产出均进入 drafts 目录
./dist/oxn forge probe --save '<yaml>' --name my-check   # 产出: drafts/probes/my-check.oxn
./dist/oxn forge part --save '<yaml>' --name my-part     # 产出: drafts/parts/my-part.oxn
# 提升为正式资产 (从 drafts 移至类型根目录)
./dist/oxn arsenal promote probes/my-check                # 移动: drafts/ → arsenal/probes/my-check.oxn
./dist/oxn arsenal promote parts/my-part                 # 移动: drafts/ → arsenal/parts/my-part.oxn

# 4. 创建 Part 变体（Fork）
./dist/oxn arsenal fork part git-commit --name git-commit-jira

# 5. 创建 Work（必须指定与 Blueprint 一致的 type）
./dist/oxn work new my-work --type task --blueprint new-task-flow  # 产出: work/task/my-work/

# 6. 执行 Work
./dist/oxn work next my-work      # 获取下一个 Part (target + action)
# 模拟 AI 执行操作，构建 Artifact
./dist/oxn work verify my-work    # 验证，生成 frozen.json 快照

# 7. 查看研讨厅 (Hall)
./dist/oxn hall
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

| 流转类型 | 路径 | 说明 |
|---------|------|------|
| **资产流** | `Drafts ─[Promote]─▶ Arsenal` | 资产生命周期管理 |
| **执行流** | `Work ─[Type绑定]─▶ Blueprint → 获取 Part → 构建 Artifact` | 运行时任务执行 |
| **验证流** | `Artifact ─[L1 Infra探测]─▶ L0 Kernel判决 ─[通过]─▶ frozen.json` | 验证快照生成 |

### 8.3 层级职责说明

- **L0 Kernel**：纯逻辑推演，零 IO。基于 Schema 校验事实，生成 `frozen.json` 快照
- **L1 Foundation**：
  - *OXN DSL*：提供语法解析与 CLI CRUD，确保 `.oxn` 文件合法性
  - *Infra*：收口文件系统与进程 IO，负责物理 Artifact 的观测
- **L2 Domain**：
  - *Arsenal*：围绕 Blueprint/Part/Probe 提供 Forge 与 Promote 能力
  - *Work*：围绕 Blueprint Type 提供运行时调度与独立工作区间管理
- **L3 Runtime**：CLI、Daemon、Skill、Hall 等系统入口，组装一切并驱动工作流

## 9. 文档

- [快速开始](docs/zh-cn/guides/getting-started.md)
- [核心概念](docs/zh-cn/architecture/concepts.md)
- [CLI 参考](docs/zh-cn/guides/cli-reference.md)
- [架构设计](docs/zh-cn/architecture/)
- [故障排查](docs/zh-cn/guides/troubleshooting.md)

## License

MIT
