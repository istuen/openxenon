# Intent-Align 子集视图（IAP 范式两轴详解）

> ⚠️ **本文件已合并到 [docs/core/document.md](document.md)。** 新内容请访问统一权威文档；本文件保留作为历史归档。

> **本文档定位**：IAP 范式（Intent-Align-Proof）的 **Intent/Align 两轴** 详细展开。
> 完整 IAP 三轴范式（含 Proof 轴与逃逸机制）见 [iap-paradigm.md](iap-paradigm.md)。
>
> ⚠️ **历史说明**：本文件原为 v0.1 的"Intent-Align 范式"权威文档。v0.1+ 范式升级为 IAP 三轴后，本文件保留为 IAP 的 Intent/Align 两轴子集视图，更详细的范式讨论请见 iap-paradigm.md。

## 1. 范式定义

**Intent-Align 二元对偶** 是 IAP 范式的前两轴定义：

- **Intent（意图）**：静态、声明式、不可变的业务/技术约束
- **Align（对齐）**：动态、实例化、可变的工作/任务/零件编排

> **原则**：Intent/Align 两轴内的实体**分别落在自己的轴上**；**第三轴 Proof** 承担"判定产物是否真的满足 Intent"的职责（详见 [iap-paradigm.md](iap-paradigm.md) 第三节）。

## 2. 实体对偶表

| 层级 | Intent（静态/声明） | Align（动态/实例） | 关系 |
|---|---|---|---|
| **业务** | **Domain**（DDD 限界上下文：term/ban/invariant） | — | Domain 是 Align 引用的业务词典 |
| **技术** | **Blueprint**（slot 拓扑模板 + Probe 标准） | — | Blueprint 是 Align 引用的技术模板 + Proof 引用 Probe 标准 |
| **编排** | — | **Work**（资源池 + task DAG） | 一个 Work 可引用多个 Domain + Blueprint |
| **执行** | Blueprint 内的 **Slot** | **Part**（align 到 slot） | 1:N（一个 slot 可被多个 part align） |
| **观测** | Blueprint slot 的 **Observe** 数组 | **Probe**（align 到 observe） | 1:N（一个 observe 可由多 probe 验证） |
| **数据** | **Prop Definition**（属性意图） | **Prop Assignment**（属性赋值） | 1:1 |

> **第三轴的衔接**：Blueprint 的 `Observe` 数组定义 Probe 标准（Intent 轴），由 Align 轴的 Probe 实例执行；执行结果汇入 Proof 轴产出 Verdict（详见 [iap-paradigm.md](iap-paradigm.md) §三 Y 型生产权链）。

## 3. 为什么需要"对偶"

### 痛点 1：单一蓝图承担双重身份

v0.0.x 时代，Blueprint 同时承担"业务蓝图"和"项目蓝图"两个角色：
- 一份 Blueprint 既要描述"业务上要做什么"（noun/verb/rules）
- 又要描述"技术上怎么做"（slot/observe）

→ **业务专家看不懂 Blueprint，技术负责人改不动 Blueprint**。

### 痛点 2：AI 上下文无法隔离

跨业务域编排时，AI 看到所有 Domain 的全部语言约束，**分不清当前任务属于哪个域**。

### 痛点 3：验证标准被绕过

如果 AI 看到了 `expectation/rule` 块，会"针对验证标准优化"（test-hacking），而不是真正解决问题。

> **痛点 3 在 IAP 中的彻底解决**：验证标准由 Blueprint 定义（Intent 轴），但 AI 主导的 Align 轴**永远看不到 Probe 的 expected 值**——它只能拿到 Probe 引用与参数。判定权在 OXN 的 Proof 轴，由 Daemon 通过逃逸机制执行（详见 [iap-paradigm.md](iap-paradigm.md) 第三节）。

## 4. Intent-Align 如何解决

| 痛点 | 解决方式 |
|---|---|
| 双角色混淆 | **Domain = 业务 Intent**，**Blueprint = 技术 Intent**，Work 才负责组合 |
| 上下文隔离 | Work 声明用到的 domain 池；Task 在 task.oxn 内**显式 align** 哪些 domain 参与本次执行 |
| 验证标准绕过 | Blueprint 不再带 expectation/rule；验证逻辑完全在 Probe 内（Align 端），但 Probe 的 expected 值由 OXN 在 Proof 阶段从 Blueprint 注入，AI 上下文不可见 |

## 5. 对偶的物理映射

```
.openxenon/
├── domains/                 ← Intent 轴（业务）
│   ├── member-context.oxn      业务上下文，AI 只能用里面的 term
│   └── order-context.oxn
├── blueprints/              ← Intent 轴（技术）
│   ├── dev-workflow.oxn        slot 拓扑模板 + Probe 标准
│   └── fix-issue.oxn
└── works/                   ← Align 轴（动态编排）
    └── onboarding/
        ├── work.oxn            声明用到的 domain/blueprint + 编排 task DAG
        └── tasks/
            └── register-member/
                ├── task.oxn    align 1 个 blueprint + 显式声明参与的 domain
                ├── state.json  运行时状态（Align 轴）
                └── frozen.json  Proof 轴产物（OXN 产出）
```

## 6. 与 DDD 的关系

Intent-Align 不是 DDD 的替代品，而是 DDD 在工具链中的**工程化映射**：

| DDD 概念 | Intent-Align 映射 |
|---|---|
| Bounded Context | **Domain** 实体（Intent 轴） |
| Ubiquitous Language | Domain 内的 `term` 块 |
| Anti-Corruption Layer | Domain 内的 `ban` 块 + `context_map.imports` |
| Domain Service | **Blueprint** 实体（Intent 轴） |
| Application Service | **Work** 实体（Align 轴） |
| Domain Event | **Trace** 记录（`work-trace.jsonl`） |
| Acceptance Criterion | **Probe** 标准（Intent 轴定义）→ **Proof** Verdict（Proof 轴判定） |

## 7. 决策依据

本范式的确立经历了与 AI 的多轮迭代：
- **轮 1**：识别"Blueprint 双角色"问题
- **轮 2**：是否给 Blueprint 注入 DDD？答：否，应独立 Domain 实体
- **轮 3**：一份 vs 多份业务蓝图？答：多份（按限界上下文）
- **轮 4**：是否新增 Compose 层？答：否，编排下沉到 Work
- **轮 5**：确立 **Intent-Align 二元对偶**（v0.1）— 架构灵魂的前两轴
- **轮 6**（v0.1+）：扩展为 **IAP 三轴（Intent-Align-Proof）** — 加入 Proof 轴与逃逸机制

详见 [ADR-0002](../adr/0002-intent-align-paradigm.md)（已被 [ADR-0007](../adr/0007-iap-three-axes.md) 取代）。
