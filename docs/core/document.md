# OpenXenon Document

> **OpenXenon — 工程师与 AI 协作工作台**
> 工程师定义意图，AI 执行对齐，OXN 证明结果。
>
> *OpenXenon — The Collaborative Workbench for Engineers and AI*
> *Engineers define intent, AI executes alignment, the OXN proves results.*

> 本文档是 OpenXenon 的**统一权威文档**（SSOT）。所有概念、范式、策略、术语都在此沉淀。
> 历史归档：原 `iap-paradigm.md` / `intent-align.md` / `philosophy.md` / `concepts.md` / `terminology.md` 已被合并到本文件，保留作为历史快照。

---

## 目录

- [§1 定位与权力分立](#1-定位与权力分立)
  - [1.1 品牌定位](#11-品牌定位)
  - [1.2 三主体模型（IAP 权力分立）](#12-三主体模型iap-权力分立)
  - [1.3 IAP 第一法则](#13-iap-第一法则)
- [§2 核心概念](#2-核心概念)
  - [2.1 OpenXenon 的模块](#21-openxenon-的模块)
  - [2.2 IAP 三轴实体](#22-iap-三轴实体)
  - [2.3 两类资产与两层架构](#23-两类资产与两层架构)
  - [2.4 OXN Engine（架构层）](#24-oxn-engine架构层)
  - [2.5 OXN Runtime 三模块](#25-oxn-runtime-三模块)
  - [2.6 Runtime 纯洁性约束](#26-runtime-纯洁性约束)
- [§3 IAP 范式详解](#3-iap-范式详解)
  - [3.1 三轴主导权](#31-三轴主导权)
  - [3.2 Y 型生产权链](#32-y-型生产权链)
  - [3.3 逃逸机制](#33-逃逸机制)
  - [3.4 IAP 硬约束（未来门控）](#34-iap-硬约束未来门控)
  - [3.5 v0.0.x Arsenal 教训](#35-v00x-arsenal-教训)
  - [3.6 IAP 终极表达](#36-iap-终极表达)
- [§4 策略与路线图](#4-策略与路线图)
  - [4.1 两级涌现路径](#41-两级涌现路径)
  - [4.2 L0-L3 四阶段路线图](#42-l0-l3-四阶段路线图)
  - [4.3 Proof-First 入口](#43-proof-first-入口)
  - [4.4 Program Domain 概念](#44-program-domain-概念)
  - [4.5 价值主张分层](#45-价值主张分层)
- [§5 术语](#5-术语)
  - [5.1 关键术语速查表](#51-关键术语速查表)
  - [5.2 废弃与禁用术语](#52-废弃与禁用术语)

---

## 1. 定位与权力分立

### 1.1 品牌定位

**OpenXenon 是工程师与 AI 协作工作台**——工程师定义意图，AI 执行对齐，OXN 证明结果。

| 维度         | 描述                          |
| ------------ | ----------------------------- |
| **产品名**   | OpenXenon                     |
| **品牌定位** | 工程师与 AI 协作工作台        |
| **核心范式** | IAP（Intent-Align-Proof）三轴 |
| **运转引擎** | OXN（OpenXenon Engine）       |

### 1.2 三主体模型（IAP 权力分立）

IAP 范式的核心是三轴分离与主导权不交叉。在协作工作台上，存在三个拥有独立主权的行为主体：

| 主体       | 英文     | 主导轴           | 核心权力                         | 绝对禁区                 |
| ---------- | -------- | ---------------- | -------------------------------- | ------------------------ |
| **工程师** | Engineer | Intent（意图轴） | 生产权：创作 Domain 与 Blueprint | 不能自我证明意图正确     |
| **AI**     | AI       | Align（对齐轴）  | 对齐权：编排 Work 与选择 Part    | 不能自我验证执行合格     |
| **OXN**    | OXN      | Proof（证明轴）  | 证明权：产出不可篡改的 Proof     | 不能修改意图或替 AI 执行 |

### 1.3 IAP 第一法则

> **主导权不交叉，证明不可绕过。**

- AI 不得越过 Blueprint 的 slot 边界（对齐权受制于意图权）
- 工程师不得在 Probe 检查前宣布完成（意图权受制于证明权）
- OXN 不得修改 Domain 术语或 Blueprint 规则（证明权不得篡权）

---

## 2. 核心概念

### 2.1 OpenXenon 的模块

OpenXenon 由以下模块组成，每个模块都有明确的职责与所属轴：

#### Intent 轴模块（工程师主定）

| 模块          | 作用                                                      |
| ------------- | --------------------------------------------------------- |
| **Domain**    | 业务限界上下文，承载 term / ban / invariant / context_map |
| **Blueprint** | 技术流水线模板，定义 slot 拓扑（DAG） + Probe 标准        |

#### Align 轴模块（AI 主导）

| 模块     | 作用                               |
| -------- | ---------------------------------- |
| **Work** | 编排器，声明 ref 池，编排 task DAG |
| **Task** | 执行单元，1 blueprint + N parts    |
| **Part** | 对齐到 Blueprint slot 的零件       |

#### Proof 轴模块（OXN 主给）

| 模块      | 作用                                            |
| --------- | ----------------------------------------------- |
| **Probe** | 验证量具，声明 expected / actual                |
| **Proof** | 不可篡改的证明书（`frozen.json`），产出 Verdict |

### 2.2 IAP 三轴实体

#### 2.2.1 Intent 轴（意图轴）— 工程师主权

意图是工作台上的一切起点。没有意图，AI 不行动，OXN 不证明。

| 术语               | 中文     | 定义                                                                                              | 物理形态                           |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Domain**         | 领域     | 业务或编程概念的权威词汇表（term）、禁令与不变式                                                  | `.openxenon/domains/<name>.oxn`    |
| **Blueprint**      | 蓝图     | 过程意图的规格说明，声明 slot（步骤）、part（构件）与 probe（验收标准）                           | `.openxenon/blueprints/<name>.oxn` |
| **Program Domain** | 编程领域 | OXN 内置的、语言无关的编程概念词汇表（SourceFile, BuildArtifact 等），无需 DDD 即可使用 Blueprint | `@oxn/domains/ProgramContext`      |

#### 2.2.2 Align 轴（对齐轴）— AI 主权

对齐是 AI 将意图转化为现实的过程。AI 在 Blueprint 划定的边界内自由编排。

| 术语         | 中文 | 定义                                                         | 物理形态                           |
| ------------ | ---- | ------------------------------------------------------------ | ---------------------------------- |
| **Work**     | 工作 | AI 对齐一个 Blueprint 的完整作业空间                         | `.openxenon/works/<name>/work.oxn` |
| **Task**     | 任务 | Work 中的一个执行步骤，对应 Blueprint 的一个 slot            | `.openxenon/works/<w>/tasks/<t>/`  |
| **Part**     | 构件 | 执行 Task 的具体工具或代码片段（如 shell-exec, jest-runner） | `@oxn/parts/*` 或项目自定义        |
| **Artifact** | 产物 | Task 执行后落盘的文件或状态                                  | 项目文件系统中的实际文件           |

#### 2.2.3 Proof 轴（证明轴）— OXN 主权

证明是 OXN 对 AI 工作结果的客观判定。OXN 是唯一的判定主体，AI 无法伪造 PASS。

| 术语                 | 中文     | 定义                                                        | 物理形态                                           |
| -------------------- | -------- | ----------------------------------------------------------- | -------------------------------------------------- |
| **Probe**            | 探针     | 验收标准的声明（Intent 侧）与执行（Proof 侧）的统称         | 声明：`.oxn` 中的 `observe`；执行：`@oxn/probes/*` |
| **Proof**            | 证明     | OXN 对 Work/Task 执行 Probe 后产出的完整判定记录            | `frozen.json`（P 独立模式与 IAP 完整模式同名，路径不同） |
| **Verdict**          | 裁定     | Proof 的最终结论：PASS 或 FAIL                              | `frozen.json` 中的 `verdict` 字段                  |

> **Proof 物理路径规范**：
> - **P 独立模式**（Proof-First 入口）: `.openxenon/proofs/<name>/frozen.json` —— 跳过 Intent/Align 资产化，由 CLI 直接管理
> - **IAP 完整模式**: `.openxenon/works/<w>/tasks/<t>/frozen.json` —— 挂在 Task 目录下，随 Task 状态机演进
>
> 两种模式使用**同一文件名** `frozen.json`，统一 Proof 物理形态；区别仅在**父目录**与**生命周期**。
| **Escape Mechanism** | 逃逸机制 | 当 Verdict 为 FAIL 时，OXN 触发的强制干预（预警+阻止+诊断） | Daemon 运行时拦截                                  |

### 2.3 两类资产与两层架构

工作台上的东西分为两类：**工程师的创意资产**（工程师创作，OXN 读取校验）和 **OXN 的作业资产**（OXN 创建管理，工程师/AI 使用）。

```
┌─────────────────────────────────────────────────────────┐
│                   OpenXenon 工作台                        │
│                                                         │
│  ┌─────────── 资产层（声明性）───────────┐               │
│  │  [工程师资产] Domain / Blueprint       │               │
│  │  [OXN 作业资产] Work / Task / Proof    │               │
│  └──────────────────────────────────────┘               │
│                    │ 被读取 / 被执行 / 被证明              │
│                    ▼                                    │
│  ┌─────────── 运行时层（执行性）─────────┐               │
│  │  Kernel（内核）+ Infra（底座）+ Daemon（守护进程）│         │
│  └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

| 实体      | 谁创建                       | 谁使用      | OXN 的角色  |
| --------- | ---------------------------- | ----------- | ----------- |
| Domain    | 工程师                       | AI / OXN    | 读取 + 校验 |
| Blueprint | 工程师                       | AI / OXN    | 读取 + 校验 |
| Work      | OXN（基于 Blueprint 实例化） | AI / OXN    | 创建 + 管理 |
| Proof     | OXN（引擎产出）              | 工程师 / AI | 产出 + 冻结 |

### 2.4 OXN Engine（架构层）

**OXN Engine（OpenXenon Engine）** 是工作台的运转引擎，是 Proof 轴的执行主体。它由三部分组成：

> **OXN Engine = DSL + Runtime + CLI**

#### 2.4.1 DSL（语言规范）

| 术语        | 中文             | 定义                                                              |
| ----------- | ---------------- | ----------------------------------------------------------------- |
| **OXN DSL** | OXN 领域特定语言 | 定义 Domain、Blueprint、Work 等资产的语法与解析规则               |
| **Langium** | Langium          | OXN DSL 的实现框架（TypeScript 生态的 DSL 工具链）                |
| **Scope**   | 作用域           | 资产引用的寻址空间：`@oxn`（内置）、`@prj`（项目）。`@glo` 已废弃 |

#### 2.4.2 Runtime（运行引擎）

**OXN Runtime** 是 OXN Engine 的执行核心，由三个纯洁性约束严格的模块组成：

| 术语       | 中文     | 定义                                                                             | 纯洁性约束              |
| ---------- | -------- | -------------------------------------------------------------------------------- | ----------------------- |
| **Kernel** | 逻辑内核 | 纯逻辑校验，零 IO。校验 Blueprint 合法性、Task-Slot 匹配、Probe 声明             | 不得执行任何副作用      |
| **Infra**  | 底座支撑 | 副作用执行，只回答事实不做判定。包含 Probe 执行器（fs-exists, http-responds 等） | 不得做出 PASS/FAIL 判定 |
| **Daemon** | 后台进程 | 生命周期管理与逃逸机制。管理 Work 状态机，执行 FAIL 时的阻止与预警               | 不得修改 Kernel 规则    |

#### 2.4.3 CLI（交互界面）

| 术语                | 中文         | 定义                                                                                       |
| ------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| **CLI**             | 命令行界面   | 工程师与 AI 操作工作台的唯一入口（`oxn init`, `oxn proof create`, `oxn work run` 等）      |
| **Proof-First CLI** | 证明优先界面 | P0 阶段的极简交互：`proof create` → `proof probe add` → `proof run`，无需 Domain/Blueprint |

### 2.5 OXN Runtime 三模块

OXN Runtime 是工作台运行时层的执行核心：

| 模块       | 中文 | 职责                     | 约束                              |
| ---------- | ---- | ------------------------ | --------------------------------- |
| **Kernel** | 内核 | 纯逻辑验证，零 IO        | 不允许 `fs.existsSync()` 等副作用 |
| **Infra**  | 底座 | 副作用 / IO，获取事实    | 只回答事实，不做判定              |
| **Daemon** | 守护进程 | 运行时管理 +**逃逸机制** | Probe FAIL 时阻止 Work 进入 done  |

### 2.6 Runtime 纯洁性约束

> **Runtime 纯洁性第一法则**：
>
> - **Infra（底座）不能**绕过 Daemon（守护进程）自我宣布完成
> - **Daemon（守护进程）不能**修改 Kernel（内核）规则
> - **Kernel（内核）不能**直接执行 Task

三模块的边界由其职责直接推导：每个模块只做自己的事，不僭越到其他模块的领域。

### 2.7 信息隐藏原则

> **AI 助手只看到"该做什么"，看不到"该满足什么"**——这是 OpenXenon 的对抗性设计，假设 AI 可能尝试绕过验证，通过信息隐藏阻止针对性优化。

#### 显式可见 vs 隐式隐藏

| 信息 | 谁能看 | 原因 |
|---|---|---|
| `domain.term` | ✅ AI 可见 | AI 写代码时需要使用统一语言 |
| `domain.ban` | ✅ AI 可见 | AI 需要知道禁用词 |
| `domain.invariant` | ⚠️ v0.1 文档化（v0.2 接 Probe） | v0.1 AI 可见；v0.2 转 Probe 隐藏 |
| `blueprint.slot` | ✅ AI 可见 | AI 需要知道有哪些 slot 可 align |
| `blueprint.observe` | ⚠️ v0.1 文档化（v0.2 接 Probe） | v0.1 AI 可见；v0.2 转 Probe 隐藏 |
| `task.skill_context` | ✅ AI 可见 | AI 需要知道执行指令 |
| `task.part` 内的 `probe` | ❌ AI **不可见** | 验证标准不可绕过 |
| `frozen.json` | ❌ AI 不可写 | 判决书由 OXN 独占 |
| `state.json` 内部 status | ❌ AI 不可写 | 状态由 OXN 独占维护 |

#### 为什么需要信息隐藏

**1. 防止针对性优化（Test-hacking）**：如果 AI 知道验证标准，会"针对 probe 优化"而不是真正解决问题。

**2. 保持客观评价**：验证逻辑由 OXN 独占持有，AI 不可干扰；AI 无法预测将执行哪些检查，必须真正完成任务。

**3. 工程师掌控验证**：验证标准是工程师的"底牌"，不应暴露给执行者。

#### 三主体信息边界

| 角色 | "不能感知"的内容 |
|---|---|
| AI | 验证标准（probe）、期望行为（expectation）、业务规则（rule） |
| OXN | 业务语义（term/ban 怎么用）、技术策略（怎么写代码） |
| 工程师 | 实时审查（不介入每次执行） |

三者各守边界，互不越界。

#### v0.1 信息隐藏实现现状

| 机制 | 现状 |
|---|---|
| **Blueprint 不含 expectation/rule** | ✅ |
| **Probe 块在 Part 内但 runtime 不可见** | ✅（AI 看到 part 时不读 probe 块） |
| **`frozen.json` 由 OXN 写** | ✅（AI 不调用） |
| **`state.json` 内部 status 由 OXN 维护** | ✅（AI 只通过 CLI 推进） |

---

## 3. IAP 范式详解

### 3.1 三轴主导权

> **三轴分离，主导权不交叉，证明不可绕过。**

| 主导轴        | 主导者     | 职责                                                        | 协作方                           | 对抗机制                  |
| ------------- | ---------- | ----------------------------------------------------------- | -------------------------------- | ------------------------- |
| **Intent 轴** | **工程师** | 定义 Domain term / Blueprint slot / Probe 标准              | AI 补全意图细节 + OXN 校验合法性 | Domain term 锁定边界      |
| **Align 轴**  | **AI**     | 编排 Work / Task 序列、选择 Part、声明 Probe                | 工程师审核 + OXN 约束            | Blueprint slot 锁定路径   |
| **Proof 轴**  | **OXN**    | 产出 Proof(Verdict)；Kernel 内核 + Infra 底座 + Daemon 守护进程 | AI 诊断 + 工程师决策             | Daemon 逃逸机制阻止假完成 |

OXN 内部三模块（证明轴的执行机制）：

| 模块   | 定位 | 职责                     | 约束                              |
| ------ | ---- | ------------------------ | --------------------------------- |
| Kernel | 内核 | 纯逻辑验证，零 IO        | 不允许 `fs.existsSync()` 等副作用 |
| Infra  | 底座 | 副作用 / IO，获取事实    | 只回答事实，不做判定              |
| Daemon | 守护进程 | 运行时管理 +**逃逸机制** | Probe FAIL 时阻止 Work 进入 done  |

**交互原则（三轴主导权）**：

> **工程师**主定 Intent——Domain 与 Blueprint 的**唯一合法生产者**，持有业务语义与技术意图。
> **AI** 主导 Align——把 Intent 展开为 Work / Task / Part 编排与选件。
> **OXN** 主给 Proof——通过 Kernel 内核 + Infra 底座 + Daemon 守护进程三模块，判定 AI 产物是否真的满足工程师意图。
>
> **主导权不交叉；证明不可被 `--force` 绕过。**

### 3.2 Y 型生产权链

IAP 范式的生产权不是直线，而是 **Y 型 + 反馈闭环**——Intent 轴与 Align 轴并行展开，在 Proof 轴汇合；Proof 的 Verdict 反馈驱动 Intent 演化，形成 I → A → P → I 的闭环。

```
              Intent轴                    Align轴
         Domain(.oxn)                 Work(.oxn)
              │                            │
              ▼                            ▼
         Blueprint(.oxn)             Task → Artifact
              │                            │
              │  Probe标准                │  Artifact事实
              │  (from Intent 轴)         │  (from Align 轴)
              └────────────┬───────────────┘
                           │
                           ▼
                       Proof轴
                    Proof(Verdict)
                  OXN Runtime (Kernel+Infra+Daemon)
                           │
                           │  反馈（P → I）
                           │  Verdict 驱动 Intent 演化
                           └──────────▶ Intent 演化
                                       （精准化/业务化/资产化）
```

**核心流转**：
- **Intent 轴**：工程师产出 Domain + Blueprint，锁定业务语言与技术拓扑
- **Align 轴**：AI 在 Blueprint slot 约束下编排 Work → Task → Part → Artifact
- **Proof 轴**：OXN 把 Probe 标准（Intent）与 Artifact 事实（Align）汇合，产出 Verdict
- **反馈闭环**：
  - **P → I**：Proof 的 Verdict 反馈驱动 Intent 演化（精准化 / 业务化 / 资产化）
  - **A → I**：Align 的偏差反馈修正 Intent 定义（slot 越界、term 漂移等）

三轴形成闭环：I → A → P → I，下一轮的 Intent 比上一轮更精准。

### 3.3 逃逸机制

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

### 3.4 IAP 硬约束（未来门控）

> 当 Work 流程完全跑通后，以下门控必须从软约束升级为硬约束。第四条是 **IAP 范式的终极防线**——如果证明可被 `--force` 绕过，整个 IAP 就名存实亡。

| 门控点             | 软约束（当前）                         | 硬约束（v0.2+ 目标）                                                     |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------ |
| Domain → Blueprint | Blueprint 可引用未定义的 term          | Kernel 拒绝编译                                                          |
| Blueprint → Work   | Work 可引用未 validate 的 Blueprint    | `oxn work create` 必须传 validate 通过的 Blueprint                       |
| Work → Task        | Task Part 可不在 Blueprint slot 中声明 | Task Part 必须匹配 Blueprint slot                                        |
| **Probe → Proof**  | Probe 声明后无强制验证                 | **Daemon 逃逸机制阻止未通过 Proof 的 Work 进入 done；无 `--force` 绕过** |

### 3.5 v0.0.x Arsenal 教训

**一句话总结**：Arsenal 时代是"OXN Engine 僭越了所有主导权"，Cleanup 之后的 OXN 严格遵循 IAP 主导权模型。

| 被清理的对象             | 主导权错位                       | IAP 修正                                     |
| ------------------------ | -------------------------------- | -------------------------------------------- |
| `arsenals/builtin.ts`    | OXN 硬编码侵入 Intent 轴         | Probe 标准回归 `.oxn`（工程师主导）          |
| `arsenals/part-port.ts`  | Align 轴越权行使 Proof 轴的验证  | Part 可用性回归 OXN 校验                     |
| `daemon/arsenal-promote` | Proof 轴越权行使 Intent 轴的变更 | 变更权回归 Git（工程师主导）                 |
| `@glo` 寻址              | Intent 轴分裂（全局 vs 项目）    | 统一为 `@oxn` + `@prj`（工程师在项目内主导） |
| `oxn init` 死目录        | 残留 v0.0.x 的主导权模型         | 清理后只保留 IAP 三轴对应的目录              |

### 3.6 IAP 终极表达

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Intent（意图轴）                                                  │
│   工程师为主 + AI 与 OXN 协作                                       │
│                                                                     │
│   Domain(.oxn) ──▶ Blueprint(.oxn)                                 │
│   "统一语言"         "技术意图 + 证明标准"                          │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                        对齐权 │
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                                                                     │
│   Align（对齐轴）                                                   │
│   AI 为主 + 工程师与 OXN 协作                                       │
│                                                                     │
│   Work(.oxn) ──▶ Task ──▶ Artifact                                 │
│   "编排+选件+设验" "执行"   "产物事实"                              │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                        证明权 │
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                                                                     │
│   Proof（证明轴）                                                   │
│   OXN 为主 + AI 与工程师协作                                        │
│                                                                     │
│   Probe标准 ──▶ Proof(Verdict) ◀── Artifact事实                    │
│   (from意图轴)                      (from对齐轴)                    │
│                                                                     │
│   Kernel 内核 + Infra 底座 + Daemon 守护进程                            │
│   逃逸机制：预警 + 阻止 + 诊断                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 策略与路线图

### 4.1 两级涌现路径

IAP 范式不是"自上而下灌输的范式"，而是"自下而上生长的范式"。OpenXenon 的能力升级走两级涌现路径，每级涌现都对应一个真实痛点的自然触发。

#### 4.1.1 涌现 1：Proof → Blueprint

```
手动 Proof 1 次  → "有用，AI 假完成被抓住了"
手动 Proof 5 次  → "每次都要重复输同样的 probe，烦"
手动 Proof 10 次 → "我能不能把这些 probe 存下来？"
                        ↓
                  第一级涌现发生
                        ↓
        "如何把 Proof 变成自动化、可重复的意图？"
                        ↓
          引入 Blueprint（把 Probe 模板化）
          引入 Domain（把概念词汇化）
```

**这解决了 IAP 的冷启动问题**：不需要先说服工程师学 Domain + Blueprint，只需要让他们用 Proof 抓住一次 AI 假完成，价值就成立。重复使用的痛点会自然驱动他们升级到 Blueprint。

#### 4.1.2 涌现 2：Program Domain → Business Domain

```
用 Program Domain 修 Bug        → "Blueprint + 内置 Domain 真方便"
用 Program Domain 做 3 个功能   → "Blueprint 里全是技术术语，跟业务无关"
用 Program Domain 做 10 个功能  → "怎么保证 AI 理解的是业务意图而不是技术实现？"
                                ↓
                          第二级涌现发生
                                ↓
              "怎么长期保证 Blueprint 对齐业务意图？"
              "怎么让团队的意图统一？"
                                ↓
                    引入业务 Domain（DDD）
                    引入团队共享意图空间
```

**这解决了 DDD 的冷启动问题**：不需要先做领域建模，先用 Program Domain（内置的语言无关编程概念词汇表）解决技术问题，业务复杂度自然涌现出 DDD 的需求。

#### 4.1.3 涌现路线图

```
P0: Proof 轴独立   P1: Intent 轴技术化       P2: Intent 轴业务化       P3: Intent 轴资产化
Probe + Proof     Program Domain            Business Domain          意图涌现
                  + Blueprint               + DDD
oxn proof create  oxn blueprint create      oxn domain create        oxn emerge
oxn proof probe   (引用 Program Domain)     (业务术语建模)           (执行轨迹分析)
oxn proof run     oxn work create           (Git 共享)               (Hall 研讨厅)
                                           
─── 涌现1 ───→    ─── 涌现2 ───→          ─── 涌现3 ───→
"Probe 重复了"     "技术术语不够用了"       "经验无法沉淀"
```

### 4.2 P0-P3 四阶段路线图

OpenXenon 的开发计划以 **Phase（P0-P3）** 组织，命名完全复用 IAP 三轴现有词汇。Phase = 涌现路径上的一个台阶，每阶段对应一个"对工程师说什么"的价值主张。

> **注意区分**：
> - **代码架构层 L0-L3**（Kernel/Foundation/Module/Runtime）—— 内层不依赖外层（参考 CPU 缓存设计）
> - **产品路线图 P0-P3**（Proof 独立/Intent 技术化/Intent 业务化/Intent 资产化）—— 涌现路径的台阶

| Phase               | 目标                              | 核心能力                                                                                                                    | 涌现触发           |
| ------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **P0: Proof 轴独立** | **Proof 闭环**（Proof-First 入口） | `oxn proof create / probe add / run`；`frozen.json` 不可篡改；AI 只能通过 CLI 操作 Proof                                    | "Probe 重复了"     |
| **P1: Intent 轴技术化** | **Program Domain + Blueprint**   | 内置 `@oxn/domains/ProgramContext`；`oxn blueprint create --domain @oxn/domains/ProgramContext`；Daemon 后台守护 + 逃逸机制 | "技术术语不够用了" |
| **P2: Intent 轴业务化** | **Business Domain + DDD**        | `oxn domain create` 业务术语建模；团队共享意图空间（Git + `@prj`）；意图变更 diff 感知                                      | "团队协作混乱"     |
| **P3: Intent 轴资产化** | **意图涌现 + 资产回流**         | 执行轨迹 → 意图空间变换；意图候选自动生成；工程师确认后成为资产；Hall 研讨厅                                                | "经验无法沉淀"     |

### 4.3 Proof-First 入口

P0 阶段采用 **Proof-First 入口**——`oxn proof create` 是工程师的第一次 OpenXenon 体验，**本质是 IAP 中 Proof 轴的独立运作**（工程师跳过 Intent/Align 资产化，直接使用 Probe 声明验收标准，由 OXN 产出 `frozen.json`）：

```bash
# 1. 创建 Proof 空间
oxn proof create check-deploy
# → Created .openxenon/proofs/check-deploy/

# 2. 添加 Probe
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof probe add file-exports --target ./dist/index.js --export handler
oxn proof probe add http-responds --url http://localhost:3000/health --status 200

# 3. 让 AI 工作（任何 AI 助手工具）

# 4. 运行证明
oxn proof run check-deploy
# → Kernel: 校验 Probe 声明合法性... OK
# → Infra:  执行 3 个 Probe...
# →   ✅ fs-exists: ./dist/index.js found
# →   ❌ file-exports: found 'default', expected 'handler'
# →   ❌ http-responds: connection refused
# → Verdict: FAIL (1/3)
# → Proof saved: .openxenon/proofs/check-deploy/frozen.json

# 5. AI 修复后再次证明
oxn proof run check-deploy
# → Verdict: PASS (3/3)
```

**`frozen.json` 的不可篡改性**：这是 OXN Engine 签发的**检验报告**——AI 和工程师都只能读，不能改。如果 AI 能修改 `frozen.json`，Proof 轴就名存实亡。

**AI 的 Proof 约束**（CLI 白名单）：

- ✅ 允许：`oxn proof create <name>` / `oxn proof probe add <probe-ref>` / `oxn proof run <name>` / `oxn proof list` / `oxn proof show <name>`
- ❌ 禁止：直接写 `frozen.json` / 修改 `frozen.json` 的 `verdict` / 跳过 Proof 直接宣布完成

### 4.4 Program Domain 概念

P1 阶段的关键是 **Program Domain**——OpenXenon 内置的语言无关编程概念词汇表。工程师**不写 DDD 就能用 Blueprint**：

- 引用 `domain "@oxn/domains/ProgramContext"` 即可获得通用编程概念词典
- 涵盖 SourceFile / Module / Function / BuildArtifact / TestSuite / TestCase / Dependency / ConfigFile / EntryPoint / APIEndpoint 等通用概念
- 配套内置 Probe：`@oxn/probes/fs-exists` / `@oxn/probes/file-exports` / `@oxn/probes/test-pass` / `@oxn/probes/ts-compiles` / `@oxn/probes/http-responds` / `@oxn/probes/deps-resolved`

> Program Domain 的具体 term/invariant 列表与 Blueprint 模板在 v0.3 实施 change 中定义（语法待定）。

### 4.5 价值主张分层

| Phase | 对工程师说什么                                 | 解决什么痛点               |
| ----- | ---------------------------------------------- | -------------------------- |
| **P0** | "AI 说做完了？让 OXN 验收才算。"               | AI 假完成、Token 白烧      |
| **P1** | "给 AI 一本编程词典和一个图纸，它就不会跑偏。" | 长任务幻觉、意图漂移       |
| **P2** | "让业务语言统一，让团队意图对齐。"             | 业务知识断层、团队协作混乱 |
| **P3** | "做过的项目，下次不用重来。"                   | 经验无法沉淀、重复造轮子   |

---

## 5. 术语

### 5.1 关键术语速查表

| 术语             | 缩写    | 中文     | 一句话定义                                  |
| ---------------- | ------- | -------- | ------------------------------------------- |
| OpenXenon        | -       | 工作台   | 工程师与 AI 协作工作台（产品品牌）          |
| OXN Engine       | OXN     | 运转引擎 | 工作台的运转引擎，证明结果的主体            |
| OXN Runtime      | Runtime | 运行引擎 | OXN 的执行核心（Kernel + Infra + Daemon）   |
| IAP              | IAP     | IAP 范式 | Intent-Align-Proof 三轴模型                 |
| Domain           | -       | 领域     | 意图的词汇表、禁令与不变式                  |
| Blueprint        | -       | 蓝图     | 意图的规格说明（slot + part + probe）       |
| Work             | -       | 工作     | AI 对齐一个 Blueprint 的作业空间            |
| Task             | -       | 任务     | Work 中的一个执行步骤                       |
| Part             | -       | 构件     | 执行 Task 的具体工具                        |
| Artifact         | -       | 产物     | Task 执行后落盘的文件                       |
| Probe            | -       | 探针     | 验收标准的声明与执行                        |
| Proof            | -       | 证明     | OXN 产出的不可篡改判定记录                  |
| Verdict          | -       | 裁定     | PASS 或 FAIL 的最终结论                     |
| frozen.json      | -       | 冻结证明 | Proof 的物理形态，不可篡改                  |
| Kernel           | -       | 内核     | 纯逻辑校验，零 IO                           |
| Infra            | -       | 底座     | 副作用执行，只回答事实不做判定              |
| Daemon           | -       | 守护进程 | 生命周期管理与逃逸机制                      |
| Escape Mechanism | -       | 逃逸机制 | FAIL 时的强制干预（预警+阻止+诊断）         |
| Program Domain   | -       | 编程领域 | OXN 内置的编程概念词汇表，无需 DDD 即可使用 |
| Proof-First      | -       | 证明优先 | P0 阶段的极简入门模式，只需 Probe + Proof   |

### 5.2 废弃与禁用术语

| 废弃术语    | 原因                          | 替代术语                           |
| ----------- | ----------------------------- | ---------------------------------- |
| Core Engine | 模糊、暗示单体                | **OXN Engine** / **OXN Runtime**   |
| @glo        | 与 Git 协作模型冲突           | **@prj**（项目）+ **@oxn**（内置） |
| Arsenal     | v0.0.x 僵尸模块，IAP 混权产物 | **Builtin** / **@oxn**             |
| 自我验证    | 违反 IAP 第一法则             | **OXN 证明**                       |
