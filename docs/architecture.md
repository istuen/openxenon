# Architecture

> OXN Engine = DSL + Runtime + CLI。Runtime 由 Kernel / Infra / Daemon 三模块组成，按 L0-L3 四层架构分层。

## What —— OXN Engine 三层

| 层 | 作用 |
|---|---|
| **DSL** | OXL 领域特定语言（Langium 实现），定义 Domain / Blueprint / Work 的语法与解析 |
| **Runtime** | 执行核心：Kernel（纯逻辑）+ Infra（IO）+ Daemon（守护进程） |
| **CLI** | 工程师与 AI 的统一操作入口（`oxn proof` / `oxn work` / `oxn blueprint` / `oxn domain`） |

---

## Runtime 三模块

OXN Runtime 是 Proof 轴的执行主体，由三个纯洁性约束严格的模块组成：

| 模块 | 中文 | 职责 | 约束 |
|---|---|---|---|
| Kernel | 内核 | 纯逻辑校验（Blueprint 合法性、Task-Slot 匹配、Probe 声明） | 零 IO，不得执行任何副作用 |
| Infra | 底座 | 副作用 / IO 执行（fs-exists, http-responds 等） | 只回答事实，不得做 PASS/FAIL 判定 |
| Daemon | 守护进程 | 生命周期管理 + 逃逸机制 | 不得修改 Kernel 规则 |

> **纯洁性第一法则**：
> - Infra 不能绕过 Daemon 自我宣布完成
> - Daemon 不能修改 Kernel 规则
> - Kernel 不能直接执行 Task

---

## L0-L3 四层架构

参考 CPU L0-L3 缓存设计，**内层不依赖外层**：

```
┌──────────────────────────────────────────┐
│ L3: Runtime（CLI / Daemon / Skill / Hall）│
├──────────────────────────────────────────┤
│ L2: Module（Builtin + Domain + Work）     │
├──────────────────────────────────────────┤
│ L1: Foundation（OXN DSL + Infra / Port）  │
├──────────────────────────────────────────┤
│ L0: Kernel（Schema / Contract / Processor）│
└──────────────────────────────────────────┘
```

| 层级 | 核心约束 | 对应 OXN 模块 |
|---|---|---|
| L0 Kernel | 纯函数、零 IO、零状态 | Kernel（纯逻辑验证） |
| L1 Foundation | DSL 解析 + 物理 IO 收口 | Infra（获取事实）+ OXL DSL |
| L2 Module | 业务与工程模块自治 | Domain / Blueprint / Work / Task |
| L3 Runtime | 入口与外部交互 | CLI / Daemon / Skill |

**依赖规则**：L0 不 import L1+；L1 不 import L2/L3；L2 不 import L3。

---

## 纯洁性约束

OXN 的三模块边界由其职责直接推导：

- **Kernel（内核）**：纯函数，禁止 `fs` / `net` / `child_process` / `process.env` / `EventEmitter`
- **Infra（底座）**：允许副作用，但只能**回答事实**，不能做出"合格/不合格"的判定
- **Daemon（守护进程）**：管理状态机，当 Verdict = FAIL 时触发逃逸机制

**为什么需要这么严格的边界**：如果 Infra 能自己判定 PASS，AI 就可以绕过 Daemon；如果 Daemon 能改 Kernel 的规则，工程师的验收标准就形同虚设。

---

## 信息隐藏原则

OpenXenon 的对抗性设计假设 AI 可能尝试绕过验证：

| 信息 | AI 可见？ | 原因 |
|---|---|---|
| Domain term / ban | ✅ 可见 | AI 需要使用统一语言 |
| Blueprint slot | ✅ 可见 | AI 需要知道步骤 |
| Part 内的 Probe 配置 | ❌ 不可见 | 防止针对性优化 |
| frozen.json | ❌ 不可写 | 判决书由 OXN 独占 |
| state.json 内部 status | ❌ 不可写 | 状态由 OXN 独占 |

这就是为什么 `oxn work context` 只返回 `skill_context` 和 `allowedLanguage`，不返回 Probe 验证标准。

---

## 两类资产与两层架构

```
┌─────────── 资产层（声明性）───────────┐
│  [工程师资产] Domain / Blueprint       │
│  [OXN 作业资产] Work / Task / Proof    │
└──────────────────────────────────────┘
              │ 被读取 / 被执行 / 被证明
              ▼
┌─────────── 运行时层（执行性）─────────┐
│  Kernel（内核）+ Infra（底座）+ Daemon（守护进程）│
└──────────────────────────────────────┘
```

| 实体 | 谁创建 | 谁使用 | OXN 的角色 |
|---|---|---|---|
| Domain | 工程师 | AI / OXN | 读取 + 校验 |
| Blueprint | 工程师 | AI / OXN | 读取 + 校验 |
| Work | OXN + 工程师 | AI / OXN | 创建 + 管理 |
| Proof | OXN | 工程师 / AI | 产出 + 冻结 |

## → 参考

- [Core Concepts](./core-concepts.md) — IAP 范式与三模块概念
- 旧文档：[L0-L3 宪法](./architecture/l0-l3-constitution.md)（完整分层定义与依赖规则）
