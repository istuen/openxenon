# OpenXenon IAP 范式理念指南
> **工程师主定意图，AI 主导对齐，Core Engine 主给证明——三轴分离，主导权不交叉，证明不可绕过。**
---
## 一、IAP 范式总览
IAP（Intent-Align-Proof）是 OpenXenon 的架构灵魂。它定义了 AI-Native 工程中三类根本不同的工作，以及每类工作的主导者和协作方。
```
Intent ──────────────────▶ Align ──────────────────▶ Proof
(意图轴)                    (对齐轴)                   (证明轴)
工程师主导                   AI 主导                    Core Engine 主导
```
| 维度         | Intent（意图轴）     | Align（对齐轴）            | Proof（证明轴）            |
| ------------ | -------------------- | -------------------------- | -------------------------- |
| **回答什么** | 我们要什么？         | 怎么把意图展开为执行路径？ | 产物是否真的满足意图？     |
| **主导权**   | **工程师**           | **AI**                     | **Core Engine**            |
| **协作方**   | AI 补全 + Core 校验  | 工程师审核 + Core 约束     | AI 诊断 + 工程师决策       |
| **载体**     | Domain + Blueprint   | Work + Task + Part         | Probe + Artifact → Verdict |
| **风险**     | 意图漂移             | 对齐失真                   | 假完成                     |
| **对抗机制** | Domain term 锁定边界 | Blueprint slot 锁定路径    | Daemon 逃逸机制阻止假完成  |
---
## 二、三轴详解
### 1. Intent（意图轴）—— 工程师为主
**本质**：不是被动接收"需求"，而是主动建立共识语言和表达技术意图。
**为什么工程师主导？**
- 意图涉及价值观和业务判断，AI 不能替人决定"我们要什么"
- Core Engine 可以校验意图的合法性，但不能创造意图
**载体与生产权**：
```
Domain(.oxn) ──生产权──▶ Blueprint(.oxn)
"统一业务语言"           "技术意图 + Probe标准"
```
**协作模式**：
- **工程师**：定义 Domain term、声明 Blueprint slot 和 Probe
- **AI**：根据上下文补全意图细节、提示遗漏的约束
- **Core Engine**：Kernel 校验意图的语法和语义合法性（如 Blueprint 引用的 term 必须在 Domain 中定义）
**门控约束**：
- Blueprint 引用的 term 必须在 Domain 中先定义 → 否则 Kernel 拒绝编译
- Blueprint 未 validate 通过 → 不允许创建 Work
---
### 2. Align（对齐轴）—— AI 为主
**本质**：把意图展开为可执行的路径，包括编排、选件、设验三重动作。
**为什么 AI 主导？**
- 对齐是信息密度最高的拆解工作，AI 擅长将模糊意图展开为具体编排
- 工程师审核和修正，Core Engine 校验对齐的约束
**载体与生产权**：
```
Work(.oxn) ──生产权──▶ Task ──产出权──▶ Artifact
"编排+选件+设验"        "执行Part"      "产物事实"
```
**协作模式**：
- **AI**：根据 Blueprint 拆解 Work、编排 Task 序列、选择 Part、声明 Probe
- **工程师**：审核 AI 的对齐方案，修正错误的拆解
- **Core Engine**：Kernel 校验 Task 是否匹配 Blueprint slot；Infra 执行 Task 的副作用
**关键约束**：
- Task 的 Part 必须在 Blueprint 的 slot 中声明 → 否则对齐失真
- Part 是 Blueprint slot 内的**引用**（选件），不是独立的生产权节点
---
### 3. Proof（证明轴）—— Core Engine 为主
**本质**：不是被动记录"证据"，而是主动判定"产物是否满足意图"。
**为什么是"证明"而不是"证据"？**
- **证据**是中性的——无论执行成功还是失败，都会留下证据
- **证明**是有立场的——Core Engine 站在意图这一侧，判定事实是否对齐了意图
- 证据回答"我看到了这些事实"，证明回答"**我判定这些事实不满足意图**"
**为什么 Core Engine 主导？**
- 人类容易"差不多就行"，AI 容易"假完成"，只有机器不会骗自己
- Core Engine 不受情绪影响，不会因为"花了很大力气"就放行
**载体与证明权**：
```
Probe标准 ──证明权──▶ Proof(Verdict) ◀──证明权── Artifact事实
(from意图轴)                            (from对齐轴)
```
**协作模式**：
- **Core Engine**：Kernel 裁判逻辑 + Infra 获取事实 + Daemon 执行逃逸
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
## 四、Core Engine：证明轴的执行机制
Core Engine 由三个模块协同执行证明权，它们本身**不是生产权节点**，而是证明权的执行机制：
```
Kernel（裁判）    Infra（法医）    Daemon（法警）
纯逻辑验证        副作用/IO        运行时/逃逸
```
### Kernel（裁判）
- **职责**：纯逻辑验证，不碰 IO
- **回答**："Probe 声明是否合法？产物路径是否符合规则？"
- **约束**：Kernel 里永远不出现 `fs.existsSync()`
### Infra（法医）
- **职责**：执行副作用，获取事实
- **回答**："文件是否存在？进程是否运行？端口是否监听？"
- **约束**：Infra 只回答事实，不做判定
### Daemon（法警）
- **职责**：运行时管理，执行逃逸机制
- **回答**："Probe 不成立时，预警 + 阻止 Work 进入 done"
- **逃逸机制**：当 Kernel 判定 Probe FAIL 时，Daemon 触发：
  1. **预警**：通知人类/AI "执行结果未达预期"
  2. **阻止**：Work 保持 running 状态，不允许进入 done
  3. **诊断**：提供意图→对齐→证明的完整链路快照
**三模块的纯洁性约束**：
- Infra 不能绕过 Daemon 自己宣布完成（行政不能自己给自己盖章）
- Daemon 不能修改 Kernel 的规则（司法不能立法）
- Kernel 不能直接执行 Task（立法不能行政）
---
## 五、Arsenal 时代的教训
当前 `cleanup-arsenal-remaining-coupling` Change 的深层意义：**清除 IAP 混权的 Arsenal 残留，让每个模块回归自己的轴**。
| 被清理的对象             | 主导权错位                       | IAP 修正                                     |
| ------------------------ | -------------------------------- | -------------------------------------------- |
| `arsenals/builtin.ts`    | Core Engine 硬编码侵入 Intent 轴 | Probe 标准回归 `.oxn`（工程师主导）          |
| `arsenals/part-port.ts`  | Align 轴越权行使 Proof 轴的验证  | Part 可用性回归 Core Engine 校验             |
| `daemon/arsenal-promote` | Proof 轴越权行使 Intent 轴的变更 | 变更权回归 Git（工程师主导）                 |
| `@glo` 寻址              | Intent 轴分裂（全局 vs 项目）    | 统一为 `@oxn` + `@prj`（工程师在项目内主导） |
| `oxn init` 死目录        | 残留 v0.0.x 的主导权模型         | 清理后只保留 IAP 三轴对应的目录              |
**一句话总结**：Arsenal 时代是"Core Engine 僭越了所有主导权"，Cleanup 之后的 OXN 严格遵循 IAP 主导权模型。
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
│   工程师为主 + AI 与 Core Engine 协作                               │
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
│   AI 为主 + 工程师与 Core Engine 协作                               │
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
│   Core Engine 为主 + AI 与工程师协作                                │
│                                                                     │
│   Probe标准 ──▶ Proof(Verdict) ◀── Artifact事实                    │
│   (from意图轴)                      (from对齐轴)                    │
│                                                                     │
│   Kernel 裁判 + Infra 法医 + Daemon 法警                            │
│   逃逸机制：预警 + 阻止 + 诊断                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
**这就是 OpenXenon 的核心理念。**
