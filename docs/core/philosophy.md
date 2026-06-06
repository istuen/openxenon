# 核心理念

> ⚠️ **本文件已合并到 [docs/core/document.md](document.md)。** 新内容请访问统一权威文档；本文件保留作为历史归档。

> OpenXenon 是一个**人机对齐框架**——通过 IAP 三轴范式（Intent-Align-Proof）沉淀工程师意图与验证标准，积累工程资产，约束 AI 边界并确定性构建软件。

> 模块清单与职责见 [iap-paradigm.md §〇](iap-paradigm.md#〇openxenon-的模块)。

## 1. 我们在解决什么问题

0.X 阶段，OpenXenon 探索一个核心问题：

> **工程师的经验，能否成为驾驭 AI 的能力？**

AI 模型高效且擅长探索，但也会犯错与幻觉。工程师懂业务、懂技术、能设计、能积累经验。OpenXenon 要解决的就是：

**如何将工程师的审查经验前置为结构化资产与验证标准，让 AI 在约束边界内执行，由 OXN 协助工程师判定 AI 执行符合工程师意图的产物。**

## 2. 三轴主导权

OpenXenon 的架构灵魂是 **IAP 三轴主导权**——工程师、AI、OXN 分别在各自轴上**主导**，在其他轴上**协作**而不僭越：

| 主导轴 | 主导者 | 职责 | 协作方 | 对抗机制 |
|---|---|---|---|---|
| **Intent 轴** | **工程师** | 定义 Domain term / Blueprint slot / Probe 标准 | AI 补全意图细节 + OXN 校验合法性 | Domain term 锁定边界 |
| **Align 轴** | **AI** | 编排 Work / Task 序列、选择 Part、声明 Probe | 工程师审核 + OXN 约束 | Blueprint slot 锁定路径 |
| **Proof 轴** | **OXN** | 产出 Proof(Verdict)；Kernel 内核 + Infra 底座 + Daemon 守护进程 | AI 诊断 + 工程师决策 | Daemon 逃逸机制阻止假完成 |

**OXN 内部三模块**（证明轴的执行机制）：

| 模块 | 定位 | 职责 | 约束 |
|---|---|---|---|
| **Kernel** | 内核 | 纯逻辑验证，零 IO | 不允许 `fs.existsSync()` 等副作用 |
| **Infra** | 底座 | 副作用 / IO，获取事实 | 只回答事实，不做判定 |
| **Daemon** | 守护进程 | 运行时管理 + **逃逸机制** | Probe FAIL 时阻止 Work 进入 done |

**交互原则（三轴主导权）**：

> **工程师**主定 Intent——Domain 与 Blueprint 的**唯一合法生产者**，持有业务语义与技术意图。
> **AI** 主导 Align——把 Intent 展开为 Work / Task / Part 编排与选件。
> **OXN** 主给 Proof——通过 Kernel 内核 + Infra 底座 + Daemon 守护进程三模块，判定 AI 产物是否真的满足工程师意图。
>
> **主导权不交叉；证明不可被 `--force` 绕过。**

> 完整 IAP 范式讨论见 [iap-paradigm.md](iap-paradigm.md)。

## 3. 三个核心价值

| 价值 | 描述 |
|---|---|
| **Experience as Assets** | 工程师的判断成为 AI 可执行的约束（资产化） |
| **Verifiable Results** | AI 执行结果通过物理观测验证（可验证） |
| **Accumulating Constraints** | 好的约束可复用、可累积（可积累） |

## 4. 适用场景

- 使用 AI 辅助编程、需要**可验证**执行结果的团队
- 希望把工程师经验沉淀为**可复用资产**的项目
- 探索更有效人机协作的实验性开发

## 5. 当前阶段

版本：**v0.1** — IAP 范式（Intent-Align-Proof）落地

- ✅ L0/L1/L2/L3 四层宪法实施
- ✅ Domain / Blueprint / Work / Task / Proof 五类实体
- ✅ IAP 三轴范式（Domain + Blueprint = Intent；Work + Task + Part = Align；Proof = OXN 主导的第三轴）
- ✅ OXN 三模块（Kernel 内核 / Infra 底座 / Daemon 守护进程）
- ✅ OXN DSL v0.1 完整语法（term/ban/invariant + slot + part）
- 🔜 v0.2：Daemon 逃逸机制 / Slot 契约 / language-ban-checker Probe / 守护进程 / 异常恢复
- 🔜 v0.3：多 AI 助手适配
- 🔜 v0.4：多运行时（Bun → Node.js）

> 详细发展路线见 [README §6 路线图](../../README.md#6-开发计划)。
