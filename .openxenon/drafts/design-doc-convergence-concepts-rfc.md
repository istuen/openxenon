---
entity: draft
id: design-doc-convergence-concepts-rfc
type: design
promote-target: rfc
created: 2026-08-25
status: active
---

# Design: 文档收敛 — concepts/ 旧叙事 + RFC 0015-0017 处置

> **来源**：RFC-0033（Work 极简化）落地后的文档收敛收尾。RFC-0032 删除 Proof/Insight/Daemon + RFC-0033 删 PlanLock/重定义 Hash 后，`docs/product/zh-cn/concepts/` 9 文件与 `docs/rfc/` 的 0015-0017 仍带旧叙事，需对齐代码现实。
> **原则**：不清晰就删，保持干净（D5）。归档优先于重写；重写优先于保留 stale。
> **裁决依据**：Domain SSOT（`.openxenon/assets/domains/*.md`）已先行收敛（RFC-0032 Phase 1 + RFC-0033 Domain 同步），本文档处置的是"外部叙事层"对齐。

## 一、concepts/ 处置矩阵

| 文件 | 行数 | stale 命中 | 处置 | 理由 |
|---|---|---|---|---|
| `proof.md` | 579 | 109 | **归档** → `.openxenon/.archived/docs/concepts/proof.md` | Proof 代码 + Domain 已删（RFC-0032 D25） |
| `insight.md` | 190 | 53 | **归档** → `.openxenon/.archived/docs/concepts/insight.md` | Insight 代码 + Domain 已删 |
| `_index.md` | 29 | 8 | **重写** | E1-E4 → Asset / Work / Probe + Skill 入口；去 IAP 主权叙事 |
| `iap-paradigm.md` | 412 | 64 | **重写**（收敛） | IAP 退役到理念叙事层（D10）；去 E1-E4 实施术语；保留"I-A-P 协作节奏"理念，删"主权/不可篡改"叙事 |
| `work.md` | 853 | 134 | **重写**（收敛） | 对齐 RFC-0033：3 步生命周期 create→run→submit；删 Round / finalize / PlanLock / frozen.json / 6 步流程 / 三层锁 |
| `lifecycle.md` | 308 | 28 | **重写**（收敛） | 9 阶段 → 3 步 create→run→submit；删"申请证明/独立验证/证明产出/观测判断"4 阶段 |
| `asset.md` | 406 | 15 | **修订** | 删 E1 标签 / 三层锁 / validate→lock→run→finalize 8 阶段叙事；对齐 D24 知识结构化 |
| `asset-paper.md` | 374 | 4 | **修订** | 少量 stale 引用清理（4 处 Proof/frozen 提及） |
| `glossary.md` | 1590 | 42 | **重新生成** | `bun scripts/sync-domain-glossary.ts --write`（Domain SSOT 已收敛，glossary 自动覆盖） |

### 重写目标行数（"不清晰就删"原则）

| 文件 | 现行 | 目标 | 删减 |
|---|---|---|---|
| `_index.md` | 29 | ≤ 20 | 删 E1-E4 速览表，改 Asset/Work/Probe + Skill 4 入口 |
| `iap-paradigm.md` | 412 | ≤ 150 | 删 §2 L0-L3 / §7 E3 Engine / §8 E4 Insight / §11 三相模型 / §12 审计链；保留 I-A-P 节奏理念 |
| `work.md` | 853 | ≤ 200 | 删 Round / finalize / PlanLock / 三层锁 / dual-state 内部 / 8 阶段映射表；留 3 步 + 物理布局 + DRIFT |
| `lifecycle.md` | 308 | ≤ 80 | 9 阶段 → 3 步 + 每步三方分工 + 速查表 |
| `asset.md` | 406 | ≤ 200 | 删 E1 / 三层锁 / 8 阶段创建 / props 漏斗 / ArsenalResolver；留 Domain/Workflow/Stack/Blueprint + 创建路径 |

**总删减**：~2270 行 → ~650 行（-71%）。

## 二、RFC 0015-0017 处置矩阵

| RFC | 现状态 | 主题 | 处置 | 理由 |
|---|---|---|---|---|
| RFC-0015 | Draft | proof-system-overhaul | **归档** → `.openxenon/.archived/docs/rfc/RFC-0015-*.md` | Proof 整体系已删（RFC-0032 D25）；Draft 未执行且永远不会执行 |
| RFC-0016 | Draft | generic-verification-probes | **promote → Accepted** | 4 个 probe（file-hash / test-coverage / json-path / port-listening）全部已实现于 `packages/engine/src/infra/probes/`，是事实 Accepted |
| RFC-0017 | Draft | terminology-two-tier-ssot | **superseded-by AGENTS.md §裁决规则**（2 档简化） | RFC-0028 D1 整体退役 CONTEXT-MAP + AGENTS.md §裁决规则已落地"2 档简化"（Domain SSOT + AGENTS.md 兜底），覆盖 RFC-0017 的"双层 SSOT"设计 |

### RFC-0017 supersede 说明

RFC-0017 设计"Domain 内部 + glossary 外部"双层 SSOT。当前现实：
- **Domain 内部 SSOT**：✅ 保留（`.openxenon/assets/domains/*.md`）
- **glossary 外部 SSOT**：✅ 保留（`docs/product/zh-cn/concepts/glossary.md`，sync-domain-glossary 自动生成）
- **双层裁决**：❌ 被 AGENTS.md §裁决规则"2 档简化"取代（RFC-0018 5 级 → 2 档；RFC-0028 D1 退役 CONTEXT-MAP）

→ RFC-0017 的"术语双层"架构保留，但"裁决规则"部分被 2 档简化取代。标 `superseded-by: AGENTS.md`（非 RFC，因 2 档简化在 AGENTS.md §裁决规则）。

## 三、RFC 0001-0014 deprecated 补标

### 已标记 deprecated（7 个，无需动）

0001 / 0002 / 0004 / 0006 / 0008 / 0010 / 0013

### 未标记（7 个）— 处置

| RFC | 主题 | 处置 | 理由 |
|---|---|---|---|
| RFC-0003 | ai-collaboration | **保留**（标 `deprecated: false` 或不动） | 三相拓扑 + 彻底不判哲学仍有效 |
| RFC-0005 | insight-skill | **标 superseded-by RFC-0032** | Insight 已删（RFC-0032 D25） |
| RFC-0007 | domain-positioning | **保留** | Referent 参照系 + 边界工程仍有效 |
| RFC-0009 | doc-three-modalities | **保留** | Asset / RFC / Doc 三情态仍有效 |
| RFC-0011 | builtin-asset-two-layer | **保留** | `@oxn/` fallback + `@prj/` override 仍有效 |
| RFC-0012 | bootstrap-exemption | **保留** | src/builtin/ Asset 手动创建豁免仍有效 |
| RFC-0014 | asset-injection-mechanism | **保留** | 结构化抽取锚定仍有效 |

→ 仅 RFC-0005 需补标 `superseded-by: RFC-0032`。

## 四、执行清单（按确定性排序）

### Phase A：确定动作（归档 + 状态变更 + 生成）

- [ ] A1. 归档 `concepts/proof.md` → `.openxenon/.archived/docs/concepts/proof.md`
- [ ] A2. 归档 `concepts/insight.md` → `.openxenon/.archived/docs/concepts/insight.md`
- [ ] A3. 归档 `RFC-0015-*.md` → `.openxenon/.archived/docs/rfc/`
- [ ] A4. RFC-0016 frontmatter `status: Draft` → `Accepted` + 补 `accepted-at`
- [ ] A5. RFC-0017 frontmatter 加 `superseded-by: AGENTS.md` + 正文加 supersede 说明段
- [ ] A6. RFC-0005 frontmatter 加 `superseded-by: RFC-0032` + 正文加 supersede 说明段
- [ ] A7. 跑 `bun scripts/sync-domain-glossary.ts --write` 重新生成 glossary.md

### Phase B：重写（4 文件收敛）

- [ ] B1. 重写 `concepts/_index.md`（≤ 20 行：Asset/Work/Probe + Skill 入口）
- [ ] B2. 重写 `concepts/iap-paradigm.md`（≤ 150 行：I-A-P 节奏理念，去 E1-E4 实施术语）
- [ ] B3. 重写 `concepts/work.md`（≤ 200 行：3 步生命周期 + DRIFT，对齐 RFC-0033）
- [ ] B4. 重写 `concepts/lifecycle.md`（≤ 80 行：3 步 + 三方分工）
- [ ] B5. 修订 `concepts/asset.md`（≤ 200 行：去 E1/三层锁，对齐 D24）
- [ ] B6. 修订 `concepts/asset-paper.md`（清理 4 处 stale 引用）

### Phase C：守门验证

- [ ] C1. `bun scripts/check-doc-boundary.ts`（0 violations）
- [ ] C2. `bun scripts/validate-dependencies.ts`（0 violations）
- [ ] C3. `bun scripts/check-versioned-docs.ts`（exit 0）
- [ ] C4. `bun scripts/sync-domain-glossary.ts`（dry-run，确认无 drift）
- [ ] C5. typecheck + 全量测试（确认无回归）

## 五、开放问题

| 问题 | 备注 |
|---|---|
| `iap-paradigm.md` 重写后是否改名？ | 倾向保留文件名（redirectFrom 链不断），但内容去 IAP 实施术语，只留 I-A-P 节奏理念 |
| `lifecycle.md` 是否合并进 `work.md`？ | 倾向保留独立（3 步生命周期是 Work 专属，lifecycle.md 可作"3 步详解 + 三方分工"独立页） |
| `.archived/docs/concepts/` 目录是否新建？ | 是（现有 `.archived/docs/` 无 concepts/ 子目录） |
| RFC-0016 promote 是否补 Errata 段说明"4 probe 已实现"？ | 倾向补（记录实施事实：file-hash/test-coverage/json-path/port-listening 路径） |

## 六、不处置（明确排除）

| 项 | 理由 |
|---|---|
| `concepts/glossary.md` 手动编辑 | 自动生成，不手动改（A7 覆盖） |
| RFC-0018~0031（已 Accepted） | 不在本次收敛范围（已是 Accepted 状态，无 stale） |
| RFC-0032/0033 | 刚落地，无 stale |
| `docs/dev/` / `docs/adrs/` | 不在本次范围（dev 是 L0-L3 宪法层，adrs 已归档为主） |
| `docs/product/zh-cn/reference/` | CLI 用户指南，单独任务（RFC-0033 改了 CLI 命令，reference 需另起 Draft 收敛） |

## 相关

- **RFC-0032**：MVP 收敛（Proof/Insight/Daemon 删除）— 本 Draft 的前提
- **RFC-0033**：Work 极简化（PlanLock 删 + Hash 绑定 submit）— 本 Draft 的对齐目标
- **Domain SSOT**：`.openxenon/assets/domains/*.md`（11 Domain，已收敛）— 本 Draft 的裁决源
- **AGENTS.md §裁决规则**：2 档简化 — RFC-0017 supersede 依据
