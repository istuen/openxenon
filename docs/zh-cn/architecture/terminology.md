# 术语表

本文档定义 OpenXenon 使用的核心术语。

## L0-L3 架构

| 层级 | 组件 | 职责 |
|------|------|------|
| **L0** | Schema / Contract / Processor | 数据契约 + 纯逻辑推演 |
| **L1** | OXN DSL / Infra | 语义解析 + 宿主适配 |
| **L2** | Arsenal / Work | 资产管理 + 执行调度 |
| **L3** | CLI / Daemon / Skill / Hall | 外部交互 |

## 角色与职责

| 术语 | 定义 |
|------|------|
| **工程师** | 决策者与验收者，定义意图、设定验证标准、审查最终结果 |
| **AI 助手** | 调度者与执行者，接收任务目标、选择执行策略、调度 Core CLI、实施代码操作 |
| **Core** | 判决者与记录者，编译资产、下发指令、执行校验、记录状态 |

## 核心概念

| 术语 | 定义 |
|------|------|
| **Blueprint** | 任务工程图，定义执行拓扑（DAG），type 属性与 Work.type 强绑定 |
| **Part** | 零件，包含 target/action/spec/probes 四字段，内置 _version 版本号 |
| **Probe** | 原子检查，物理观测 + 纯函数判定 |
| **Work** | 执行单元，Blueprint 的实例化运行时，与 Blueprint.type 强绑定 |
| **Hall** | 研讨厅，项目状态可视化 |

## Part 字段

| 术语 | 可见性 | 定义 |
|------|--------|------|
| **target** | 对 AI 可见 | 约束执行的作用域 |
| **action** | 对 AI 可见 | 下发给 AI 的执行指令 |
| **spec** | 对 AI 不可见 | 工程师对意图的结构化约束 |
| **probes** | 对 AI 不可见 | 校验该工序是否完成的探针集合 |

## 生命周期

| 术语 | 定义 |
|------|------|
| **DRAFT** | 草稿状态，AI 通过 Forge 生成，待审查 |
| **FORMAL** | 正式状态，工程师审查通过，可被 Work 引用 |
| **Frozen** | 冻结快照，Blueprint 编译后的不可变执行计划 |
| **Trace** | 执行轨迹，Core 对每个 Part 执行 Probes 后的判定记录 |

## Work 状态

| 状态 | 定义 |
|------|------|
| **CREATED** | Work 已创建，Blueprint 已编译为 Frozen |
| **IN_PROGRESS** | Work 正在执行 |
| **PASSED** | 所有 Part 和 Probe 通过 |
| **FAILED** | 某个 Probe 失败 |

## 系统组件

| 术语 | 定义 |
|------|------|
| **Kernel** | 纯函数层，零副作用，只做逻辑判定 |
| **Infra** | I/O 层，唯一触碰文件系统和进程的组件 |
| **OXN DSL** | 领域语言，Grammar/Parser/Validator 实现 |
| **Forge** | 资产构建流程，将工程师经验转化为标准 Schema 约束的资产 |

## 信息隐藏

| 原则 | 说明 |
|------|------|
| **AI 无法感知验证标准** | AI 只能看到 target + action，看不到 spec + probes |
| **Core 独占验证逻辑** | 验证标准由 Core 管理，AI 无法干预 |
| **工程师不介入实时审查** | 工程师只定义规则和验收结果，不参与执行过程 |