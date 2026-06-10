# OpenXenon

> **OpenXenon — 工程师与 AI 协作工作台**
> 工程师定义意图，AI 执行对齐，OXN 证明结果。

> **Proof 的结果反馈驱动 Intent 演化，IAP 形成闭环，让 Token 成为有效投入。**

---

## 1. 文档

- 📖 **[OpenXenon 统一权威文档](docs/core/document.md)** — 概念 + 范式 + 策略 + 术语（SSOT）
- 📖 **[OXN DSL 语法指南](docs/reference/oxn-dsl.md)** — Domain / Blueprint / Work 完整语法
- 📖 **[Probe 类型与 Program Domain](docs/reference/probe-types.md)** — 内置 Probe 列表

---

## 2. 为什么会有 OpenXenon

当前 AI 模型虽然越来越强，但在**注意力机制做推理**的原理下，其依然是**概率性的输出**。在长上下文、长时间推理后，AI 必然会漂移重点并陷入**自我推理满足**。

由此带来三个核心问题：

1. 如何**验证** AI 的执行结果，而非盲目信任？
2. 如何让 AI 减少长上下文依赖，保持**高效推理**与对齐？
3. 如何降低 AI 陷入无效推理引起的 **Token 无用消耗**？

---

## 3. OpenXenon 希望做到什么

1. **验证 AI 执行结果** — OXN 独立产出不可篡改的 Proof（`frozen.json`），终结 AI 假完成。
2. **工程师意图对齐** — 通过 Domain 与 Blueprint 前置约束，让 AI 在边界内执行，减少漂移。
3. **涌现与复用** — Proof 反馈驱动 Intent 演化，经验沉淀为资产，让 Token 成为有效的投入。

---

## 4. Quick Start — 5 分钟 Proof-First 体验

> **入口即核心**：OpenXenon 的第一次体验是 `oxn proof`，不要求先学 Domain/Blueprint。
> 这本质是 IAP 范式中 **P 轴（Proof 轴）的独立运作模式**——工程师跳过 Intent/Align 资产化，直接使用 Probe 声明验收标准，由 OXN 产出 `frozen.json`。

### 第一步：克隆与构建

```bash
git clone https://github.com/anomalyco/openxenon.git && cd openxenon
bun install --frozen-lockfile && bun run build
```

### 第二步：初始化工作台

```bash
./dist/oxn init
# 支持 -f 强制初始化
# 支持指定 AI 助手，自动生成对应 Skill 配置：
./dist/oxn init --ai cursor   # 生成 Cursor Skill
./dist/oxn init --ai opencode # 生成 OpenCode Skill
./dist/oxn init --ai codex    # 生成 Codex Skill
```

### 第三步：执行你的第一次证明

**方式 A：CLI 直接执行**

```bash
./dist/oxn proof create check-deploy
./dist/oxn proof probe add fs-exists --target ./dist/index.js
./dist/oxn proof run check-deploy
# → Verdict: FAIL / PASS
# → Proof saved: .openxenon/proofs/check-deploy/frozen.json
```

**方式 B：AI 助手中用 Skill 执行**

在 Cursor / OpenCode / Codex 中输入：

```
/oxn-proof 验证 dist/index.js 是否存在并导出 handler
```

AI 通过 Skill 调用 CLI，结果回流到 `frozen.json`。

---

## 5. 进阶使用 — 升级到完整 IAP 协作

当 Probe 重复到一定程度时，自然涌现出对 Intent 轴（Blueprint / Domain）的需求。

| 进阶步骤 | 模块 | 解决的问题 |
|---|---|---|
| 1. 定义业务词典 | **Domain** | 锁定团队统一语言（term）、禁令（ban）与不变式（invariant） |
| 2. 定义技术图纸 | **Blueprint** | 编排 Slot 拓扑、Part 选件、Probe 验收标准 |
| 3. 驱动 AI 作业 | **Work / Task** | 让 AI 在 Blueprint 边界内对齐执行，产出 Artifact 供 OXN 证明 |

```bash
# 1. 定义业务 Domain
./dist/oxn domain create MemberContext
# 编辑 .openxenon/domains/member-context.oxn
./dist/oxn domain validate MemberContext

# 2. 定义技术 Blueprint
./dist/oxn blueprint create onboarding --domain MemberContext
# 编辑 .openxenon/blueprints/onboarding.oxn

# 3. 驱动 AI 作业
./dist/oxn work create --name onboarding
./dist/oxn work add-task --work-name onboarding --task-name register \
  --blueprint onboarding --domain MemberContext
./dist/oxn work context --work onboarding --task register --json
# AI 写代码 → Probe 验证 → frozen.json
```

---

## 6. IAP 范式与 OXN Engine

> **IAP（Intent-Align-Proof）** 是 OpenXenon 的架构灵魂。**OXN** 是工作台的运转引擎。

### 6.1 三轴主导权

| 主导轴 | 主导者 | 职责 | 对抗机制 |
|---|---|---|---|
| **Intent 轴** | **工程师** | 定义 Domain / Blueprint，锁定业务语言与技术拓扑 | Domain term 锁定边界 |
| **Align 轴** | **AI** | 编排 Work / Task / Part，在 Blueprint slot 边界内执行 | Blueprint slot 锁定路径 |
| **Proof 轴** | **OXN** | 产出不可篡改的 Proof（`frozen.json`） | Daemon 逃逸机制阻止假完成 |

**IAP 第一法则**：**主导权不交叉，证明不可绕过**。无 `--force` 绕过。

### 6.2 闭环流转

```
       Intent轴                    Align轴
   Domain(.oxn)                Work(.oxn)
       │                            │
       ▼                            ▼
   Blueprint(.oxn)             Task → Artifact
       │   Probe标准              │  Artifact事实
       └────────────┬───────────────┘
                    │
                    ▼
                Proof轴
             Proof(Verdict)
              OXN Engine
                    │
                    │  反馈（P → I）
                    │  Verdict 驱动 Intent 演化
                    └──────────▶ Intent 演化
```

- **I → A → P 正向推导**：工程师定义 Intent，AI 在 Align 中执行，OXN 给出 Proof
- **P → I 反馈闭环**：Proof 的 Verdict 反馈驱动 Intent 演化（精准化 / 业务化 / 资产化）
- **A → I 反馈**：Align 偏差反馈修正 Intent 定义（slot 越界、term 漂移）

三轴形成 **I → A → P → I** 闭环，下一轮的 Intent 比上一轮更精准。

### 6.3 OXN Engine = DSL + Runtime + CLI

| 层 | 作用 |
|---|---|
| **DSL** | OXN 领域特定语言（Langium 实现）—— Domain / Blueprint / Work 的语法与解析 |
| **Runtime** | 执行核心（Kernel / Infra / Daemon）—— 详见下节 |
| **CLI** | 工程师与 AI 的唯一操作入口（`oxn init / proof / domain / blueprint / work`） |

### 6.4 OXN Runtime 纯洁性约束

OXN Runtime 由三个模块协同执行证明权，每个模块只做自己的事：

| 模块 | 中文 | 职责 | 约束 |
|---|---|---|---|
| **Kernel** | 内核 | 纯逻辑校验，零 IO | 不得执行任何副作用（如 `fs.existsSync`） |
| **Infra** | 底座 | 副作用 / IO 执行，获取事实 | 只回答事实，不得做出 PASS/FAIL 判定 |
| **Daemon** | 守护进程 | 生命周期管理 + 逃逸机制 | 不得修改 Kernel 规则；Probe FAIL 时阻止 Work 进入 done |

**纯洁性第一法则**：

- **Infra（底座）不能**绕过 Daemon（守护进程）自我宣布完成
- **Daemon（守护进程）不能**修改 Kernel（内核）规则
- **Kernel（内核）不能**直接执行 Task

---

## 7. OpenXenon 架构 L0-L3 分层

> **代码架构的 SSOT**：参考 CPU L0-L3 缓存设计，**内层不依赖外层**——L0 Kernel 不 import L1+ 任何模块；L1 Foundation 不依赖 L2/L3。

```
┌────────────────────────────────────────────────┐
│ L3: Runtime（CLI / Daemon / Skill / Hall）      │
├────────────────────────────────────────────────┤
│ L2: Module（Builtin + Domain + Work）           │
├────────────────────────────────────────────────┤
│ L1: Foundation（OXN DSL + Infra / Port）        │
├────────────────────────────────────────────────┤
│ L0: Kernel（Schema / Contract / Processor）     │
└────────────────────────────────────────────────┘
```

| 层级 | 核心约束 | 对应 OXN 模块 |
|---|---|---|
| L0 Kernel | 纯函数、零 IO、零状态 | **Kernel（内核）**：纯逻辑验证 |
| L1 Foundation | DSL 解析 + 物理 IO 收口（FsPort/PathPort/ProbePort） | **Infra（底座）**：获取事实 |
| L2 Module | 业务与工程模块自治（Builtin + Domain + Work） | 资产层：Domain / Blueprint / Work / Task 落盘 |
| L3 Runtime | 入口与外部交互（CLI / Daemon / Skill / Hall） | **Daemon（守护进程）**：运行时 + 逃逸机制 |

> **关于 L2 命名**：L2 命名为 **Module** 而非 "Domain"——避免与 OXN DSL 中的 `Domain` 实体产生歧义。

完整分层定义、依赖规则与审计报告见 [L0-L3 宪法](docs/architecture/l0-l3-constitution.md)。

---

## 8. 开发路线

| 阶段 | 目标 |
|---|---|
| **第一阶段** | 整个 IAP（包括 Proof-First）的闭环实现 |
| **第二阶段** | OXN Engine 的 Daemon + 逃逸机制等 |
| **第三阶段** | "涌现"机制 + Hall（研讨厅） |
| **第四阶段** | 待续 |

---

## 9. 自举验证与测试

OpenXenon 用 OpenXenon 管理自己的开发过程——**自举**（self-bootstrapping）是质量基线。

| 级别 | 定义 | 状态 |
|---|---|---|
| L1 编译自举 | `bun run build` → `oxn` 可执行 | ✅ |
| L2 资产自举 | Domain / Blueprint / Work / Task 全链路跑通 | ✅ |
| L2+ DSL 自举 | Grammar → Schema → Validator → Generator 联动 | ✅ |
| L3 质量自举 | OpenXenon 自身开发过程通过 OpenXenon 管理 | 🔜 第二阶段目标 |

**测试**：所有测试通过；运行 `bun test` 查看当前数据（具体数字随版本演进；权威源为 `bunfig.toml` + `lefthook.yml`）。

---

## 10. License

[MIT](LICENSE)
