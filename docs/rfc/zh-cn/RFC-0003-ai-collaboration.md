---
entity: rfc
id: RFC-0003
theme: ai-collaboration
version: 1.0.1
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0012: docs/adrs/0012-main-sub-agent-audit-chain.md
  - ADR-0020: docs/adrs/0020-intent-align-unified-matrix.md
  - ADR-0031: docs/adrs/0031-proof-notary-not-judge.md
  - ADR-0032: docs/adrs/0032-pi-vs-opencode-selection.md
  - ADR-0057: docs/adrs/0057-trust-chain-core-model.md
  - ADR-0058: docs/adrs/0058-minimum-trust-closure.md
  - ADR-0067: docs/adrs/0067-no-judgment-principle.md
  - ADR-0076: docs/adrs/0076-adversarial-ownership-and-cross-llm-referent.md
synced-at: 2026-07-26
---

# RFC-0003: AI 协作哲学——三相拓扑 + 彻底不判 + 对抗关系归属

> **类型**：RFC（OpenXenon 规范）
> **主题**：ai-collaboration
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）
> **合并**：OXP-0002（彻底不判原则代码贯彻）→ 本 RFC

## 摘要

OXN 与 AI Agent 协作的顶层哲学——**事后审计而非预防限制**（Main/Sub Agent 审计链）+ **彻底不判原则**（OXN 只记录事实，判定权归工程师）+ **Intent/Align 统一矩阵**（Asset = Intent, Work = Align）+ **对抗关系在 AI-vs-AI**（OXN 不是博弈方）+ **四层确定性**（v0.6.1 最小信任闭环）+ **OpenCode 选型**（避免反复讨论）。OXN 是 AI Agent 的**确定性参照系**（Referent），不是智能体本身。

## 决策要点

### D1：事后审计而非预防限制（ADR-0012）

OXN 不预防 AI 行为（不沙箱），而是记录 AI 行为到 trace.jsonl：

- **可重放**：删 state.json 仅凭 trace.jsonl 可重放完整过程
- **可解释**：AI 行为通过 trace 而非 schema 限制来解释

```
Engine (OXN) — Main Agent
   ↓ 调 Sub Agent（AI）执行 Align
Sub Agent (AI)
   ↓ 写 trace.jsonl / state.json（自描述）
   ↓ Engine 记录（不评判对错，只记录"发生了什么"）
```

**与传统沙箱对比**：

| 维度 | 传统沙箱 | OXN 事后审计 |
|---|---|---|
| 约束时机 | 预防（pre-emptive） | 事后（post-hoc） |
| 失败处理 | 拒绝执行 | 记录并继续 |
| AI 自主性 | 低 | 高（被信任 + 可审计） |

**slogan**："**OpenXenon 不生产代码，只生产证据。**"

### D2：Intent / Align 统一矩阵（ADR-0020）

OXN 四实体与 Intent/Align 矩阵映射：

```
                   Intent              Align
               (声明"我要什么")   (实施"我怎么做")
─────────────────────────────────────────────
E1 Asset      Domain / Blueprint    Part / Probe
E2 Work       work.oxn (intent)     IAP Align 阶段
E3 Engine     frozen schema         Kernel 验证
E4 Insight    涌现的"为什么"      涌现的"是什么"
```

- **Asset 是工程师的 Intent**（静态边界）
- **Work 是 AI 的 Align**（动态协作）
- **Engine 公证 Align 是否符合 Intent**
- **Insight 把 Align 反哺给 Intent**（涌现）

slogan："**Intent Arsenal, Align Work**"

### D3：OXN Engine 公证人 ≠ 裁判（ADR-0031）

OXN Engine / Probe 的本质是**公证人**，不是**裁判**：

**Engine 角色做什么**：
- ✅ 记录"发生了什么"（命令 / 退出码 / stdout / stderr）
- ✅ 在 hash 校验基础上证明"数据未被篡改"
- ✅ 输出可重现的 outcome（基于已定义规则，COMPLETED/DEVIATED/INCONCLUSIVE 三态）

**Engine 角色不做什么**：
- ❌ 评判"代码质量" / "设计好坏"
- ❌ 预测"未来风险"
- ❌ 自主决定"该不该 merge"
- ❌ 自主决定"工作是否合格"

### D4：OpenCode 选型（ADR-0032，避免反复讨论）

OXN 采用 **OpenCode** 作为 AI 协作底座（**非 Pi**）。

| 维度 | OpenCode | Pi |
|---|---|---|
| 用户基数 | 大（VS Code 兼容） | 小（研究项目） |
| 透明度 | 高（社区活跃） | 中（Pi 作者主导） |
| 维护风险 | 低 | 中 |
| 与 Bun / OXL 兼容 | ✅ 直接调 `bun` | ⚠️ 需要适配 |

未来若有人重提"切 Pi"，应引用本决策，避免重复讨论。

### D5：从 TrustChain 到观测链（ADR-0057，已 Superseded-by ADR-0066）

原 TrustChain 三方信任拓扑（ADR-0057）已被 ADR-0066 Superseded——术语 TrustChain 废弃，决策内容保留并归入 Proof desc。

**新的核心模型**：

```
工程师 ────► OXN ────► AI
   │         │         │
   │    提供客观证据   消费 OXN context
   │         │         │
   ▼         ▼         ▼
  基于证据    记录事实   执行任务
  做出判定    不评判    (走通道)
```

- **工程师**：定义边界 + 接收证据 + 基于证据判定
- **OXN**：记录事实（Probe + Trace + Frozen）+ 提供证据（Report）
- **AI**：消费 OXN context（Asset 边界 + Skill 指导）+ 执行任务

判定权归工程师，OXN 提供证据，AI 执行任务。三方不再是"信任拓扑"，而是"观测链 + 执行链"。

### D6：四层确定性最小信任闭环（ADR-0058）

v0.6.1 = 最小信任闭环——四层确定性就位：

| 层 | 决策 | 断裂点修复 |
|---|---|---|
| **D1 确定性边界** | AssetKind 6→5 收敛（domain/workflow/stack/blueprint/roadmap） | 边界表达不清 |
| **D2 确定性验证** | submitTask 真正执行 Probe + 连接 Work → Kernel verdict | AI 执行无真实验证 |
| **D3 确定性证据** | finalizeWork 写 `.run/frozen.json`（含失败路径） | 失败路径无证据 |
| **D4 确定性记录** | finalizeWorkDomains 接通调用方 + 边界违反标记 | 边界违反无记录 |

**注意**：D4 是"确定性记录"而非"硬阻断"——AI 是否跨越边界是 AI 自己的概率决策，OXN 确定性告知工程师 AI 跨越了边界，工程师决定调整边界还是接受。

### D7：彻底不判原则的代码贯彻（ADR-0067）

OXN 只记录客观事实，不评判"合格不合格"。判定权归工程师。代码层面 5 处贯彻：

1. **三态字段重命名**：`PASSED / FAILED / INCONCLUSIVE` → `COMPLETED / DEVIATED / INCONCLUSIVE`（"完成"指探测完成，不是目标完成）
2. **ProbeVerdict → ProbeOutcome**（L0 Kernel 类型）
3. **frozen.json verdict 字段 → outcome 聚合结构**（OXN 不做"整体合格/失败"聚合判定）
4. **废弃 inv-10**：proof-has-position（与"彻底不判"正面冲突）
5. **废弃 inv-9**：escape-on-probe-fail（阻断行为改"通知不阻断"——`probe-deviation-notifies-not-blocks`）

### D8：对抗关系归属与跨 LLM 参照（ADR-0076）

**对抗关系在 AI-vs-AI 之间，不在 OXN-vs-AI 之间**：

| 层 | 关系 | 性质 |
|---|---|---|
| 工程师 ↔ AI | 确定性期望 vs 非确定性产出 | OXN 验证这个边界（非博弈方） |
| AI 主 ↔ AI 子 | 1:N 委托（主编排 Task，子执行） | 可能的对抗性 |
| OXN | 验证边界 | 无利益、不搜索、不博弈 |

**软对抗两层分离**（调解审计链 vs 预防性的张力）：

| 层 | 机制 | 目的 | 哲学 |
|---|---|---|---|
| 审计链层 | Probe **声明** AI 可见 | 事后记录 AI 调用了什么 Probe | ADR-0012：不预防限制 |
| 对抗设计层 | Probe **验证标准** AI 不可见 | 防 AI 针对性绕过验证 | 软对抗（预防性隐藏） |

**跨 LLM 参照锚点**：OXN 持久化 Work/Task context（`work.md` + `tasks/<t>/task.md` + `state.json`）。任何 LLM（主或子、大或小、同会话或跨会话）通过 OXN CLI 读取即可获取上下文——OXN CLI + 持久化 context 已支持跨 LLM 委托，无需特殊协议。

## 影响范围

- ✅ 8 ADR 全 Accept（含 ADR-0057 Superseded-by ADR-0066）
- ✅ v0.6.1 四层确定性全部落地（代码层）
- ✅ frozen.json schema 完成 verdict → outcome 迁移
- ✅ ProbeOutcome 类型 + 三态字段全栈统一
- ✅ OXN Engine 仅做公证不做裁判（CLI / Probe / frozen 全部符合）
- ✅ 跨 LLM 委托机制已就位（CLI 持久化 context）

## 相关术语

- [OXN Engine](/glossary/zh-cn/core-terms.html#oxn-engine) — 确定性参照系（Referent），不是智能体
- [Proof](/glossary/zh-cn/proof-terms.html#proof) — 客观事实记录，不评判
- [ProbeOutcome](/glossary/zh-cn/proof-terms.html#probeoutcome) — 物理观测 vs 业务判定分离
- [outcome](/glossary/zh-cn/proof-terms.html#outcome) — Proof 级聚合结构
- [Work](/glossary/zh-cn/work-terms.html#work) — AI 的 Align
- [Skill](/glossary/zh-cn/cli-terms.html#skill) — AI 助手消费 OXN 能力的入口

## 相关决策

- [ADR-0012](../../adrs/0012-main-sub-agent-audit-chain.md) — 审计链哲学（2026-05-27）
- [ADR-0020](../../adrs/0020-intent-align-unified-matrix.md) — Intent/Align 矩阵（2026-06-04）
- [ADR-0031](../../adrs/0031-proof-notary-not-judge.md) — Proof 公证人 ≠ 裁判（2026-07-02）
- [ADR-0032](../../adrs/0032-pi-vs-opencode-selection.md) — OpenCode 选型（2026-07-02）
- [ADR-0057](../../adrs/0057-trust-chain-core-model.md) — TrustChain → 观测链（Superseded by 0066）
- [ADR-0058](../../adrs/0058-minimum-trust-closure.md) — 最小信任闭环（2026-07-12）
- [ADR-0067](../../adrs/0067-no-judgment-principle.md) — 彻底不判贯彻（2026-07-21）
- [ADR-0076](../../adrs/0076-adversarial-ownership-and-cross-llm-referent.md) — 对抗关系归属（2026-07-23）
- [OXP-0002（已删除）](./README.md) — 内容已合并入本 RFC；OXP 文件于 2026-07-26 Phase 3 删除

## Errata

### v1.0.1 (2026-07-26)

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

> 本段用于后续追加修正说明。核心决策自 RFC-0003 Accepted 起冻结。