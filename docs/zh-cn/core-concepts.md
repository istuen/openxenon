---
title: 核心概念
---

# 核心概念

> **OXN 由 4 个结构实体（E1-E4）加 L0-L3 工程实现构建而成**。E1-E4 定义 OXN 的哲学边界，L0-L3 描述代码的依赖方向。物理目录用各自名称（`kernel/`、`oxl/`、`infra/`、`Asset/`、`Intent/`、`cli/`、`daemon/` 等），不直接对应 E 或 L。

## 1. E1-E4 四结构实体（理念层）

```
┌──────────────────────────────────────────────────────────────────┐
│  E4 · Insight — 涌现层（1+1>2）                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                       │
│  跨 Work 综合推理 → 资产级建议（新增/改进/废弃）                     │
│  哲学底色：钱学森系统论 · 整体论                                     │
│  不可还原 · AI 推理涌现，非 Engine 规则计算                          │
└────────────────────────┬──────────────────────────────────────────┘
                         │ 综合集成
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  E3 · Engine — 引擎基座                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                       │
│  整个 OpenXenon = Engine                                           │
│  独立验证主权（frozen.json + content_hash + planLock）              │
│  E1-E4 全部实现在此（L0-L2 代码层）                                 │
└────────────────────────┬──────────────────────────────────────────┘
                         │ submit → 执行 IAP 循环
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  E2 · Work — 动态协作空间                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                       │
│  IAP 三阶段 + Round 多轮循环                                        │
│  Intent（工程师声明意图 + 选 Asset 边界）                           │
│  Align（AI 多轮对齐，Round × N → 每轮拆 M 个 Tasks）               │
│  Proof（Engine 独立验证 → verdict）                                │
│  工程师 ↔ AI 共建                                                  │
└────────────────────────┬──────────────────────────────────────────┘
                         │ ref 引用（不被改写）
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  E1 · Asset — 静态边界                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                       │
│  Domain / Blueprint / Stack                                       │
│  硬约束（planLock + content_hash），不被 Work 改写                   │
│  工程师维护                                                        │
└──────────────────────────────────────────────────────────────────┘
```

| 实体 | 性质 | 主导权 | 对应代码模块（L2 Engine） |
|---|---|---|---|
| **E1 Asset** | 静态边界 | 工程师 | `service/Asset/` |
| **E2 Work** | 动态协作 | 工程师 ↔ AI | `service/Intent/` + `service/Align/` |
| **E3 Engine** | 独立公证 | OXN | L0-L2 全部（含 IAP 范式执行） |
| **E4 Insight** | 涌现 | AI 推理 | `service/Insight/`（v0.6 哲学占位，v0.7+ 涌现推理） |

## 2. L0-L3 工程实现（概念层）

L0-L3 描述代码的**依赖方向**（上层依赖下层，不可反向）。物理目录不直接对应 L 层级——用各自名称：
`kernel/`、`oxl/`、`infra/`、`cli/`、`daemon/`、`src/service/<Domain>/`。

```
┌────────────────────────────────────────────────────────┐
│  L3: Tools & Applications (工具与应用层)                │
│      CLI (oxn 入口) + Skills (AI 扩展) + Daemon (监督)  │
│      E2 Work + E4 Insight 的入口编排在此层完成           │
├────────────────────────────────────────────────────────┤
│  L2: Engine Core Logic (引擎核心业务层)                  │
│      E1-E4 全部实现在此（5 大业务模块 + IAP 状态机）      │
│      Asset / Intent / Align / Proof / Insight / Pool    │
│      按 DDD 模块化：Service/<Domain>/{index,create,...} │
├────────────────────────────────────────────────────────┤
│  L1: Language DSL & Infra (操作基座与语言层)             │
│      OXL: OpenXenon Language DSL 编译器/解析器          │
│      Infra: 文件/AST 扫描探针，OS/硬件级操作基座          │
├────────────────────────────────────────────────────────┤
│  L0: Logic Kernel (逻辑内核层)                           │
│      纯逻辑、零 IO：状态冻结、frozen.json 原子读写        │
│      Schema / Contract / Verdict / Processor            │
└────────────────────────────────────────────────────────┘
```

**依赖方向**：L3 → L2 → L1 → L0（单向，无循环依赖）

## 3. 三大主体权力分立

| 主体 | 主导实体 | 核心权力 | 绝对禁区 |
|---|---|---|---|
| 工程师 | E1 Asset + E2 Intent 阶段 | 维护资产库、创建 work、选择边界 | 不能自我证明意图正确 |
| AI 模型 | E2 Align 阶段 | 执行 tasks、多轮 Round 对齐、落盘产物 | 不能自我验证执行合格 |
| OXN | E3 Engine（Proof + Round） + E4 Insight | 跑探针、产出 verdict、涌现推理 | 不能修改 Asset 或替 AI 执行 |

## 4. IAP 第一法则

> **主导权不交叉，证明不可绕过。**

- AI 不得越过 Asset 边界（Align 受制于 Asset）
- 工程师不得在 Probe 检查前宣布完成（Intent 受制于 Proof）
- OXN 不得修改 Domain 术语或 Blueprint 规则（Proof 不得篡权）
- Insight 不得自动回写 Asset（必须经过 review/approve 闸门）

## 5. E2 Work — IAP 范式的最小完整单元

**3 大 Work 模式**（v0.6：Insight 升为 E4 涌现层，从 Work 模式中独立）：

| 模式 | Intent 阶段 | Align 阶段 | Proof 阶段 | Skill 入口 |
|---|---|---|---|---|
| **Asset 模式** | 选资产类型 | 填内容 + 落盘 | 语法校验 + planLock | `oxn work --type asset` |
| **Develop 模式** | 选边界 + goal | AI 写代码（Round 对齐） | 跑 lint/test/build | `oxn work --type develop` |
| **Proof 模式** | 声明探针 | 准备环境 | 跑探针 + frozen.json | `oxn work --type proof` |

**IAP 三阶段**（Intent → Align → Proof）：

```
Work (一次完整 IAP 周期)
├── Intent 阶段 (工程师主权)
│   1. 创建 work.oxn
│   2. 分析 work 需要哪些 Asset 作为边界
│   3. 选择引用 Asset (ref @prj/assets/...)
│
├── Align 阶段 (AI 模型主权) — Round 多轮对齐
│   ├── Round 1: 拆 N 个 Tasks → 执行 → Proof → verdict
│   ├── verdict fail? → 回到 Intent 调整 → Round 2
│   ├── verdict fail? → 回到 Intent 调整 → Round 3
│   └── ...
│
├── Proof 阶段 (Engine 主权)
│   1. 跑探针 (Probe)
│   2. 产出 verdict（PASSED / FAILED / INCONCLUSIVE 三态）
│   3. verdict = FAIL → 逃逸机制触发 (block done)
│
└── work finalize → 写 frozen.json → 可供 E4 Insight 消费
```

详见 [Work](./work.md)。

## 6. E1 Asset — IAP 的硬约束边界

| 资产 | 定义 | 约束硬度 |
|---|---|---|
| Domain | 业务词汇表（term）、禁令（ban）、不变量（invariant） | langium parse + term/ban 强校验 |
| Blueprint | 技术流水线模板（slot 拓扑 + Probe 标准） | DAG 无环校验 + slot 对齐 |
| Stack | 技术环境约束（language/runtime/linter/test） | v0.6 硬要求，Proof 阶段直接断言 |

**Asset vs OpenSpec specs/**：

| 维度 | OpenSpec specs/ | OXN Asset |
|---|---|---|
| 角色 | 被 change 改写的目标（delta 合并）| 被 Work 引用的硬约束边界（不被改写）|
| 版本 | 流动的（每次 archive 合并）| 冻结的（planLock + content_hash，创建后不可变）|
| 验证 | AI 自查 + 人工 review | Engine 独立第三方探针 + frozen.json |
| 创建方式 | 随 change 创建 / 修改 | 专门的 Asset 模式 Work 创建 |

详见 [Asset](./asset.md)。

## 7. E3 Engine — 独立验证主权基座

OXN Engine 是 IAP 范式的执行主体。Engine 内部按 L0-L3 分层：

| L 层 | 模块 | 职责 | 约束 |
|---|---|---|---|
| L3 | CLI / Skills / Daemon | 工具与应用入口 | 不能绕过 Engine 直接读写 frozen.json |
| L2 | Asset / Intent / Align / Proof / Insight / Pool | IAP 业务逻辑（DDD 模块化） | 不直接 IO，通过 L1 Infra Port 调用 |
| L1 | OXL（DSL 编译）+ Infra（探针/文件系统） | 语言解析 + OS/硬件级操作 | 只回答事实，不做 PASS/FAIL 判定 |
| L0 | Kernel | 纯逻辑内核：状态冻结、Schema/Contract/Verdict | 零 IO，不得执行任何副作用 |

> **纯洁性核法则**：Infra 不能绕过 Engine 自我宣布完成 → Engine 不能修改 Kernel 规则 → Kernel 不能直接执行 Task

详见 [Architecture](./architecture.md)。

## 8. E4 Insight — 涌现层（1+1>2）

**E4 是 OXN 终极哲学定位**。前三层（Asset + Work + Engine）是还原论的"拆解+验证"，第四层是钱学森系统论整体论的"综合+涌现"：

| 前三层（还原论侧） | E4 Insight（整体论侧） |
|---|---|
| Asset 可拆解为 term/ban/invariant | 不可还原——无法从单个 verdict 反推出"该废弃某 Domain" |
| Work 可拆解为 Round/Task | 只能综合推理——跨多 Work 的互动模式才能涌现新认知 |
| Engine 可拆解为模块 | AI 推理涌现，非 Engine 规则计算 |

**v0.6 规划**：
- 哲学定位 + CLI 入口占位（`oxn insight --work <w>`）
- **涌现推理留 v0.7+**（跨 Work 综合推理需数据累积）
- v0.6 Insight Service 提供单 Work 的 IAP 历史总结（最弱形态）

详见 [Insight](./insight.md)。

## 9. 信息隐藏原则

> **AI 只看"该做什么"，不看"该满足什么"**——对抗性设计，防止 AI 针对性绕过验证。

| 信息 | 谁可见 |
|---|---|
| Asset term / ban / invariant | AI 可见（需要统一语言） |
| Blueprint slot | AI 可见（需要知道步骤） |
| Part 内 Probe 验证标准 | AI **不可见** |
| frozen.json | AI **不可写** |
| state.json | AI **不可写** |
| Insight 涌现分析 | AI 可见（用来理解多轮 IAP 失败模式） |

## 10. Skill 极简

```
.opencode/skills/
└── oxn-work/                ← 唯一 Skill（IAP 范式统一入口 · 3 模式分发 · Round）
    └── SKILL.md

（删除的 Skill：oxn-cli / oxn-proof）
```

> **work = IAP 范式的最小完整单元**。建资产、开发功能、跑验收——所有工作都走 `/oxn-work`。

---

## → 参考

- [Asset](./asset.md) — E1 硬约束边界 SSOT
- [Work](./work.md) — E2 动态协作 IAP 核心 SSOT
- [Insight](./insight.md) — E4 涌现层 SSOT
- [Architecture](./architecture.md) — Engine L0-L3 分层
- [Glossary](./glossary.md) — 完整术语表
- [v0.6 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- [v0.6 Service 层设计稿](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-service-layer-design.md)
