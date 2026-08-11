---
entity: skeleton
target-entity: rfc
id: RFC-0030
theme: rfc-adr-historical-convergence
status: Draft
date: 2026-08-11
promote-target: rfc
created-from: asset-create@3.0.0-mode-skeleton
synced-at: 2026-08-11
type: design
name: design-rfc-0030-rfc-adr-historical-convergence
related:
  - RFC-0027
  - RFC-0028
  - RFC-0029
  - .openxenon/drafts/report-rfc-adr-to-domain-mapping.md
  - .openxenon/drafts/design-asset-no-rfc-adr-citation.md
  - .openxenon/assets/domains/oxn-project-domain.md
  - AGENTS.md
---

# RFC-0030: RFC/ADR 历史溯源收敛

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：rfc-adr-historical-convergence
> **状态**：📝 Draft（工程师评审中）
> **批次**：v0.7.0 配套新增（RFC-0029 后续 Wave）
> **来源**：2026-08-11 `/grilling` session 4 项决策拍板

---

## TL;DR

将现存 17 个活跃 ADR（0066~0099 + 012/013）物理归档到 `.openxenon/.archived/docs/adrs/`，仅 ADR-0099 保留为机制定义根；清空 Asset 文件中 121 处 RFC/ADR 编号引用（违反 Inv2 字面）；为 RFC-0017/0018 加 Errata 段收尾"RFC 是 SSOT"措辞；在 Phase 2 全批落地后将 `check-adr-landing.ts` 切换为 `--enforce` 强制模式。

---

## 1. 背景

### 1.1 现状盘点

- **117 文档溯源**：28 RFC + 89 ADR = 117 文档源，~210 决策点
- **已落地**：RFC-0027（v0.6.4 32→25 收敛）+ RFC-0028（CONTEXT-MAP 退役）+ RFC-0029（Inv2 语义修订）
- **现矛盾**：
  - `docs/adrs/` 仍存 17 活跃 ADR（与 v0.7『ADR 不再独立』承诺张力）
  - Asset 文件 121 处 RFC/ADR 编号引用（违反 Inv2『Domain 不反向引用 RFC/ADR』字面）
  - `scripts/check-doc-boundary.ts` 的 `assets-no-docs` 规则是死代码（未实际扫描）
  - RFC-0017 §D1/D2 + RFC-0018 附录 A 残留"RFC 是 SSOT"措辞
  - `scripts/check-adr-landing.ts` 默认 advisory（未强制）

### 1.2 Phase 2 状态

`report-rfc-adr-to-domain-mapping.md` §6 列出 5 批 Asset Work：
- **Batch B**（Work/Asset 体系）— 基本完成
- **Batch A**（engine）— 部分完成（`ImplementationBoundaryCriteria` + `DiagnosticUnification` 已落）
- **Batch C**（proof）— 部分完成（`TrustBaselineLadder` 已落）
- **Batch D**（project）— 部分完成（`Inv14AdrAcceptedLandingRequired` 已落）
- **Batch E**（draft + cli）— 未启动

剩余 Theorem 增补工作按映射表逐批继续。

---

## 2. 决策

### D1 · 17 活跃 ADR 物理归档

**触发**：v0.7『ADR 不再独立』承诺 + 89 ADR 已迁移 48 + 归档 6，仅剩 17 活跃在 `docs/adrs/`，与 Inv2RfcSotDecisionLayer 修订口径不一致。

**决策**：
- 17 活跃 ADR（0066~0099 除 0099 + 012 + 013）全部移到 `.openxenon/.archived/docs/adrs/`
- **仅 ADR-0099 保留**于 `docs/adrs/`，作为机制定义根（landing-files 机制引入者）
- 每个归档 ADR frontmatter 加 `status: Archived` + `archived-at: 2026-08-11` + `archived-by: RFC-0030-D1`
- ADR-0099 frontmatter 更新为 `status: Active-Mechanism` + 标注"机制定义根"

**物理操作**：`git mv` 保留历史 blame；外部 GitHub 锚点链接失效由 RFC README §ADR 归档查询段说明承担。

### D2 · 全清 121 处 Asset RFC/ADR 编号引用

**触发**：`oxn-project-domain.md:189` Inv2RfcSotDecisionLayer 字面规定"Domain 不反向引用 RFC/ADR（assets-no-docs 规则）"——121 处引用全是存量违规。

**决策**：
- 基于 `design-asset-no-rfc-adr-citation.md §2` 8 类处理方案全清
- 保留：RFC/ADR 概念定义 + `RFC-XXXX` 占位 + `docs/rfc/zh-cn/RFC-XXXX-<theme>.md` 路径模板
- 涉及文件：13 Asset/builtin 文件（`.openxenon/assets/`） + 5 builtin starter 文件（`packages/engine/src/builtin/`）= 18 文件，~100 行
- 新增 `scripts/check-asset-structure.ts` 规则 `E_ASSET_RFC_ADR_CITATION`：正则 `\b(?:RFC|ADR)-[0-9]{3,4}\b` 匹配 + 豁免列表

**边界**：`assets-no-docs` 死代码暂时不动（会误伤合法 Domain → glossary 路径引用 oxn-asset-domain:73/76/82），单独议题。

### D3 · RFC-0017/0018 Errata 收尾

**触发**：RFC-0029 D1 已修订 Inv2RfcSotDecisionLayer，但 RFC-0017 §D1/D2（双层 SSOT 表格 + 单向同步段）与 RFC-0018 附录 A（R&N 32 术语对照）残留"RFC 是 SSOT"措辞。

**决策**：
- RFC-0017 §D1/D2 后追加 Errata v0.x 段：标注"🆕 v0.7.0 RFC-0029 + RFC-0030 修订：术语三层 SSOT 架构（why/what/用户视图）由 RFC-0029 D3 扩展落实"
- RFC-0018 附录 A 末追加 Errata 段：标注"🆕 v0.7.0 RFC-0028 + RFC-0029 + RFC-0030 修订：Meta 层由 5 类降为 4 类（CONTEXT-MAP 退役）；R&N 32 术语对照历史溯源保留"

**操作要点**：走 RFC-0010 frozen+errata 演进规则；不改原正文；Errata 段统一前缀。

### D4 · `check-adr-landing.ts --enforce` 切换时点

**触发**：`scripts/check-adr-landing.ts` v0.8.0 已有规则 3（landing-files/related 必含至少一条 `assets/domains/*.md` 路径），但默认 advisory。

**决策**：
- 切换时点：Stage 2 全部 4 个 Batch（A/C/D/E）落地完成 + D1 ADR 物理归档完毕
- 切换前需确保：
  - 88 归档 ADR 加 `landing-reason: declarative` 豁免（或 frontmatter `status: Archived` 自动豁免）
  - 1 机制根（ADR-0099）landing-files 已含至少一条 Domain 路径
  - RFC README §ADR 归档查询段更新完毕
- 切换方式：`.husky/pre-commit` 或 `.github/workflows/ci.yml` 默认参数从 `advisory` 改 `enforce`

### D5 · RFC README §ADR 归档查询段更新

修改 `docs/rfc/zh-cn/README.md`：
- §ADR 归档查询段：从"72 归档 + 17 活跃"改为"1 机制根（ADR-0099）+ 88 归档"
- §ADR → RFC 迁移说明段：补充"v0.7.0 RFC-0030 D1 物理归档 17 活跃 ADR"
- §统计表更新：从"48 Adopted 迁移 + 6 Superseded 归档"改为完整口径

---

## 3. 落地清单（本 RFC 接受后）

### 3.1 D1 ADR 归档（35 文件移动 + 1 保留）

**移动清单**（git mv）：
- `docs/adrs/0066-terminology-simplification.md` → `.openxenon/.archived/docs/adrs/`
- `docs/adrs/0067-no-judgment-principle.md` → 同上
- `docs/adrs/0068-daemon-responsibility-boundary.md` → 同上
- `docs/adrs/0069-asset-bootstrap-completeness.md` → 同上
- `docs/adrs/0070-glossary-domain-sync.md` → 同上
- `docs/adrs/0071-abolish-audit-trail.md` → 同上
- `docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md` → 同上
- `docs/adrs/0073-oxn-implementation-boundary-criteria.md` → 同上
- `docs/adrs/0074-insight-ingredient-not-reasoner.md` → 同上
- `docs/adrs/0075-round-loop-as-ai-search-record.md` → 同上
- `docs/adrs/0076-adversarial-ownership-and-cross-llm-referent.md` → 同上
- `docs/adrs/0077-utility-owns-ai-oxn-converts-goal-to-boundary.md` → 同上
- `docs/adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md` → 同上
- `docs/adrs/0079-asset-is-ontology-formal-reasoning-deferred.md` → 同上
- `docs/adrs/0080-error-terminology-unification-and-governance.md` → 同上
- `docs/adrs/0081-oxn-unified-error-framework.md` → 同上
- `docs/adrs/0082-diagnostic-unification.md` → 同上
- `docs/adrs/0083-version-hygiene-over-build-metadata.md` → 同上
- `docs/adrs/0084-collaboration-boundary-layering.md` → 同上
- `docs/adrs/0085-oxn-environment-characterization.md` → 同上
- `docs/adrs/0086-taint-trust-baseline-design.md` → 同上
- `docs/adrs/0087-md-single-orthogonal-point.md` → 同上
- `docs/adrs/0088-test-suite-architecture.md` → 同上
- `docs/adrs/0089-onboarding-starter-assets.md` → 同上
- `docs/adrs/0090-builtin-engine-integration.md` → 同上
- `docs/adrs/0091-stack-operation-as-execution-referent.md` → 同上
- `docs/adrs/0092-stack-operation-followup.md` → 同上
- `docs/adrs/0093-version-cut-record.md` → 同上
- `docs/adrs/0094-goal-primary-planning.md` → 同上
- `docs/adrs/0095-intent-pool-v3-retired.md` → 同上
- `docs/adrs/0096-draft-work-route-deprecated.md` → 同上
- `docs/adrs/0097-version-forcing-function.md` → 同上
- `docs/adrs/0098-branch-model-main-dev-feat.md` → 同上
- `docs/adrs/012-runtime-adapter.md` → 同上
- `docs/adrs/013-filesystem-port-vs-runtime-file.md` → 同上

**保留**：`docs/adrs/0099-adr-landing-mandatory.md`（机制定义根）

### 3.2 D2 Asset 清理（18 文件）

- `.openxenon/assets/domains/` 9 个 Domain 文件
- `.openxenon/assets/workflows/` 3 个 Workflow 文件
- `.openxenon/assets/assetmaps/oxn-system.md`
- `.openxenon/assets/stacks/` 1 个 Stack 文件
- `packages/engine/src/builtin/` 5 个 builtin 文件

### 3.3 D3 RFC Errata（2 文件）

- `docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md` 加 Errata 段
- `docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md` 加 Errata 段

### 3.4 D5 README 更新（1 文件）

- `docs/rfc/zh-cn/README.md` §ADR 归档查询段 + §ADR → RFC 迁移说明段 + §统计表

### 3.5 D4 守门切换（2 文件）

- `scripts/check-asset-structure.ts` 加 `E_ASSET_RFC_ADR_CITATION` 规则
- `.husky/pre-commit` 或 `.github/workflows/ci.yml` 改 `enforce`

---

## 4. 与现有架构原则的一致性

| 原则 | 一致性 |
|---|---|
| **AGENTS.md 裁决规则 2 档**（Domain = SSOT 第 1 档） | ✅ D1/D2/D3 全方位落地 |
| **RFC frozen + errata 演进**（RFC-0010） | ✅ D3 走 Errata |
| **文档三情态**（Asset / RFC / Doc · RFC-0009） | ✅ D1 ADR 归档消除情态混淆 |
| **ADR 不再独立机制**（v0.7 RFC-0027/0028/0029） | ✅ D1 物理归档 17 活跃 ADR |
| **Asset 结构 v2**（Group → Axiom → Theorem） | ✅ D2 清理强化 Inv2 字面 |
| **AI Agent Blueprint 闭包 L2 加载链** | ✅ Domain 引用纯净，AI 无歧义 |
| **`scripts/check-adr-landing.ts` 规则 3** | ✅ D4 切 enforce |

---

## 5. 风险评估

| # | 风险 | 严重度 | 缓解 |
|---|---|---|---|
| R1 | 88 归档 ADR landing-files 强制模式后报错 | 高 | 归档时统一加 `status: Archived` + `landing-reason: declarative` 豁免 |
| R2 | `git mv` 后 GitHub 锚点链接破（外部文档、Issue 引用） | 中 | README §ADR 归档查询段指向 `.openxenon/.archived/docs/adrs/` 目录；告知 RFC-0030 变更 |
| R3 | RFC-0017/0018 Errata 与原 §D1/D2 表述并存引发搜索歧义 | 低 | Errata 段标注"🆕 v0.7.0 修订"前缀；后续 RFC supersede 时一并清理 |
| R4 | Batch D 涉及 Inv 修订触发守门 | 中 | RFC-0030 D1/D2 是 Inv 修订授权；守门逻辑位于 `check-doc-boundary.ts` 不守 Inv 文本 |
| R5 | `E_ASSET_RFC_ADR_CITATION` 守门误伤合法术语 | 低 | 正则只匹配 `\b(?:RFC\|ADR)-[0-9]{3,4}\b`；豁免 RFC-XXXX 占位与路径模板 |
| R6 | Stage 2 与 Stage 3 并行执行冲突 | 中 | Stage 3 涉及 Domain 文件改动时串行；其他 Asset/builtin 文件可与 Stage 2 不同 Domain 并行 |
| R7 | `assets-no-docs` 死代码未启用可能仍误伤 | 低 | 暂不动；单独议题 |

---

## 6. 推动计划

| Stage | 内容 | 工作量 | 前置 |
|---|---|---:|---|
| 0 | RFC-0030 草稿（本文档） | 0.1 day | — |
| 1 | RFC-0030 promote → Accepted（落 `docs/rfc/zh-cn/RFC-0030-rfc-adr-historical-convergence.md`）| 0.2 day | Stage 0 |
| 2A | Batch A · oxn-engine-domain Theorem 增补 | 1.5 day | Stage 1 |
| 2C | Batch C · oxn-proof-domain Theorem 增补 | 1.5 day | Stage 1（可与 2A 并行） |
| 2D | Batch D · oxn-project-domain Theorem 增补 | 2 day | Stage 1（涉及 Inv） |
| 2E | Batch E · oxn-draft + oxn-cli Theorem 增补 | 1 day | Stage 1（可与 2D 并行） |
| 3.1 | F1 D1：17 活跃 ADR 物理归档（git mv） | 0.3 day | Stage 1 |
| 3.2 | F2 D2：全清 121 处 Asset RFC/ADR 编号引用 + 新守门 | 1 day | Stage 1 |
| 3.3 | F3 D3：RFC-0017/0018 Errata 追加段 | 0.2 day | Stage 1 |
| 3.4 | F5 D5：RFC README §ADR 归档查询段更新 | 0.1 day | Stage 3.1 |
| 4 | D4：check-adr-landing.ts --enforce 切换 + pre-commit 接入 | 0.3 day | Stage 2+3 |
| 5 | 验证 6 项 + `.changes/0-7-0-rfc-adr-historical-convergence.md` 落盘 | 0.3 day | Stage 4 |
| **合计** | | **~7-8 day** | |

并行优化后实际工时 ~5 day。

---

## 7. 关联变更

| 关联项 | 处理 |
|---|---|
| `RFC-0027` Asset 收敛 | 不动（历史 RFC frozen） |
| `RFC-0028` CONTEXT-MAP 退役 | 不动 |
| `RFC-0029` Inv2 语义修订 | 不动（前置 RFC） |
| `AGENTS.md` 裁决规则 | 已对齐，无需改 |
| `scripts/check-doc-boundary.ts` | D2 新增 E_ASSET_RFC_ADR_CITATION 在 check-asset-structure 而非 check-doc-boundary |
| `scripts/check-asset-structure.ts` | D2 新增规则 |
| `scripts/check-adr-landing.ts` | 不动（已支持规则 3） |
| `scripts/sync-domain-glossary.ts` | 不动（只读 Domain） |
| `.openxenon/drafts/report-rfc-adr-to-domain-mapping.md` | 不动（仅参考） |
| `.openxenon/drafts/design-asset-no-rfc-adr-citation.md` | 不动（仅参考） |

---

## 8. Errata

<!-- status: Draft → 经 grilling → Accepted 后冻结,仅可追加 errata 段,version bump patch -->


---

<!-- engineer-preserved-content -->

# Engineer Preserved Content

> 本节保留工程师原始决策笔记（grilling session 输出 + 落地工作记录）

## Grilling 决策记录（2026-08-11）

| # | 决策 | 选择 | 理由 |
|---|---|---|---|
| 1 | 17 活跃 ADR 处理 | 物理归档全部（保 ADR-0099） | 彻底收敛；ADR-0099 是机制定义根，需保持 docs/adrs/ 目录活性以承载新机制定义 |
| 2 | Asset 反向引用清理范围 | 全清 121 处 + 新守门 | 严格落实 Inv2 字面；未来 PR 自动拦截 |
| 3 | RFC 措辞收尾 | 走 Errata 追加 | 不破 RFC-0010 frozen；演化可审计 |
| 4 | check-adr-landing.ts --enforce 切换 | Phase 2 全批落地后 | 88 归档 + 1 机制根 + 4 新增 Axiom 全部满足规则 3 后再切，避免阻塞历史 ADR |

## Phase 2 落地状态（v0.7.0 起点）

| Batch | 目标 Domain | 新 Axiom 状态 | 剩余 Theorem |
|---|---|---|---|
| A | oxn-engine-domain | `ImplementationBoundaryCriteria` ✅ + `DiagnosticUnification` ✅ | ~10 |
| B | oxn-work-domain + oxn-asset-domain | 已基本完成 | ~16 |
| C | oxn-proof-domain | `TrustBaselineLadder` ✅ | ~10 |
| D | oxn-project-domain | `Inv14AdrAcceptedLandingRequired` ✅ | ~10 |
| E | oxn-draft-domain + oxn-cli-domain | — | ~14 |
| **合计** | | 4 Axiom 新增 | **~60 Theorem** |