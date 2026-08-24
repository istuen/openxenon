---
entity: rfc
id: RFC-0032
theme: mvp-convergence
status: Accepted
date: 2026-08-14
accepted: 2026-08-14
accepted-at: 2026-08-14
synced-at: 2026-08-14
---

# RFC-0032: OpenXenon MVP 收敛 — Asset + Work 干净版

> **主题**：经 grill-with-docs + domain-modeling 盘问，OpenXenon MVP 收敛到 **Asset + Work（+ Probe 能力 + Skill 分发）**。Proof / Insight / Daemon / Round / Draft→Goal→Version 全部**删除**（不冻结），保持代码与 Domain 干净。
> **来源**：2026-08-14 `/grilling` session（详尽分析档案：`.openxenon/drafts/design-mvp-convergence-grilling.md`）
> **状态**：✅ **Accepted**（2026-08-14）— 决策已锁定，实施由 work-unified-model 承载。

## 决策要点

1. **D25 · MVP = Asset + Work only**：Proof / Insight / Daemon 全部**删除**（不冻结）。根因：作者对这些模块的边界没想清，不清晰的就不该留在系统里。冻结 = 留僵尸，删 = 保持干净，等想清楚再 fresh design 加回。

2. **D26 · Proof 未来方向 = 形式化逻辑 + 概率论**（作者仍在学习）。**纠正**：不是 Probe 机制错误——Probe 作为 Engine 能力保留（D27）。是 **Proof 用 Probe 做"主权验证"的方式不一定正确**。作者对"怎么证明"无底。

3. **D27 · Probe 保留为 Engine 能力**：AI Agent 执行后经 CLI（`oxn probe`）确认产物是否符合要求，Engine 记录结果到 Work trace.jsonl。Probe = 工具能力（检查产物），**不是主权验证**（不产 frozen.json，不不可篡改，不判决）。Probe 丢失 Proof 的主权角色，保留工具角色。

4. **D24 · Asset = 领域知识的结构化表示**：结构化 = 两轴——(1) 选择权（工程师显式组合，非 RAG 概率检索）；(2) 脚手架（Blueprint 组合形态）。漂移降低是结构化的必然结果。不推翻 RFC-0007 D5（OXN 仍不做价值判断），但对外叙事从"边界工程"改为"知识表示工程"。

5. **D15 · Blueprint = Asset 的组合输出形态**：Domain/Workflow/Stack = 源知识输入；Blueprint = 组合输出给 Work/AI 消费。衔接 Asset → Work。

6. **D8 · 顶层实体 = Asset + Work（两个）**：去掉 E1-E4 前缀。Engine 是实现基座（L0-L3），不是产品实体。Proof/Insight 删除后无第三实体。

7. **D10 · IAP 退役到理念叙事层**：实现术语 = Asset/Work。MVP Work 生命周期 = create → lock → run → submit（无 finalize/Proof）。Intent/Align 作为"阶段视角"保留在叙事。

8. **D13 · Work 记录协作过程是自身职责**：trace.jsonl 是 Work 运行日志，不绑消费者。Work = DAG 协作空间（Goal → Tasks 有 deps 无环，上下文沿边流动）。

9. **D5（精化）· 混乱根因 = 作者边界混乱**：自举假象是症状，根因是作者对 Proof/Insight/Daemon 边界没想清。砍掉不清晰的 = 根因消解。

## 影响范围

### 代码删除（B 任务 work-unified-model 承载）

| 路径 | 动作 |
|---|---|
| `packages/engine/src/Proof/`（frozen-writer / proof-manager / runner / outcome-writer） | 删除 |
| `packages/engine/src/infra/frozen/immutable.ts`（writeFrozenImmutable） | 删除 |
| `packages/engine/src/kernel/verdicts/trust-baseline.ts`（InterferenceFlag）+ cross-proof-compute + insight-compute + pipeline-compute | 删除 |
| `packages/engine/src/infra/providers/`（InterferenceFlag 检测器） | 删除 |
| `packages/engine/src/Insight/` | 删除 |
| `packages/engine/src/daemon.ts` + `daemon/` | 删除 |
| `packages/cli/src/commands/proof.ts`（`oxn proof` 命令族） | 删除 |
| `.openxenon/proofs/`（15 个 Proof-First frozen.json） | 删除 |
| `works/*/.run/frozen.json` + `tasks/*/frozen.json`（126 个） | 随旧 Work 归档（D18） |

### 代码保留（Probe 能力，D27）

| 路径 | 理由 |
|---|---|
| `packages/engine/src/infra/probes/*.ts`（~35 handler） | Probe 工具能力核心 |
| `packages/engine/src/kernel/verdicts/catalog.ts` | Probe 注册表（`oxn probe list`） |
| `packages/engine/src/kernel/verdicts/verdict.ts` | **REVIEW**：保留 Probe 结果计算，删 Proof 聚合 |
| `packages/cli/src/commands/probe*.ts`（probe / probe-add / probe-list / probe-fix / probe-registry-store） | `oxn probe` 命令族（AI 入口） |

### Domain 处理

| 文件 | 动作 |
|---|---|
| `oxn-proof-domain.md` | **部分归档**：Proof 主权验证段（§Proof / §Frozen / Inv11/14/15/25 / §InterferenceFlag / §TrustBaselineLadder / §Insight / Inv30-36）归档到 `.openxenon/.archived/`；**Probe 段保留**（§Probe / §ProbeOutcome / Inv1-9/13/22/23/26/29）迁移到 `oxn-engine-domain.md` 或新建 `oxn-probe-domain.md` |
| `oxn-domain.md` | 删 §Proof / §Insight / §Daemon / §Hall term；§IAPClosedLoop 标注退役理念层；§EngineeringDefinesAgentBoundary 去 E1-E3 前缀 + 删 Proof frozen.json；Probe 在 §OXN Engine 下提及 |
| `oxn-engine-domain.md` | 删 §Daemon + Inv5/7/21/22 + §Proof 主权段；保留 Probe 能力段 |
| `oxn-work-domain.md` | 删 §Round + Inv18-21 + §Frozen + §Proof 段；保留 Probe 调用（Work run 阶段 AI 可调 `oxn probe`） |
| `oxn-asset-domain.md` | 删 §InsightDraftMapping 等 Proof/Insight 引用 |
| `oxn-draft-domain.md` | 删 §DraftOrigin 的 insight origin（只留 human） |

### 文档更新

| 文件 | 动作 |
|---|---|
| `architecture.md` | §1 表只留 Asset/Work；§3 目录树删 Proof/Insight/Intent/Align，保留 Probe；§7 与 OpenSpec 对比收窄（差异化改为"结构化知识 + DAG 上下文 vs RAG 概率漂移"）；§8 Skill 数量对齐 |
| `README.md` + `introduction.md` | 去 Proof/Insight/Daemon 外宣，保留 Probe 能力提及；"8 locales"→2；差异化叙事改为 Asset + Work + Blueprint |
| `AGENTS.md` | 入口指针删 Proof/Insight/Daemon 引用，保留 Probe；版本号同步 |

## MVP 边界（最终版）

```
MVP = Asset + Work（DAG）+ Probe（Engine 能力）+ Skill 分发

✅ Asset：Domain / Workflow / Stack（源）+ Blueprint（组合输出）+ AssetMap
✅ Work：create→lock→run→submit；PlanLock 4-hash（workMd/workContext/blueprints-composite/tasks/taskContexts）；trace.jsonl + state.json
✅ Probe：AI 经 CLI 检查产物，结果记 trace（不产 frozen，不主权验证）
✅ Skill：oxn init --ai opencode/cursor/codex；2 locales（en + zh-CN）
✅ Draft：promote target 限 rfc + asset
✅ L0-L3 工程分层（Engine 内部约束）

❌ 删除：Proof（主权验证）/ frozen.json / InterferenceFlag / Insight / Daemon
       / Round / Draft→Goal→Version / self-verify / oxn proof *
```

## 开放问题（B 任务实施时定）

| 问题 | 备注 |
|---|---|
| ProbeOutcome 三态 | INCONCLUSIVE 失去 RED flag 触发路径。选项：(a) 保留三态，INCONCLUSIVE 改义"Probe 无法执行"；(b) 简化两态 |
| verdict.ts 拆分 | 保留 Probe 结果计算（COMPLETED/DEVIATED），删 Proof 聚合 |
| Probe 结果记录 | Work trace.jsonl（D13）；无 Work 上下文则 stdout |

## 相关术语

- Asset（领域知识结构化表示）— [`oxn-asset-domain`](../../../.openxenon/assets/domains/oxn-asset-domain.md)
- Work（DAG 协作空间）— [`oxn-work-domain`](../../../.openxenon/assets/domains/oxn-work-domain.md)
- Blueprint（Asset 组合输出形态）— D15
- Probe（Engine 工具能力）— D27，迁移到 `oxn-engine-domain` 或新建 `oxn-probe-domain`

## 相关决策

- **RFC-0007 D5**：OXN 做边界工程不做知识工程 — 本 RFC D24 精化对外叙事为"知识表示工程"，不推翻 D5（OXN 仍不做价值判断）
- **RFC-0026**：version-iteration-redesign（三层承诺流水线）— 本 RFC 推后到 post-MVP
- **RFC-0028**：context-map-deprecation — 保留（AGENTS.md AI 入口段依赖）
- **ADR-0098**：branch-model-main-dev-feat — 本 RFC D11 确认 feat→dev→main 路径

## 退役决策（盘问过程曾锁定，本 RFC 推翻）

| 原决策 | 现状 |
|---|---|
| Proof 是 Engine 主权能力（D1） | 推翻（D25） |
| Work finalize 调 Proof（D2） | 推翻（无 finalize） |
| 证据链 = Proof 产物（D14） | 推翻（D25） |
| frozen.json .proof/ 布局（D17） | 推翻（frozen 全删） |
| InterferenceFlag 接线归 A（D23） | 推翻（随 Proof 删） |

## Errata

<!-- status: Accepted 后冻结，仅可追加 errata 段 -->
