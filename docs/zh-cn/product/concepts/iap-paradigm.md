---
redirectFrom:
  - /zh-cn/core-concepts.html
title: 核心概念
---

# 核心概念

> **OpenXenon —— 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**
>
> **OXN 由 4 个结构实体（E1-E4）加 L0-L3 工程实现构建而成**。E1-E4 定义 OXN 的哲学边界，L0-L3 描述代码的依赖方向。物理目录用各自名称（`kernel/`、`oxl/`、`infra/`、`Asset/`、`Intent/`、`cli/`、`daemon/` 等），不直接对应 E 或 L。

## 1. E1-E4 四结构实体（理念层）

```
┌──────────────────────────────────────────────────────────────────┐
│  E4 · Insight — 涌现层（1+1>2）                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                       │
│  跨 Work 综合推理 → 资产级建议（新增/改进/废弃）                     │
│  哲学底色：整体论 · 整体论                                     │
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
| **E2 Work** | 动态协作 | 工程师 ↔ AI Agent | `service/Intent/` + `service/Align/` |
| **E3 Engine** | 独立公证（控制结构） | OXN Engine | L0-L2 全部（含 IAP 范式执行） |
| **E4 Insight** | 涌现 | AI 推理 | `packages/engine/src/Insight/`（v0.6 哲学占位，v0.7+ 涌现推理） |

## 2. L0-L3 工程实现（概念层）

L0-L3 描述代码的**依赖方向**（上层依赖下层，不可反向）。v0.6 Monorepo 拆分后物理目录：

| 层级 | 物理位置 | 备注 |
|---|---|---|
| L0 Kernel | `packages/engine/src/kernel/` | 类型/常量/verdicts/catalog (Lambda 真空) |
| L1 OXL+Infra | `packages/engine/src/oxl/` + `packages/engine/src/infra/` | DSL 解析 + 文件系统 + socket + frozen |
| L2 Engine (DDD) | `packages/engine/src/{Asset,Intent,Align,Proof,Insight,Pool,Work}/` | 6+1 模块, 纯函数导出 |
| L3 Tools | `packages/cli/src/commands/` + `src/daemon/` + `packages/cli/src/skills/` | CLI 薄壳 + 守护进程 + AI Skills |

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

## 3. 三大主体分工

| 主体 | 主导实体 | 核心动作 | 绝对禁区 |
|---|---|---|---|
| 工程师 | E1 Asset + E2 Intent 阶段 | 定意图（维护资产库、创建 work、选择边界、决定合格判定） | 不能把"工作是否合格"的判定权让渡给 AI |
| AI Agent | E2 Align 阶段 | 跑对齐（执行 tasks、多轮 Round 对齐、落盘产物） | 不能越过 Asset 边界，不能修改 Asset |
| OXN Engine | E3 Engine（Proof + Round） + E4 Insight | 出证明（跑探针、记录客观事实、产出 verdict） | 不评判代码质量、不修改 Asset、不替 AI 执行 |

## 3.1 信任链——OpenXenon 的核心

> **信任链是 OpenXenon Engine 的"能源"**——没有信任链，OXN 只是任务跟踪器，不是信任协作工具。

OpenXenon 解决工程师与 AI Agent 的信任协作问题。AI 是概率性推理模型，其本身就是不确定性的。工程师信任 AI 一定会执行，但不信任 AI 执行在边界内。AI 不懂"信任"，只会通过概率推理执行，但信任 OpenXenon 提供的确定性内容（Asset、Work、Kernel）。

```
         工程师                    AI Agent
        (确定性主体)              (概率性主体)
            │                        │
            │  不确定性的协作          │
            │  ← 不可信任 →           │
            │                        │
            ▼                        ▼
         OpenXenon（确定性层）
         ┌─────────────────────┐
         │  Asset (确定性边界)  │
         │  Work (确定性结构)   │
         │  Kernel (确定性验证) │
         │  Proof (确定性证据)  │
         └─────────────────────┘
            │                        │
            ▼                        ▼
    工程师信任 OXN               AI 信任 OXN
    "OXN 出示证据，               "OXN 提供确定性
     告知 AI 执行了什么，           Asset/Work/Kernel，
     哪些在边界内，                我能获取反馈，
     哪些在边界外"                 推理方向是否在边界内，
                                 但是否跨越依然是我自己处理"
            │
            ▼
    工程师通过 OXN 信任 AI
    "我知道 AI 一定会执行，
     OXN 告诉我哪些可靠、
     哪些不可靠"
```

工程师与 AI 原本是两个点协作，但这个协作充满不确定性导致不可信任。OpenXenon 加入后是分别跟两者建立信任协作，然后让工程师可以通过 OpenXenon 信任 AI。

## 4. IAP 协作流水线核心

> **工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**

- **工程师**：定意图（边界 + 蓝图）；负责"工作是否合格"的最终判定（基于 Asset 对照 Proof）
- **AI Agent**：跑对齐；在 Asset 边界内自由发挥；不得修改 Asset
- **OXN Engine**：出证明；记录客观事实（脚本退出码、测试覆盖率、文件路径等）；不评判好坏
- **Insight（E4）**：行为特征观测（v0.6 哲学占位，v0.7+ 涌现推理）；不评判代码质量；不得自动回写 Asset（必须经过 review/approve 闸门）

## 5. E2 Work — IAP 范式的最小完整单元

**3 大 Work 模式**（v0.6：Insight 升为 E4 涌现层，从 Work 模式中独立）：

| 模式 | Intent 阶段 | Align 阶段 | Proof 阶段 | Skill 入口 |
|---|---|---|---|---|
| **Asset 模式** | 选资产类型 | 填内容 + 落盘 | 语法校验 + planLock | `oxn work --type asset` |
| **Develop 模式** | 选边界 + goal | AI Agent 写代码（Round 对齐） | 跑 lint/test/build | `oxn work --type develop` |
| **Proof 模式** | 声明探针 | 准备环境 | 跑探针 + frozen.json | `oxn work --type proof` |

**IAP 三阶段**（Intent → Align → Proof）：

```
Work (一次完整 IAP 周期)
├── Intent 阶段 (工程师定意图)
│   1. 创建 work.md
│   2. 分析 work 需要哪些 Asset 作为边界
│   3. 选择引用 Asset (ref @prj/assets/...)
│
├── Align 阶段 (AI Agent 跑对齐) — Round 多轮对齐
│   ├── Round 1: 拆 N 个 Tasks → 执行 → Proof → verdict
│   ├── verdict fail? → 回到 Intent 调整 → Round 2
│   ├── verdict fail? → 回到 Intent 调整 → Round 3
│   └── ...
│
├── Proof 阶段 (OXN Engine 出证明)
│   1. 跑探针 (Probe) — 记录客观事实（脚本退出码、覆盖率、文件路径）
│   2. 产出 verdict（PASSED / FAILED / INCONCLUSIVE 三态 — 是事实记录，非合格判定）
│   3. 工程师基于 Asset + Proof 决定合格与否（若 FAIL 则 block done）
│
└── work finalize → 写 frozen.json → 可供 E4 Insight 消费
```

详见 [Work](./work.md)。

## 6. E1 Asset — IAP 的硬约束边界

### 6.1 三边界框架（ADR-0054）

E1 Asset 的边界类型明确为 **3 个正交维度**：

| 边界类型 | 约束内容 | IAP 角色 | 引用方式 |
|---|---|---|---|
| **Domain** | 词汇表（term）/ 禁用词（ban）/ 不变量（invariant） | 业务边界（语义约束） | Work 级多选，Task 级单选 |
| **Workflow** | slots / deps / observe | 执行边界（结构约束） | Blueprint `## Refs` 引用 |
| **Stack** | runtimes / linters / testers | 实现边界（环境约束） | Work 级声明，不进 Task |

### 6.2 Blueprint 组合模板（ADR-0055）

Blueprint 从"执行模板"提升为**组合模板**——E1 Asset 内的隔离层：

- Work 只引用 Blueprint（单 ref），不再直接引用 3 边界
- Blueprint 通过 `## Refs` 引用 Domain + Workflow + Stack + 其他 Blueprint
- 单向依赖层级：`3 边界 → Blueprint → Work`（变更单向传播）

### 6.3 AssetKind（v0.6.1）

```ts
type AssetKind = 'domain' | 'workflow' | 'stack' | 'blueprint' | 'roadmap'
```

| 资产 | 定义 | 约束硬度 |
|---|---|---|
| Domain | 业务词汇表（term）、禁令（ban）、不变量（invariant） | parse + term/ban 强校验 |
| Workflow | 执行模板（slot 拓扑 + Probe 标准）——原 Blueprint | DAG 无环校验 + slot 对齐 |
| Stack | 技术环境约束（language/runtime/linter/test） | v0.6 硬要求，Proof 阶段直接断言 |
| Blueprint | 组合模板——引用 Domain + Workflow + Stack | `## Refs` 校验（kind-isolation） |
| Roadmap | 跨类型导航索引（meta 层） | scene 表校验 |

**Asset vs OpenSpec specs/**：

| 维度 | OpenSpec specs/ | OXN Asset |
|---|---|---|
| 角色 | 被 change 改写的目标（delta 合并）| 被 Work 引用的硬约束边界（不被改写）|
| 版本 | 流动的（每次 archive 合并）| 冻结的（planLock + content_hash，创建后不可变）|
| 验证 | AI 自查 + 人工 review | Engine 独立第三方探针 + frozen.json |
| 创建方式 | 随 change 创建 / 修改 | 专门的 Asset 模式 Work 创建 |

详见 [Asset](./asset.md)。

## 7. E3 Engine — 独立公证基座

OXN Engine 是 IAP 范式的执行主体。Engine 内部按 L0-L3 分层：

| L 层 | 模块 | 职责 | 约束 |
|---|---|---|---|
| L3 | CLI / Skills / Daemon | 工具与应用入口 | 不能绕过 Engine 直接读写 frozen.json |
| L2 | Asset / Intent / Align / Proof / Insight / Pool | IAP 业务逻辑（DDD 模块化） | 不直接 IO，通过 L1 Infra Port 调用 |
| L1 | OXL（DSL 编译）+ Infra（探针/文件系统） | 语言解析 + OS/硬件级操作 | 只回答事实，不做 PASS/FAIL 判定 |
| L0 | Kernel | 纯逻辑内核：状态冻结、Schema/Contract/Verdict | 零 IO，**严禁引入概率性数学模型（PID/ESN/突变论）** |

> **纯洁性核法则**：Infra 不能绕过 Engine 自我宣布完成 → Engine 不能修改 Kernel 规则 → Kernel 不能直接执行 Task。
> **Kernel 确定性**：Proof 之所以硬，是因为 Kernel 保持纯逻辑零副作用。任何概率性、模糊性、不确定性数学模型一律归属 Insight 模块，不得进入 Proof 决策路径。

详见 [Architecture](../../dev/architecture.md)。

## 8. E4 Insight — 涌现层（1+1>2）

**E4 是 OXN 终极哲学定位**。前三层（Asset + Work + Engine）是还原论的"拆解+验证"，第四层是整体论的"综合+涌现"：

| 前三层（还原论侧） | E4 Insight（整体论侧） |
|---|---|
| Asset 可拆解为 term/ban/invariant | 不可还原——无法从单个 verdict 反推出"该废弃某 Domain" |
| Work 可拆解为 Round/Task | 只能综合推理——跨多 Work 的互动模式才能涌现新认知 |
| Engine 可拆解为模块 | AI 推理涌现，非 Engine 规则计算 |

**E4 Insight 的作用域 = 行为特征观测，不评判代码质量**：

- ✅ **输出目标**：工程师做决策时所需的协作态势信号（AI 用了哪些边界 / 触碰了什么边界 / 哪条 Asset 规则被反复试探 / Loop 收敛速度 / 退出模式）
- ❌ **不输出**：代码质量评分、代码"美丑"、设计模式合规性
- ❌ **不自动回写**：所有 Insight 建议必须经过 `oxn pool review` / `approve` 闸门，由工程师决定是否落实

**v0.6 规划**：
- 哲学定位 + CLI 入口占位（`oxn insight --work <w>` / `--cross-proof` / `--pipeline`）
- **涌现推理留 v0.7+**（跨 Work 综合推理需数据累积）
- v0.6 Insight Service 提供单 Work 的 IAP 历史总结 + 跨 Proof 趋势（最弱形态）
- 用例命名调整：`probeEffectiveness` → `probeBehaviorPattern`（v0.6 PR-5d 实装；强调行为特征而非 failRate 排序）

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

## 11. Asset 论文结构 + 三相模型（ADR-0051 / ADR-0006）

> **v0.6.3+ 扩展**：Asset 不再是"规则堆砌"，而是"微型论文 + 引用网络"。详见 [Asset Paper Schema · 资产论文结构](./asset-paper.md)。本节简述三相模型与论文结构的对应。

### 11.1 三相模型（ADR-0006 简述）

OXN 的物质形态经历**三相循环**：

```
Phase 1: 静态结构（Asset · E1）— 论文本体
   ↓ 工程师写入 / AI 生成
Phase 2: Loop（Work · E2 — 动态过程）— 论文被引用 / 修改
   ↓ Intent → Align → Proof → Round
Phase 3: 静态产物（frozen.json · E3 + Insight · E4）— 引用计数
```

| Phase | 主导 | 物质形态 | 关键产物 |
|---|---|---|---|
| **1. 静态结构（论文本体）** | 工程师 | 相对静止的"论文" | Domain / Blueprint / Stack + abstract/references[] |
| **2. Loop（论文被引用）** | 工程师 ↔ AI | 物质运动 | trace.jsonl（NDJSON 事件流） |
| **3. 静态产物（引用计数）** | OXN Engine | 物质再次静止 | frozen.json + verdict.md + citations 字段 |

### 11.2 Asset 论文结构（v0.6.3 新增 · 完整见 asset-paper.md）

```yaml
---
type: domain
id: payment-core
version: 1.2.0
status: stable
abstract: |                            # Phase 1 论文摘要
  本文档定义支付核心领域的边界。
references:                            # Phase 1 引用其他论文（依赖 DAG）
  - asset: stack-nodejs
  - asset: api-rest-standard
citations: 3                           # Phase 3 自动维护的引用计数
auditTrail:                            # 论文修改历史
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: 新增 §3.4 幂等性约束
---
```

**关键不变量**：Asset 是论文，引用链 = 依赖网络，citations 量化影响力。

**哲学底色**：借鉴热力学"耗散结构"理论 + 学术论文的"引用-被引"评价体系。资产层始终是相对静态的"边界"，Loop 阶段所有变化都被 trace 记录，frozen.json 是物质再次静止的"凝固点"。Insight E4 涌现层处理 Phase 2 累积的痕迹。

### 11.3 v0.7.x Memory RFC 反弹（2026-07-05）

> **⚠ 历史段**：v0.7.x 曾计划引入 `.openxenon/memory/` 中间层（v0.7.x Memory RFC），但通过奥姆剃刀反思后**全面反弹**。Memory 是"中间态"，Asset + Work 已足够承载所有信息流。
> **替代方案**：Asset 论文结构（`abstract` / `references` / `citations` / `auditTrail`）+ Work/context.md 模板。详见 [Asset Paper Schema · 资产论文结构](./asset-paper.md) + [Work · §12 Work context.md 设计](./work.md#12-work-contextmd-设计adr-0049--取代-memory-l1)。

## 12. Main/Sub Agent 审计链哲学（ADR-0012）

AI 协作采用 **Main Agent + Sub Agent** 架构，OXN 通过**审计链**而非**预防限制**约束 AI：

```
Engine (OXN) — Main Agent
   ↓ 调 Sub Agent（AI）执行 Align
Sub Agent (AI)
   ↓ 写 trace.jsonl / state.json（自描述）
   ↓ Engine 公证（不评判对错，只记录"发生了什么"）
```

### 12.1 反模式（否决）

- ❌ "AI 不应该看到 Probe" — 错。AI 必须看到 Probe 才能调用，但所有调用都被 trace。
- ❌ "AI 不应该改 Asset" — 错。AI 可 CRUD，但变更必须经 audit chain 落档。

### 12.2 设计后果

- ✅ 不阻碍 AI 发挥，但保留事后审计能力
- ✅ "AI 行为可解释" 通过 trace 而非 schema 限制
- ✅ slogan：**"OpenXenon 不生产代码，只生产信任"**

### 12.3 与传统"沙箱"的区别

| 维度 | 传统沙箱 | OXN 审计链 |
|---|---|---|
| 约束时机 | 预防（pre-emptive） | 事后（post-hoc） |
| 失败处理 | 拒绝执行 | 记录并继续 |
| 哲学 | "不该做的不能做" | "做了什么都被记住" |
| AI 自主性 | 低（被约束） | 高（被信任 + 可审计） |

## 13. 最小信任闭环（v0.6.1）

> **v0.6.1 = 最小信任闭环**——信任链的四层确定性就位。

信任链的每一层都需要确定性保障。v0.6.1 修复了四个信任链断裂点：

| 确定性层 | 模块 | 信任职责 | v0.6.1 修复 |
|---|---|---|---|
| **确定性边界** | OXL + Asset | 工程师确定性地定义"可靠" | 三边界框架（ADR-0054/0055/0056） |
| **确定性验证** | Kernel + Proof | OXN 出示真实验证结果 | A3：submit 真正执行 Probe（非合成占位符） |
| **确定性证据** | Proof | 不可篡改的执行事实记录 | A1：finalizeWork 全路径写 frozen.json（含失败路径） |
| **确定性记录** | Proof + Work | OXN 确定性地记录边界违反 | A2：接通 finalizeWorkDomains（记录而非阻止） |

> **A2 的重新理解**：A2 不是"阻止 AI 跨越边界"——AI 是否跨越边界是 AI 自己的概率决策。A2 是"OXN 确定性地告知工程师 AI 跨越了边界"——Domain proof FAIL 时在 frozen.json 中记录"边界违反"。工程师看到证据后决定：调整边界（Asset evolve）还是接受（finalize with warning）。

详见 [version-unification-rfc.md](../../../../.openxenon/docs/rfcs/version-unification-rfc.md)。

---

## → 参考

- [Asset · E1 硬约束边界 SSOT](./asset.md)
- [Work · E2 动态协作 IAP 核心 SSOT](./work.md)
- [Insight · E4 涌现层 SSOT](./insight.md)
- [Architecture](../../dev/architecture.md) — Engine L0-L3 分层
- [Asset Paper Schema · 资产论文结构](./asset-paper.md) — Asset-as-Paper + 引用计数 + DAG（v0.6.3+）
- [Glossary](../reference/glossary.md) — 完整术语表
- [三边界框架 RFC](../../../../.openxenon/pools/drafts/three-boundary-blueprint-elevation-rfc.md) — Domain/Workflow/Stack + Blueprint 提升
- [版本统一 RFC](../../../../.openxenon/docs/rfcs/version-unification-rfc.md) — 信任链叙事 + v0.6.1 最小信任闭环
- [ADR-0054 三边界框架](../../../../.openxenon/docs/adrs/0054-three-boundary-framework.md)
- [ADR-0055 Blueprint 组合模板](../../../../.openxenon/docs/adrs/0055-blueprint-as-composition-template.md)
- [v0.6 RFC](../../../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- [v0.6 Service 层设计稿](../../../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-service-layer-design.md)
- [v0.6.3 Asset Paper Schema RFC](../../../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
