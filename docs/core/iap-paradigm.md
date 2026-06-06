# OpenXenon IAP 范式理念指南

> ⚠️ **本文件已合并到 [docs/core/document.md](document.md)。** 新内容请访问统一权威文档；本文件保留作为历史归档。

> **工程师主定意图，AI 主导对齐，OXN 主给证明——三轴分离，主导权不交叉，证明不可绕过。**

---

## 〇、OpenXenon 的模块

OpenXenon 由以下模块组成，每个模块都有明确的职责与所属轴：

### Intent 轴模块（工程师主定）

| 模块 | 作用 |
|---|---|
| **Domain** | 业务限界上下文，承载 term / ban / invariant / context_map |
| **Blueprint** | 技术流水线模板，定义 slot 拓扑（DAG） + Probe 标准 |

### Align 轴模块（AI 主导）

| 模块 | 作用 |
|---|---|
| **Work** | 编排器，声明 ref 池，编排 task DAG |
| **Task** | 执行单元，1 blueprint + N parts |
| **Part** | 对齐到 Blueprint slot 的零件 |

### Proof 轴模块（OXN 主给）

| 模块 | 作用 |
|---|---|
| **Probe** | 验证量具，声明 expected / actual |
| **Proof** | 不可篡改的证明书（`frozen.json`），产出 Verdict |

### OXN 三模块

| 模块 | 作用 |
|---|---|
| **Kernel** | 纯逻辑验证，零 IO |
| **Infra** | 副作用 / IO，获取事实，不做判定 |
| **Daemon** | 运行时管理 + 逃逸机制（预警 + 阻止 + 诊断） |

> 物理位置约定见 §五 Arsenal 时代的教训及 [docs/core/concepts.md](concepts.md)。

---
## 一、IAP 范式总览
IAP（Intent-Align-Proof）是 OpenXenon 的架构灵魂。它定义了 AI-Native 工程中三类根本不同的工作，以及每类工作的主导者和协作方。
```
Intent ──────────────────▶ Align ──────────────────▶ Proof
(意图轴)                    (对齐轴)                   (证明轴)
工程师主导                   AI 主导                    OXN 主导
```
| 维度         | Intent（意图轴）     | Align（对齐轴）            | Proof（证明轴）            |
| ------------ | -------------------- | -------------------------- | -------------------------- |
| **回答什么** | 我们要什么？         | 怎么把意图展开为执行路径？ | 产物是否真的满足意图？     |
| **主导权**   | **工程师**           | **AI**                     | **OXN**            |
| **协作方**   | AI 补全 + OXN 校验  | 工程师审核 + OXN 约束     | AI 诊断 + 工程师决策       |
| **载体**     | Domain + Blueprint   | Work + Task + Part         | Probe + Artifact → Verdict |
| **风险**     | 意图漂移             | 对齐失真                   | 假完成                     |
| **对抗机制** | Domain term 锁定边界 | Blueprint slot 锁定路径    | Daemon 逃逸机制阻止假完成  |
---
## 二、三轴详解
### 1. Intent（意图轴）—— 工程师为主
**本质**：不是被动接收"需求"，而是主动建立共识语言和表达技术意图。
**为什么工程师主导？**
- 意图涉及价值观和业务判断，AI 不能替人决定"我们要什么"
- OXN 可以校验意图的合法性，但不能创造意图
**载体与生产权**：
```
Domain(.oxn) ──生产权──▶ Blueprint(.oxn)
"统一业务语言"           "技术意图 + Probe标准"
```
**协作模式**：
- **工程师**：定义 Domain term、声明 Blueprint slot 和 Probe
- **AI**：根据上下文补全意图细节、提示遗漏的约束
- **OXN**：Kernel 内核校验意图的语法和语义合法性（如 Blueprint 引用的 term 必须在 Domain 中定义）
**门控约束**：
- Blueprint 引用的 term 必须在 Domain 中先定义 → 否则 Kernel 拒绝编译
- Blueprint 未 validate 通过 → 不允许创建 Work
---
### 2. Align（对齐轴）—— AI 为主
**本质**：把意图展开为可执行的路径，包括编排、选件、设验三重动作。
**为什么 AI 主导？**
- 对齐是信息密度最高的拆解工作，AI 擅长将模糊意图展开为具体编排
- 工程师审核和修正，OXN 校验对齐的约束
**载体与生产权**：
```
Work(.oxn) ──生产权──▶ Task ──产出权──▶ Artifact
"编排+选件+设验"        "执行Part"      "产物事实"
```
**协作模式**：
- **AI**：根据 Blueprint 拆解 Work、编排 Task 序列、选择 Part、声明 Probe
- **工程师**：审核 AI 的对齐方案，修正错误的拆解
- **OXN**：Kernel 内核校验 Task 是否匹配 Blueprint slot；Infra 底座执行 Task 的副作用
**关键约束**：
- Task 的 Part 必须在 Blueprint 的 slot 中声明 → 否则对齐失真
- Part 是 Blueprint slot 内的**引用**（选件），不是独立的生产权节点
---
### 3. Proof（证明轴）—— OXN 为主
**本质**：不是被动记录"证据"，而是主动判定"产物是否满足意图"。
**为什么是"证明"而不是"证据"？**
- **证据**是中性的——无论执行成功还是失败，都会留下证据
- **证明**是有立场的——OXN 站在意图这一侧，判定事实是否对齐了意图
- 证据回答"我看到了这些事实"，证明回答"**我判定这些事实不满足意图**"
**为什么 OXN 主导？**
- 人类容易"差不多就行"，AI 容易"假完成"，只有机器不会骗自己
- OXN 不受情绪影响，不会因为"花了很大力气"就放行
**载体与证明权**：
```
Probe标准 ──证明权──▶ Proof(Verdict) ◀──证明权── Artifact事实
(from意图轴)                            (from对齐轴)
```
**协作模式**：
- **OXN**：Kernel 内核校验逻辑 + Infra 底座获取事实 + Daemon 守护进程执行逃逸
- **AI**：解释 Proof 结果，诊断失败原因，提出修复建议
- **工程师**：处理逃逸预警，决定是否修改意图或调整对齐
**Proof 的结构化产出**：
```json
{
  "work": "trial-deploy",
  "proof": {
    "verdict": "FAIL",
    "probe": "@oxn/probes/fs-exists",
    "expected": "found",
    "actual": "not_found",
    "escape_action": "BLOCK_DONE"
  }
}
```
---
## 三、Y 型生产权链
OpenXenon 的生产权不是一条直线，而是 **Y 型**——意图轴和对齐轴并行展开，在证明轴汇合：
```
                    ┌──────── 意图轴 ────────┐
                    │                        │
               Domain(.oxn)            Probe标准
                    │                  (in Blueprint .oxn)
                    ▼                        │
               Blueprint(.oxn)───────────────┘
                    │                  ▲
              ──实例化权──              │
                    │                  │
                    ▼                  │
                Work(.oxn)             │
                    │                  │
             ┌──────┼──────┐           │
             ▼      ▼      ▼           │
          Task₁   Task₂   Task₃        │ 对
             │      │      │           │ 照
             ▼      ▼      ▼           │
         Artifact₁ Artifact₂ Artifact₃ │
             │      │      │           │
             └──────┼──────┘           │
                    │                  │
                    ▼                  │
               ┌─────┴─────┐           │
               │ 产物事实   │           │
               └─────┬─────┘           │
                     │                 │
               ──证明权──              │
                     │                 │
                     ▼                 ▼
                  Proof ◀────── Probe标准
                (Verdict)      (来自意图轴)
```
**生产权规则**：
1. 没有上游对象，就不允许产生下游对象（没有 Domain，Blueprint 不许使用未定义的 term）
2. 上游冻结后，下游才能展开（Blueprint 未 validate，Work 不许实例化）
3. 真相解释权单向传递（Task 执行结果不能反过来改 Blueprint 声明）
4. 证明不可绕过（Probe 不成立时，Daemon 阻止 Work 进入 done，无 `--force` 参数）
---
## 四、OXN：证明轴的执行机制
OXN 由三个模块协同执行证明权，它们本身**不是生产权节点**，而是证明权的执行机制：
```
Kernel（内核）    Infra（底座）    Daemon（守护进程）
纯逻辑验证        副作用/IO        运行时/逃逸
```
### Kernel（内核）
- **职责**：纯逻辑验证，不碰 IO
- **回答**："Probe 声明是否合法？产物路径是否符合规则？"
- **约束**：Kernel 里永远不出现 `fs.existsSync()`
### Infra（底座）
- **职责**：执行副作用，获取事实
- **回答**："文件是否存在？进程是否运行？端口是否监听？"
- **约束**：Infra 只回答事实，不做判定
### Daemon（守护进程）
- **职责**：运行时管理，执行逃逸机制
- **回答**："Probe 不成立时，预警 + 阻止 Work 进入 done"
- **逃逸机制**：当 Kernel 判定 Probe FAIL 时，Daemon 触发：
  1. **预警**：通知人类/AI "执行结果未达预期"
  2. **阻止**：Work 保持 running 状态，不允许进入 done
  3. **诊断**：提供意图→对齐→证明的完整链路快照
**三模块的纯洁性约束**：
- Infra 不能绕过 Daemon 自己宣布完成
- Daemon 不能修改 Kernel 的规则
- Kernel 不能直接执行 Task
---
## 五、Arsenal 时代的教训
当前 `cleanup-arsenal-remaining-coupling` Change 的深层意义：**清除 IAP 混权的 Arsenal 残留，让每个模块回归自己的轴**。
| 被清理的对象             | 主导权错位                       | IAP 修正                                     |
| ------------------------ | -------------------------------- | -------------------------------------------- |
| `arsenals/builtin.ts`    | OXN 硬编码侵入 Intent 轴 | Probe 标准回归 `.oxn`（工程师主导）          |
| `arsenals/part-port.ts`  | Align 轴越权行使 Proof 轴的验证  | Part 可用性回归 OXN 校验             |
| `daemon/arsenal-promote` | Proof 轴越权行使 Intent 轴的变更 | 变更权回归 Git（工程师主导）                 |
| `@glo` 寻址              | Intent 轴分裂（全局 vs 项目）    | 统一为 `@oxn` + `@prj`（工程师在项目内主导） |
| `oxn init` 死目录        | 残留 v0.0.x 的主导权模型         | 清理后只保留 IAP 三轴对应的目录              |
**一句话总结**：Arsenal 时代是"OXN 僭越了所有主导权"，Cleanup 之后的 OXN 严格遵循 IAP 主导权模型。
---
## 六、IAP 硬约束（未来门控）
当 Work 流程完全跑通后，以下门控必须从软约束升级为硬约束：
| 门控点             | 当前状态                                        | IAP 目标状态                                             |
| ------------------ | ----------------------------------------------- | -------------------------------------------------------- |
| Domain → Blueprint | Blueprint 可引用未定义的 term（软）             | Kernel 拒绝编译（硬）                                    |
| Blueprint → Work   | Work 可引用未 validate 的 Blueprint（软）       | `oxn work create` 必须传 validate 通过的 Blueprint（硬） |
| Work → Task        | Task 的 Part 可不在 Blueprint slot 中声明（软） | Task Part 必须匹配 Blueprint slot（硬）                  |
| Probe → Proof      | Probe 声明后无强制验证（软）                    | Daemon 逃逸机制阻止未通过 Proof 的 Work 进入 done（硬）  |
**第四条是最重要的防线**：如果 Proof 可以被 `--force` 绕过，整个 IAP 范式就名存实亡。
---
## 七、IAP 范式的终极表达
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Intent（意图轴）                                                  │
│   工程师为主 + AI 与 OXN 协作                               │
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
│   AI 为主 + 工程师与 OXN 协作                               │
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
│   OXN 为主 + AI 与工程师协作                                │
│                                                                     │
│   Probe标准 ──▶ Proof(Verdict) ◀── Artifact事实                    │
│   (from意图轴)                      (from对齐轴)                    │
│                                                                     │
│   Kernel 内核 + Infra 底座 + Daemon 守护进程                            │
│   逃逸机制：预警 + 阻止 + 诊断                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
**这就是 OpenXenon 的核心理念。**

---

## 八、两级涌现路径

IAP 范式不是"自上而下灌输的范式"，而是"自下而上生长的范式"。OpenXenon 的能力升级走两级涌现路径，每级涌现都对应一个真实痛点的自然触发。

### 8.1 涌现 1：Proof → Blueprint

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

### 8.2 涌现 2：Program Domain → Business Domain

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

### 8.3 涌现路线图

```
L0 验收层           L1 协作层                L2 演化层              L3 涌现层
Proof Only          Program Domain           Business Domain       意图涌现
                    + Blueprint              + DDD
(量具)               (图纸+夹具)             (业务图纸+团队规范)     (涌现+回流)
oxn proof create     oxn blueprint create     oxn domain create    (执行轨迹分析)
oxn proof probe add  (引用 Program Domain)    (业务术语建模)        (Hall 研讨厅)
oxn proof run        oxn work create          (Git 共享)
                                            
─── 涌现1 ───→      ─── 涌现2 ───→         ─── 涌现3 ───→
"Probe 重复了"       "技术术语不够用了"      "经验无法沉淀"
```

---

## 九、OpenXenon 路线图

OpenXenon 的开发计划以**能力层**组织，而非线性版本号。能力层 = 涌现路径上的一个台阶，每层都对应一个"对工程师说什么"的价值主张。

### 9.1 四阶段路线图

| 层 | 目标 | 核心能力 | 涌现触发 |
|---|---|---|---|
| **L0 验收层** | **Proof 闭环** | `oxn proof create / probe add / run`；`frozen.json` 不可篡改；AI 只能通过 CLI 操作 Proof | "Probe 重复了" |
| **L1 协作层** | **Program Domain + Blueprint** | 内置 `@oxn/domains/ProgramContext`；`oxn blueprint create --domain @oxn/domains/ProgramContext`；Daemon 后台守护 + 逃逸机制 | "技术术语不够用了" |
| **L2 演化层** | **Business Domain + DDD** | `oxn domain create` 业务术语建模；团队共享意图空间（Git + `@prj`）；意图变更 diff 感知 | "团队协作混乱" |
| **L3 涌现层** | **意图涌现** | 执行轨迹 → 意图空间变换；意图候选自动生成；工程师确认后成为资产；Hall 研讨厅 | "经验无法沉淀" |

### 9.2 价值主张分层

| 层 | 对工程师说什么 | 解决什么痛点 |
|---|---|---|
| **L0** | "AI 说做完了？让 OpenXenon 验收才算。" | AI 假完成、Token 白烧 |
| **L1** | "给 AI 一本编程词典和一个图纸，它就不会跑偏。" | 长任务幻觉、意图漂移 |
| **L2** | "让业务语言统一，让团队意图对齐。" | 业务知识断层、团队协作混乱 |
| **L3** | "做过的项目，下次不用重来。" | 经验无法沉淀、重复造轮子 |

### 9.3 Proof-First 入口

L0 层采用 **Proof-First 入口**——`oxn proof create` 是工程师的第一次 OpenXenon 体验，不要求先学 Domain/Blueprint：

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
# → Infra: 执行 3 个 Probe...
# →   ✅ fs-exists: ./dist/index.js found
# →   ❌ file-exports: found 'default', expected 'handler'
# → Verdict: FAIL (1/3)
# → Proof saved: .openxenon/proofs/check-deploy/frozen.json

# 5. AI 修复后再次证明
oxn proof run check-deploy
# → Verdict: PASS (3/3)
```

**`frozen.json` 的不可篡改性**：这是 OXN 签发的**检验报告**——AI 和工程师都只能读，不能改。如果 AI 能修改 `frozen.json`，Proof 轴就名存实亡。

**AI 的 Proof 约束**（CLI 白名单）：
- ✅ 允许：`oxn proof create <name>` / `oxn proof probe add <probe-ref>` / `oxn proof run <name>` / `oxn proof list` / `oxn proof show <name>`
- ❌ 禁止：直接写 `frozen.json` / 修改 `frozen.json` 的 `verdict` / 跳过 Proof 直接宣布完成

### 9.4 Program Domain（语言无关的编程概念词汇表）

L1 层的关键是 **Program Domain**——OpenXenon 内置的语言无关编程概念词汇表。工程师**不写 DDD 就能用 Blueprint**：

- 引用 `domain "@oxn/domains/ProgramContext"` 即可获得通用编程概念词典
- 涵盖 SourceFile / Module / Function / BuildArtifact / TestSuite / TestCase / Dependency / ConfigFile / EntryPoint / APIEndpoint 等通用概念
- 配套内置 Probe：`@oxn/probes/fs-exists` / `@oxn/probes/file-exports` / `@oxn/probes/test-pass` / `@oxn/probes/ts-compiles` / `@oxn/probes/http-responds` / `@oxn/probes/deps-resolved`

> Program Domain 的具体 term/invariant 列表与 Blueprint 模板在 v0.3 实施 change 中定义（语法待定）。

---
