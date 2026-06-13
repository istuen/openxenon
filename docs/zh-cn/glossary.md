---
title: 术语表
---

# 术语表

> OpenXenon 关键术语中英对照表。所有概念的定义以本章为准。

## 产品与引擎

| 术语 | 缩写 | 中文 | 定义 |
|---|---|---|---|
| OpenXenon | — | 工作台 | 工程师与 AI 协作工作台（产品品牌） |
| OXN Engine | OXN | 运转引擎 | 工作台的运转引擎，证明结果的主体 |
| OXN Runtime | Runtime | 运行引擎 | OXN 的执行核心（Kernel + Infra + Daemon） |
| IAP | IAP | IAP 范式 | Intent-Align-Proof 三轴模型 |

## IAP 三轴实体

### Intent 轴

| 术语 | 中文 | 定义 |
|---|---|---|
| Domain | 领域 | 意图的词汇表、禁令与不变式 |
| Blueprint | 蓝图 | 技术流水线模板（slot 拓扑 + Probe 标准） |
| Program Domain | 编程领域 | OXN 内置的编程概念词汇表，无需 DDD 即可使用 |
| term | 术语 | Domain 中的核心词汇，AI 必须使用 |
| ban | 禁令 | Domain 中的禁用词，AI 不得使用 |
| invariant | 不变量 | Domain 中的业务不变量 |

### Align 轴

| 术语 | 中文 | 定义 |
|---|---|---|
| Work | 工作 | AI 对齐 Blueprint 的完整作业空间 |
| Task | 任务 | Work 中的一个执行步骤，对齐 1 个 Blueprint |
| Part | 构件 | Task 中的执行单元，对齐 Blueprint 的 1 个 slot |
| Artifact | 产物 | Task 执行后落盘的文件或状态 |
| skill_context | 执行指令 | Part 中 AI 可见的执行描述 |
| slot | 步骤 | Blueprint 中的拓扑节点 |
| deps | 依赖 | Task 或 Slot 之间的执行顺序依赖 |

### Proof 轴

| 术语 | 中文 | 定义 |
|---|---|---|
| Probe | 探针 | 验收标准的声明（Intent 侧）与执行（Proof 侧） |
| Proof | 证明 | OXN 产出的不可篡改判定记录 |
| Verdict | 裁定 | PASS 或 FAIL 的最终结论 |
| frozen.json | 冻结证明 | Proof 的物理形态，不可篡改 |

## Runtime 架构

| 术语 | 中文 | 定义 |
|---|---|---|
| Kernel | 内核 | 纯逻辑校验，零 IO |
| Infra | 底座 | 副作用执行，只回答事实不做判定 |
| Daemon | 守护进程 | 生命周期管理与逃逸机制 |
| Escape Mechanism | 逃逸机制 | Verdict FAIL 时的强制干预（预警+阻止+诊断） |

## 寻址

| 术语 | 格式 | 含义 |
|---|---|---|
| @oxn | `@oxn/<type>/<name>` | 内置资产（OpenXenon 自带） |
| @prj | `@prj/<type>/<name>` | 项目内资产（`.openxenon/<type>/<name>.oxn`） |

## 文件与目录

| 路径 | 含义 |
|---|---|
| `.openxenon/` | 项目 OXN 工作台根目录 |
| `.openxenon/domains/<kebab>.oxn` | Domain 资产 |
| `.openxenon/blueprints/<name>.oxn` | Blueprint 资产 |
| `.openxenon/works/<w>/work.oxn` | Work 编排文件 |
| `.openxenon/works/<w>/tasks/<t>/task.oxn` | Task 编排文件 |
| `.openxenon/works/<w>/.work` | 静态门禁卡 |
| `.openxenon/proofs/<name>/frozen.json` | Proof-First 模式证明结果 |
| `.openxenon/works/<w>/tasks/<t>/frozen.json` | IAP 完整模式证明结果 |
| `.openxenon/works/<w>/.run/` | v1.1 运行时状态目录 |

## 废弃术语

| 废弃术语 | 原因 | 替代 |
|---|---|---|
| Core Engine | 模糊、暗示单体 | OXN Engine / OXN Runtime |
| @glo | 与 Git 协作模型冲突 | @prj + @oxn |
| Arsenal | v0.0.x 僵尸模块 | Builtin / @oxn |
| noun / verb | 已被重命名 | term |
| domain_rules | 已被重命名 | invariant |
| expectation / rule | 已删除 | Probe 承载 |
| stage | 已删除 | slot |
| oxn work new | 已删除 | oxn work create |
| oxn leader * | 已删除 | 并入 oxn work |
| oxn part new / oxn probe new | Part/Probe 不是独立资产 | 在 task 块内联写 |
