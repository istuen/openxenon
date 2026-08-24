---
entity: draft
drafttype: design
promote-target: rfc
promote-kind: rfc
origin: human
title: MVP 收敛 — Asset + Work 干净版
status: active
references:
  - oxn-domain
  - oxn-asset-domain
  - oxn-work-domain
  - oxn-draft-domain
---

# MVP 收敛 — Asset + Work 干净版

> 本稿是 grill-with-docs + domain-modeling skill 对 OpenXenon 盘问的最终结论。
> 盘问过程中曾考虑保留 Proof/Insight/Daemon（冻结到 post-MVP），经战略分叉讨论后推翻：
> **MVP 只保留作者当前能清晰定义的部分 = Asset + Work。其余全部删除（不冻结），保持代码与 Domain 干净。**
> 非约束性参考稿（Draft）；落正后 promote 为 RFC（走 draft-promote-router Blueprint）。

## 0. 战略分叉：为什么砍到只剩 Asset + Work

### 0.1 根因诊断

> **OpenXenon 混乱的核心是作者（我）的边界混乱。**
> 现在能清晰的就是 Asset + Work，就先做这些。
> 其他的等我清晰后再说。

盘问过程（D1-D23）曾试图保留 Proof（作为"Engine 主权验证"）、Insight（作为"涌现层"）、Daemon（作为"主动探测"），方式是"冻结到 post-MVP"。但冻结 = 保留代码 + 保留 Domain 不变量 + 加 `status: frozen` 标注——这是**把不清晰的东西留在系统里**，跟"作者边界混乱"这个根因没解，只是挂了个"待定"牌。

真正的解法：**不清晰就删，保持干净。** 等作者想清楚再加回来，加的时候是 fresh design，不是解冻一堆历史决策。

### 0.2 Proof 砍掉的理由

- **作者对 Proof "心里无底"**：无法交付说"Proof 怎么证明"。Domain axiom `ProofAsAttestationNotVerification` 早承认 Proof 不证明只见证，但名字 overpromise。"无底的模块不该当 MVP 核心。"
- **A 任务工程量大头是 Proof**：InterferenceFlag 35 个 handler 接线 + frozen 合规 + self-verify。砍掉 = MVP 时间盒大幅松绑。
- **Proof 未来方向不是当前 Probe 机制**：作者判断 Proof 更可能是形式化逻辑 + 概率论，但这方面还在学习。**当前 Probe 机制不是 Proof 的正确形态**——那就不该用"错误形态"占 MVP。

### 0.3 Insight / Daemon 砍掉的理由

- **Insight**：D3 已判定"概念承诺但实际是研究方向"。研究方向不该占产品实体位。
- **Daemon**：v0.6 哲学占位，从未实装。占着 Domain 不变量位（Inv5/7/21/22）但不产出价值。

### 0.4 砍掉后剩什么

```
OXN MVP = Asset + Work
  Asset = 领域知识的结构化表示（工程师策划的源）
  Work  = DAG 协作空间（Blueprint 实例化 + 上下文工程 + 记录协作过程）
  Blueprint = Asset 的组合输出形态（衔接 Asset → Work）

差异化锚点（vs 通用 AI 编排工具 / RAG 系统）：
  Asset + Blueprint 把领域知识作为确定性源组合，
  而非 RAG 检索（概率）+ AI 推理组织（概率）的二次概率漂移。
  Work 按 DAG 拆解 Goal，上下文沿边流动，每节点注入预制上下文。
```

## 1. 锁定决策（最终集）

### 1.1 战略决策

| # | 决策 |
|---|---|
| **D25** | **路径 β：MVP = Asset + Work only。** Proof / Insight / Daemon 全部**删除**（不冻结），保持代码与 Domain 干净。等作者想清楚再 fresh design 加回。 |
| **D26** | **Proof 未来方向 = 形式化逻辑 + 概率论**，作者仍在学习，当前不考虑。**纠正**：不是 Probe 机制错误——是 **Proof 用 Probe 做'主权验证'的方式不一定正确**（作者对'怎么证明'无底，不是对 Probe 工具无底）。Probe 作为 Engine 能力保留（见 D27）。 |
| **D5**（精化） | **混乱根因 = 作者边界混乱；解法 = 只做清晰的。** 原 D5"自举假象 = 不能交付根因"精化为：自举假象是边界混乱的症状之一，根因是作者对 Proof（主权验证）/Insight/Daemon 的边界没想清。砍掉不清晰的 = 根因消解。Probe 作为工具能力是清晰的（检查产物是否符合要求），保留。 |
| **D27** | **Probe 保留为 Engine 能力**——AI Agent 执行后请求 CLI（`oxn probe`）确认产物是否符合要求，Engine 记录结果到 Work trace.jsonl（D13）。Probe = 工具能力（检查产物），**不是主权验证**（不产 frozen.json，不不可篡改，不判决）。Probe 丢失 Proof 的主权角色，保留工具角色。 |

### 1.2 实体定义

| # | 决策 |
|---|---|
| **D24** | **Asset = 领域知识的结构化表示。** 结构化 = 两轴：(1) 选择权（工程师显式组合，非 RAG 概率检索）；(2) 脚手架（Blueprint 组合形态：Use 引用 + Boundaries 拆 Slot + Scope 范围 + Context Template 组装指令）。漂移降低是结构化的必然结果，不是独立目标。"边界"不是外加约束，是结构化的一部分。不推翻 RFC-0007 D5（OXN 仍不做价值判断——哪些经验值得沉淀归工程师），但对外叙事从"边界工程"改为"知识表示工程"更诚实。 |
| **D15** | **Blueprint = Asset 的组合输出形态。** Domain/Workflow/Stack = 源知识输入；Blueprint = 组合输出给 Work/AI 消费。不拆独立实体，但在 Asset Domain 加角色标注。Blueprint 是 Asset 与 Work 之间的衔接层。 |
| **D8**（精化） | **顶层实体 = Asset + Work（两个）。** 去掉 E1-E4 前缀。Engine 是实现基座（L0-L3 分层），不是产品实体。Proof/Insight 删除后无第三实体。 |
| **D13** | **Work 记录协作过程是自身职责，不绑消费者。** trace.jsonl 是 Work 的运行日志（调试/审计用），消费者（未来 Proof/Insight）post-MVP 才来。MVP 里 trace 就是日志，不要求有消费者。 |
| **D10**（精化） | **IAP 退役到理念叙事层。** 实现术语 = Asset/Work。MVP 里 Work 生命周期 = create → lock → run → submit（无 finalize/Proof 阶段）。Intent/Align 作为"阶段视角"保留在叙事，不作为实现术语。 |

### 1.3 Asset vs RAG 的区别（两轴分析）

| 轴 | RAG | Asset + Blueprint |
|---|---|---|
| **知识选择权** | 检索算法（embedding 相似度）= 概率 | 工程师显式组合 = 确定性（可能判断错，但是可追溯的判断错，不是概率错） |
| **知识结构** | 文本块（chunk），轻结构 = AI 自己推理组织 | 脚手架（Slot 告诉 AI"这里填这个"）= AI 在结构里填空 |

```
RAG 漂移 = 检索错（轴1概率）+ 组织错（轴2概率）= 两层概率叠加
Blueprint 漂移 = 工程师组合可能不合实际（轴1判断，可 review 修正）+ AI 在脚手架内推理（轴2约束）
```

**本质区别**：确定性输入上的错误是可追溯的；概率性输入上的错误是难追溯的。

### 1.4 Work = DAG 协作空间

| | RAG | Work |
|---|---|---|
| 知识流向 | 查询 → 检索块 → 拼 prompt | Blueprint 声明 → Work 物化 context.md → Task 按 Slot 拆 context.md |
| 拓扑 | 无（每次查询独立） | **DAG**：Goal → Tasks（有 deps，无环） |
| 上下文传递 | 每轮重新检索 | 沿 DAG 边流动（父 task context → 子 task context） |

Work 的上下文工程 = **DAG 拓扑上的结构化上下文流**：
- `tasks/<t>/context.md` = DAG 节点的上下文
- `deps` = DAG 边（task 间依赖）
- Blueprint Boundaries（Slots）= 如何把 WorkContext 拆成 DAG 节点

### 1.5 实施层

| # | 决策 |
|---|---|
| **D7** | Draft 保留 MVP；promote target 限 `rfc` + `asset`；`work` 永久废弃；`goal` 随 C（三层承诺流水线）post-MVP 开放。 |
| **D19** | PlanLock = 4-hash（全 .md 文件）：workMd / workContext / blueprints(composite) / tasks / taskContexts。PlanLock 的 MVP 价值 = 保护 Asset/work 定义完整性（drift 检测），独立于 Proof。Inv31 + Inv33 保留，Inv33 依据 = per-Task context 独立文件。 |
| **D18** | 60 个旧 Work 归档 `.openxenon/.archived/works/`（含其 frozen.json，作为历史记录）；不做 schema 迁移。B scope 不含迁移工具。 |
| **D20** | Skill locales = 2（en + zh-CN）；README + 对外文档"8 locales"改为 2。 |
| **D21** | B scope 含"Skill 内容同步"——compiled skill 的 instruction.md 命令须跟 0.6.x CLI 一致。 |
| **D22** | Skill 分发不阻塞 MVP 发版（机制已实装：oxn init --ai opencode/cursor/codex）。 |

### 1.6 发版与分支

| # | 决策 |
|---|---|
| **D11** | 分支模型：feat/v0.6.1 正名 dev（删僵尸 feat 分支）；MVP 从 dev 拉 feat/goal-* 分支；发版时 cut main → npm publish from main。 |
| **D16** | 基线策略：先在 feat/v0.6.1 上做完 B，再正名 dev。A 任务不存在（Proof 砍掉后 self-verify moot）。 |

## 2. MVP 边界（最终版）

```
MVP = Asset + Work（DAG 协作空间）+ Skill 能力分发

✅ 保留：
  - Asset（领域知识结构化表示）
    · Domain / Workflow / Stack（源知识）
    · Blueprint（组合输出形态，D15）
    · AssetMap（路由）
    · 正文结构：## Group → ### Axiom → - Theorem
  - Work（DAG 协作空间）
    · 生命周期：create → lock → run → submit（无 finalize/Proof）
    · work.md / task.md / context.md / tasks/<t>/context.md（全 .md）
    · PlanLock 4-hash（D19，保护完整性）
    · trace.jsonl（Work 自身日志，D13）
    · state.json（运行态）
  - Blueprint 衔接层（Asset → Work）
    · ## Use（引用 Assets）+ ## Boundaries（拆 Slot）+ ## Scope（文件范围）+ ## Context Template（组装指令）
  - Probe（Engine 能力，D27）
    · AI Agent 经 CLI 调用检查产物是否符合要求
    · 结果记 Work trace.jsonl（不产 frozen.json，不不可篡改）
    · probe handler + catalog + `oxn probe` 命令族保留
  - L0-L3 工程分层（D9，Engine 内部约束）
  - Draft（promote target 限 rfc + asset，D7）
  - Skill 分发（oxn init --ai opencode/cursor/codex；2 locales，D20/D22）

❌ 删除（不冻结，保持干净）：
  - Proof 模块（packages/engine/src/Proof/ 全部：frozen writer / proof-manager / runner / outcome-writer）
  - frozen.json（全部 141 个：15 Proof-First + 101 task-level + 25 work-level）
  - Inv11/14/15/25 + InterferenceFlag 12 项 + trust-baseline.ts
  - frozen 不可篡改机制（chmod 0o444 + content_hash + writeFrozenImmutable）
  - Insight 模块（packages/engine/src/Insight/）
  - E4 Insight 概念
  - Daemon（代码 + Inv5/7/21/22）
  - Round 多轮（§Round + Inv18-21，已 D6 cut，现删除不冻结）
  - Draft → Goal → Version 三层承诺流水线（C）
  - Intent Pool v3 + oxn pool *（已退役）
  - self-verify 任务（A，Proof 砍掉后 moot）
  - oxn proof * 命令族（主权验证命令，D26）
  - Providers（File/Http/Shell/Git，InterferenceFlag 检测器，随 Proof 删）
  - kernel/verdicts 中 Proof 专属部分（cross-proof-compute / insight-compute / pipeline-compute）
```

## 3. 删除清单（代码 + Domain）

### 3.1 代码删除 / 保留精确划分

> **关键区分**：Proof（主权验证）删除；Probe（工具能力，D27）保留。代码里本就分开（`oxn proof` vs `oxn probe` 是独立 CLI）。

**删除（Proof 主权验证 + Insight + Daemon）：**

| 路径 | 内容 | 动作 |
|---|---|---|
| `packages/engine/src/Proof/proof-frozen-writer.ts` | frozen.json 不可篡改 writer | **删除** |
| `packages/engine/src/Proof/proof-manager.ts` | Proof 主权验证编排 | **删除** |
| `packages/engine/src/Proof/runner.ts` | Proof 主权执行 runner | **删除** |
| `packages/engine/src/Proof/outcome-writer.ts` | outcome.md writer | **删除** |
| `packages/engine/src/infra/frozen/immutable.ts` | writeFrozenImmutable 共享工具（仅 Proof 用） | **删除** |
| `packages/engine/src/kernel/verdicts/trust-baseline.ts` | InterferenceFlag RED/YELLOW 信任基线 | **删除** |
| `packages/engine/src/kernel/verdicts/cross-proof-compute.ts` | Proof 跨计算 | **删除** |
| `packages/engine/src/kernel/verdicts/insight-compute.ts` | Insight 计算 | **删除** |
| `packages/engine/src/kernel/verdicts/pipeline-compute.ts` | Proof pipeline 计算 | **删除** |
| `packages/engine/src/infra/providers/` | File/Http/Shell/Git Provider（InterferenceFlag 检测器） | **删除** |
| `packages/engine/src/Insight/` | Insight 模块 | **删除** |
| `packages/engine/src/daemon.ts` + `src/daemon/`（如有） | Daemon 代码 | **删除** |
| `packages/cli/src/commands/proof.ts` | `oxn proof` 命令族（主权验证） | **删除** |
| `packages/cli/src/commands/daemon*.ts`（如有） | `oxn daemon` 命令 | **删除** |
| `.openxenon/proofs/` | 15 个 Proof-First frozen.json | **删除** |
| `works/*/.run/frozen.json` + `tasks/*/frozen.json` | 126 个 Work 内 frozen.json | **随旧 Work 归档**（D18） |

**保留（Probe 能力，D27）：**

| 路径 | 内容 | 理由 |
|---|---|---|
| `packages/engine/src/infra/probes/*.ts` | ~35 个 probe handler（fs-exists / http-responds / shell-exec / git-clean 等） | Probe 工具能力核心，AI 经 CLI 调用检查产物 |
| `packages/engine/src/Proof/probe-lint.ts` | Probe lint（质量检查） | 迁移到 `infra/probes/` 或独立位置（Probe 质量保障，非 Proof 主权） |
| `packages/engine/src/kernel/verdicts/catalog.ts` | Probe 注册表 | `oxn probe list` 需要；Probe 发现机制 |
| `packages/engine/src/kernel/verdicts/verdict.ts` | Probe 结果判定 | **REVIEW**：保留 Probe 结果计算逻辑（COMPLETED/DEVIATED），删 Proof 聚合部分（frozen 聚合）。B 任务实施时拆分。 |
| `packages/engine/src/kernel/verdicts/probe-stats-updater.ts` | Probe 统计 | **REVIEW**：若 Probe 能力需要统计则保留，否则删 |
| `packages/engine/src/kernel/verdicts/extraction.ts` | 提取逻辑 | **REVIEW**：B 任务实施时判定归属 |
| `packages/cli/src/commands/probe.ts` | `oxn probe` 命令 | **保留**（AI 入口，D27） |
| `packages/cli/src/commands/probe-add.ts` 等 | `oxn probe-add` / `probe-list` / `probe-fix` / `probe-registry-store` | **保留**（Probe 管理命令） |
| `oxn proof probe list/describe/add`（嵌套在 proof.ts） | Probe 子命令嵌套在 Proof 下 | **迁移**到 `oxn probe` 命令族（若未重复），或删重复部分 |

### 3.2 Domain 处理（归档不删除）

> Domain 文件是设计决策记录，归档保留历史，不污染 active SSOT。

| 文件 | 动作 |
|---|---|
| `.openxenon/assets/domains/oxn-proof-domain.md` | **部分归档**：Proof 主权验证段（§Proof / §Frozen / §ProofAsAttestationNotVerification / §ProofAsObjectiveOutcome / Inv11/14/15/25 / §InterferenceFlag / §TrustBaselineLadder）归档到 `.openxenon/.archived/`；**Probe 段保留**（§Probe / §ProbeOutcome / Probe handler 契约）迁移到新文件 `oxn-probe-domain.md` 或并入 `oxn-engine-domain.md`。 |
| `oxn-engine-domain.md` 中 §Daemon + Inv5/7/21/22 | **删除段**（Daemon 砍）；§Proof 相关段删除（归档到 proof-domain 归档件）；**Probe 能力段保留** |
| `oxn-domain.md` 中 §Proof / §Insight / §Daemon term | **删除 term**（顶层只留 Asset / Work / OpenXenon / OXN CLI / OXN Engine / OpenXenonLanguage / Draft 等）；**Probe 作为 Engine 能力在 OXN Engine term 下提及** |
| `oxn-work-domain.md` 中 §Round + Inv18-21 + §Frozen + §Proof 相关段 | **删除段**；Work finalize 阶段删除（无 Proof）；**Probe 调用作为 Work 内 AI 行为保留**（AI 可在 run 阶段调 `oxn probe` 检查产物） |
| `oxn-asset-domain.md` 中 §InsightDraftMapping 等 Proof/Insight 引用 | **删除引用段** |
| `oxn-draft-domain.md` 中 §DraftOrigin 的 insight origin | **删除 insight origin**（DraftOrigin 只留 human） |

### 3.3 文档更新

| 文件 | 动作 |
|---|---|
| `architecture.md` | §1 表只留 Asset/Work（删 E3 Engine Proof / E4 Insight）；§3 目录树删 Proof/Insight/Intent/Align 模块行，**保留 Probe 能力行**；§7 与 OpenSpec 对比收窄（删 Engine 公证 / E4 涌现 / 多轮 Round 行，差异化改为"结构化知识 + DAG 上下文 vs RAG 概率漂移"）；§8 Skill 数量对齐 |
| `README.md` + `introduction.md` | 去 Proof/Insight/Daemon 外宣；**保留 Probe 作为 Engine 能力提及**（AI 可调 CLI 检查产物）；"8 locales"→2；差异化叙事改为 Asset + Work + Blueprint；去 E1-E4/IAP 外宣 |
| `AGENTS.md` | 更新入口指针（删 Proof/Insight/Daemon 引用，保留 Probe）；版本号同步 |

## 3.4 开放问题（B 任务实施时定）

> 以下因 Probe 保留而新出现的设计问题，盘问阶段不锁，留 B 任务实施时解决。

| 问题 | 选项 | 备注 |
|---|---|---|
| **ProbeOutcome 三态** | (a) 保留 COMPLETED/DEVIATED/INCONCLUSIVE，INCONCLUSIVE 语义改为"Probe 无法执行"（timeout/permission 等），不再由 RED flag 触发；(b) 简化为 COMPLETED/DEVIATED 两态，删 INCONCLUSIVE | InterferenceFlag 删后，原 RED flag 短路路径消失。INCONCLUSIVE 是否有用取决于 Probe 作为工具是否需要表达"跑不了" |
| **InterferenceFlag 12 项** | 删除（已定） | 随 Proof 主权验证删；Probe 作为工具不强制信任基线（AI 用结果，AI 决定信不信） |
| **Providers（File/Http/Shell/Git）** | 删除（已定） | 是 InterferenceFlag 检测器；Probe handler 继续直接 IO（现状） |
| **verdict.ts 拆分** | 保留 Probe 结果计算逻辑（COMPLETED/DEVIATED 判定），删 Proof 聚合（frozen outcome 聚合） | B 任务实施时拆 |
| **Probe 结果记录位置** | Work trace.jsonl（D13） | AI 调 `oxn probe` → 结果 append 到当前 Work 的 trace.jsonl；若无 Work 上下文则只输出到 stdout |

## 4. B 任务 scope（work-unified-model，精简版）

> 从 feat/v0.6.1 拉 feat/goal-work-unified-model；做完 merge 回 feat/v0.6.1 后正名 dev（D16）。

| 子项 | 动作 |
|---|---|
| **决策 1 · Asset 创建统一** | 删 `--asset-kind` 短路（`work.ts:518-527 handleAssetModeCreate`）；Asset 创建必走完整 Work + Blueprint |
| **决策 2 · Work 引用收敛** | Work 引用收敛到 Blueprint-only；删 Track A 直接引用模型；blueprintsHash 升级 composite（Blueprint + 3 边界） |
| **决策 4 · 阶段缩减** | Work 生命周期 = create → lock → run → submit（4 步，无 finalize/Proof）；现有 work.md 不迁移（D18） |
| **PlanLock 4-hash** | 实装 D19（workMd / workContext / blueprints-composite / tasks / taskContexts） |
| **Proof/Insight/Daemon 代码删除** | 按 §3.1 清单删代码 + 归档 Domain |
| **文档对齐** | 按 §3.3 清单更新 architecture.md / README / introduction / AGENTS.md |
| **Skill 内容同步（D21）** | 校对 instruction.md 命令时效；重跑 `oxn init -f` 重建 `.opencode/skills/`；locale 数量对齐 D20 |

**B 不含**：Round 改进（已删）/ 旧 Work 迁移（D18）/ Proof 相关（全删）/ self-verify（A 不存在）/ Draft→Goal→Version（C 推后）。

**A 任务**：不存在。Proof 砍掉后 self-verify moot。Work+Asset 端到端跑通的验证在 B 完成后手工跑一次即可（不作为独立 task）。

## 5. 退役决策历史（盘问过程记录）

> 以下决策在盘问过程中曾锁定，经 D25 战略分叉后**推翻或精化**。保留记录供未来参考。

| 原决策 | 内容 | 现状 |
|---|---|---|
| D1 | Proof 是 Engine 主权能力 | **推翻**（D25：Proof 删除） |
| D2 | Work finalize 调 Proof 模块 | **推翻**（无 finalize 阶段） |
| D3 | E4 Insight cut（post-MVP 研究） | **精化**（D25：删除不冻结） |
| D6 | Round cut（冻结 v0.8+） | **精化**（D25：删除不冻结） |
| D14 | 证据链 = Proof 产物 | **推翻**（D25：Proof 删除） |
| D17 | frozen.json .proof/ 布局 | **推翻**（D25：frozen.json 全删） |
| D23 | InterferenceFlag 接线归 A | **推翻**（D25：InterferenceFlag 随 Proof 主权验证删；Probe 保留但不需要信任基线） |

## 6. 下一步执行序

```
1. 本稿 promote → docs/rfcs/zh-cn/RFC-XXXX-mvp-convergence.md
2. B 任务启动（feat/goal-work-unified-model）：
   a. 代码删除（§3.1）：Proof/Insight/Daemon/Probe/Provider 全删
   b. Domain 归档（§3.2）：proof-domain 归档，其余 Domain 删段
   c. 文档更新（§3.3）：architecture/README/introduction/AGENTS
   d. Work 核心修复（决策 1/2/4 + PlanLock 4-hash）
   e. Skill 内容同步（D21）
   f. 旧 Work 归档（D18）
   g. 跑守门：check-doc-boundary + validate-dependencies + sync-domain-glossary
3. B 完成后 merge 回 feat/v0.6.1 → 正名 dev
4. 手工跑 1 个端到端 Work 验证 Asset + Work 闭环
5. dev 稳定 → cut main → npm publish MVP
6. post-MVP（等作者想清楚）：
   - Proof 重新设计（形式化逻辑 + 概率论方向，D26）
   - Insight 重新设计（若有涌现需求）
   - Daemon 重新设计（若有主动探测需求）
   - Round（v0.8+，若有跨轮需求）
   - Draft → Goal → Version 三层承诺流水线（C）
```

## 7. 未来 Proof 的再设计原则（D26 备注）

作者判断：Proof 未来方向 = 形式化逻辑 + 概率论。这方面作者仍在学习，当前不考虑。

**纠正**（D26）：不是 Probe 机制错误——Probe 作为 Engine 能力保留（D27）。是 **Proof 用 Probe 做"主权验证"的方式不一定正确**——作者对"怎么证明"无底。

再设计时的约束：
- 不复用 frozen.json / Inv11 / InterferenceFlag 机制（已删除）
- 需要先解决"Proof 怎么证明"的名字 overpromise（公证 vs 验证 vs 形式化证明，语义要锁死）
- 需要有实证需求支撑（真实用户反馈"AI 假完成是痛点"），不空想
- 作为 fresh design 加回，不是解冻历史决策
- Probe 能力（D27）可复用——但 Proof 再设计时若发现 Probe 不适合新 Proof 形态，可另设计验证工具
