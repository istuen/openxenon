---
entity: rfc
id: RFC-0029
theme: inv2-revision-rfc-domain-ssot
status: Accepted
date: 2026-08-11
accepted: 2026-08-11
accepted-at: 2026-08-11
supersedes: []
superseded-by: ~
landing-files:
  - .openxenon/assets/domains/oxn-project-domain.md
  - docs/rfc/zh-cn/README.md
  - docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md
landing-reason: declarative
related:
  - RFC-0017
  - RFC-0018
  - RFC-0028
  - .openxenon/assets/domains/oxn-project-domain.md
  - .openxenon/assets/domains/oxn-asset-domain.md
  - AGENTS.md
synced-at: 2026-08-11
---

# RFC-0029: Inv2RfcIsSsot 语义修订 + RFC/Domain SSOT 角色明确分离

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：inv2-revision-rfc-domain-ssot
> **状态**：✅ Accepted（2026-08-11 — Phase 3 配套修订，根治 RFC README / Inv2 / AGENTS.md 三方表述冲突）
> **来源**：2026-08-10/11 `/grilling` session（grill-with-docs + domain-modeling skill）Phase 1 映射表 + Phase 2 五批 Asset Work 落地
> **批次**：v0.7.0 配套新增
> **关系**：本 RFC 修订 `oxn-project-domain.md §Inv2RfcIsSsot`（Invariant 改写须 RFC 授权）；同步修正 RFC README 与 RFC-0017 §D1/D2；不修改其他 Invariant；不创建新 ADR

## Errata

<!-- status: Draft → 经 grilling → Accepted 后冻结,仅可追加 errata 段,version bump patch -->


<!-- engineer-preserved-content -->

# Design Draft: RFC-0029 — Inv2RfcIsSsot 语义修订 + RFC/Domain SSOT 角色明确分离

> **目标 RFC**：RFC-0029（OpenXenon 规范 · meta-RFC）
> **状态**：本 Draft = RFC-0029 升格前的 design 源稿；走 promote-target-aware-workflow（rfc 分支）后落 `docs/rfc/zh-cn/RFC-0029-inv2-revision.md`
> **触发**：2026-08-10/11 `/grilling` session（grill-with-docs + domain-modeling skill）Phase 1 映射表 + Phase 2 五批 Asset Work 落地后暴露的语义冲突

---

## TL;DR

修订 `oxn-project-domain.md §Inv2RfcIsSsot` 语义——从"RFC 是 OXN 项目的 SSOT"改为 **"RFC/ADR = 规定性决策记录层（why）；现行约束语义 SSOT = Domain（### Axiom + - Theorem 结构）"**。同步修正 RFC README 与 RFC-0017 §D1/D2 表述，与 AGENTS.md 裁决规则对齐（Domain 是定义性 SSOT 第 1 档，RFC 是仅解释性参考）。

---

## 1. 背景：SSOT 语义冲突

### 1.1 三方表述冲突

| 来源 | 表述 | 情态 |
|---|---|---|
| `docs/rfc/zh-cn/README.md:11` | "RFC 是 OpenXenon 项目的 SSOT——所有决策、约束、规则必须落 RFC" | 规定性 |
| `oxn-project-domain.md §Inv2RfcIsSsot` | "RFC 是 OXN 项目的 SSOT——所有规定性内容（决策、约束、规则）必须落 RFC" | 定义性 |
| `RFC-0017 §D1` | "Domain（内部 SSOT）= 术语权威定义源；glossary（外部 SSOT）= 面向用户的术语词典" | 规定性 |
| `AGENTS.md 裁决规则（v0.7+）` | "定义性 SSOT = `.openxenon/assets/domains/*.md`（Axiom/Theorem 结构）；docs/rfc/ = 仅解释性参考，无约束力" | 行为规则（兜底） |

### 1.2 冲突的实质

`Inv2RfcIsSsot` 表述"RFC 是 SSOT"易被读为"RFC 是唯一权威源"——但实际工程中：
- **约束定义**（硬约束 / 边界 / 禁令 / 术语）：由 `.openxenon/assets/domains/*.md` 承载（Asset 形式，AI Agent 在 L2 Blueprint 闭包时实际消费）
- **决策理由**（为什么这样决定 / 决策历史 / 替代方案 / 风险评估）：由 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md` 承载（规定性文档，frozen + errata 演进）
- **工程术语外部 SSOT**：由 `docs/product/zh-cn/concepts/glossary.md` 承载（sync 脚本生成的对外词典）

### 1.3 触发问题

Phase 2 五批 Asset Work 落地后，新加 9 Axiom + ~41 Theorem 行——但 89 ADR + 28 RFC 大量决策点是否已经"沉淀到 Domain"是工程师 + AI Agent 在 Blueprint 闭包时唯一关心的。RFC/ADR 的"为什么"记录层与 Domain 的"是什么"承载层混用 → AI Agent 困惑："这条规则是从哪来的？约束载体是 RFC 还是 Domain？"

---

## 2. 决策

### D1：Inv2RfcIsSsot 语义重定义

**当前 Inv2**（需修订）：
> RFC 是 OXN 项目的 SSOT——所有规定性内容（决策、约束、规则）必须落 RFC；不存 ADR + OXP 双层。

**新 Inv2**（RFC-0029 接受后）：
> **RFC/ADR = 规定性决策记录层（why）**——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`；frozen + errata 演进策略；中文 only。
>
> **Domain = 现行约束语义 SSOT（what）**——回答"X 是什么 + 边界约束"的文档；住 `.openxenon/assets/domains/*.md`（Asset 结构 v2：## Group → ### Axiom → - Theorem）；AI Agent 在 Blueprint 闭包时实际消费。
>
> **glossary = 工程术语外部 SSOT（用户视角）**——单页 `docs/product/zh-cn/concepts/glossary.md`；由 sync 脚本单向生成（Domain → glossary）。
>
> **ADR 不再作为独立机制**——v0.7 起所有 ADR 已迁移为 RFC + Domain Axiom 落点（48 Adopted ADR → 8 主题 RFC + 4 meta-RFC；6 Superseded → 归档 `.openxenon/.archived/docs/adrs/`）。后续决策走 RFC + Domain 路径，不创建新 ADR。

**修订后语义要点**：
- RFC **记录决策**（决策记录层），不承载**现行约束**（约束定义层在 Domain）
- RFC 正文/related 引用对应 Domain 锚点作为约束解释（RFC → Domain 引用方向）
- Domain 不反向引用 RFC/ADR（assets-no-docs 规则；纯文本 provenance 标注逐步收敛）
- 守门：`scripts/check-doc-boundary.ts` `assets-no-docs` 规则 + 后续扩展 `check-adr-landing.ts` 强制 ADR/RFC landing 含 Domain 落点

### D2：RFC README 表述修正

**docs/rfc/zh-cn/README.md:11** 当前表述：
> RFC 是 OpenXenon 项目的 SSOT——所有决策、约束、规则必须落 RFC；不再保留 ADR（内部日志）+ OXP（外部镜像）双层。

**新表述**（RFC-0029 接受后）：
> RFC 是 OpenXenon 项目的**规定性决策记录层**（why 记录层），回答"为什么决定 X"——决策记录 + 替代方案 + 风险评估；frozen + errata 演进策略；中文 only。
>
> 现行约束语义 SSOT 在 `.openxenon/assets/domains/*.md`（Axiom/Theorem 结构），AI Agent 在 Blueprint 闭包时实际消费；RFC 是约束的"为什么"解释，不是约束本身。
>
> ADR 不再作为独立机制——v0.7 起所有 ADR 已迁移为 RFC + Domain 落点。

### D3：RFC-0017 §D1/D2 表述同步

**RFC-0017 §D1** 当前表述：表格两行（Domain 内部 SSOT + glossary 外部 SSOT）。

**新 §D1**（RFC-0029 接受后）：扩展为三行，明确 RFC/ADR = why 记录层 + Domain = what 定义层 + glossary = 用户视图层。

**RFC-0017 §D2** 同步：在单向同步规则上加"RFC/ADR 正文/related 引用 Domain 锚点作为现行约束解释"。

### D4：变更标注统一

Domain Axiom/Theorem 行尾的"🆕 v0.7.0 RFC-0029 D1 修订"或类似变更标注——仅在涉及语义修订时新增；存量"来源：ADR-XXXX（YYYY-MM-DD）"尾注按 Phase 2 Batch B/C 决策清理完毕（git blame 保留追溯）。

### D5：AGENTS.md 裁决规则章节一致性确认

AGENTS.md 现有表述已正确（"定义性 SSOT = Domain；docs/rfc/ = 仅解释性参考"），无需变更；本 RFC 接受后工程实践与裁决规则一致，无需改 AGENTS.md。

---

## 3. 不变量语义对照表（修订前 → 修订后）

| 维度 | 修订前（Inv2 + RFC README + RFC-0017） | 修订后 |
|---|---|---|
| RFC 角色 | 唯一 SSOT（决策/约束/规则都在 RFC） | 规定性决策记录层（仅 why） |
| Domain 角色 | RFC 内容的镜像缓存 | 现行约束语义 SSOT（what + 边界） |
| 决策流向 | RFC → Domain 缓存 | Domain 承载约束，RFC 解释为什么 |
| 引用方向 | Domain 引用 RFC（来源：ADR-XXXX） | RFC 引用 Domain（related: assets/domains/xxx） |
| ADR 状态 | 与 OXP 双层并存（v0.7 废除） | 不再独立（48 Adopted 迁移 + 6 Superseded 归档） |
| glossary | 单层（Domain 镜像） | 三层架构（RFC/ADR why + Domain what + glossary 用户视图） |

---

## 4. 守门扩展（联动 Phase 4）

`scripts/check-adr-landing.ts` 扩展（Phase 4 单独 RFC，本 RFC 接受后开 Phase 4 Work）：
- Accepted ADR/RFC frontmatter `landing-files` 或 `related:` 中**至少含一个 `.openxenon/assets/domains/*.md`** 路径
- 触发时机：Phase 2 五批 Asset Work 落地 + Phase 3 RFC-0029 接受后；两档模式（advisory 不阻塞 → enforced exit 1）

---

## 5. 落地清单（本 RFC 接受后）

1. `oxn-project-domain.md §Inv2RfcIsSsot` 语义修订（D1）
2. `docs/rfc/zh-cn/README.md:11` 表述修正（D2）
3. `docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md §D1/D2` 表述同步（D3）
4. `docs/rfcs/zh-cn/RFC-0029-inv2-revision.md` 自身新增（本文件 promote 后）
5. 增量变更标注（"🆕 v0.7.0 RFC-0029 D1 修订"）写入修订处
6. 守门验证：`check-asset-structure` + `check-doc-boundary` + `validate-dependencies` + `sync-domain-glossary` + typecheck + test

---

## 6. 验证守门

```
bun scripts/check-asset-structure.ts    # 23/23
bun scripts/check-doc-boundary.ts         # 无新增违规
bun scripts/validate-dependencies.ts     # passed
bun scripts/sync-domain-glossary.ts --write # 322 term headings（不变）
bun run typecheck                        # passed
bun run check                            # passed
bun run lint                             # passed
```

---

## 7. 风险评估

| 风险 | 缓解 |
|---|---|
| Invariant 修订触发守门（AGENTS.md「不得修改 Domain 文件中的 invariants」） | 本 RFC 是 Inv 修订的授权机制；守门逻辑位于 scripts/check-doc-boundary.ts 不守 Inv 文本；AGENTS.md 是规则源，本 RFC 接受后工程师 + AI Agent 都明确"这是按 RFC 流程修订 Inv"，合规 |
| RFC README 措辞变更被读为"RFC 不重要" | 强调 RFC 是"为什么"记录层，不是废除；与 Domain 形成"why + what"二分 |
| RFC-0017 §D1/D2 同步改动波及 glossary 同步脚本 | `scripts/sync-domain-glossary.ts` 只读 Domain，不读 RFC；改动仅影响叙事层（RFC/0017 文档文本），不影响数据流 |
| 存量 ADR 引用 CONTEXT-MAP.md 的旧链路残留 | 已在 RFC-0028 D5 cascade 改写完毕；本 RFC 无需重复清理 |
| 历史 ADR/RFC 中"RFC 是 SSOT"措辞残留 | 历史文档 frozen，仅改 future 引用 + README/Inv2；不改历史正文（RFC-0010 frozen+errata 演进规则保护） |

---

## 8. 关联变更

| 关联项 | 处理 |
|---|---|
| `RFC-0017 §D1/D2` | 同步表述（Phase 3 Step 3） |
| `RFC-0001` + `RFC-0018` 等 | 不动（历史 RFC frozen；可在 future Errata 追加本 RFC 引用） |
| `AGENTS.md` 裁决规则 | 已对齐，无需改 |
| `scripts/check-doc-boundary.ts` | 不改（rfc→assets 已有先例，无禁止规则） |
| `scripts/sync-domain-glossary.ts` | 不改（只读 Domain） |

---

## 9. 推动计划

| 步骤 | 内容 | 工作量 |
|---|---|---:|
| 1 | 本 Draft promote → `docs/rfc/zh-cn/RFC-0029-inv2-revision.md` | 0.1 day |
| 2 | 工程师审核 RFC 内容（拔高语义明确性 + 边界裁剪） | 0.5 day |
| 3 | 工程师 mark `Status: Accepted`（不经过 full IAP 闭环，RFC 走 frozen+errata 演进） | 0.1 day |
| 4 | 修改 `oxn-project-domain.md §Inv2RfcIsSsot`（变更标注 🆕 v0.7.0 RFC-0029 D1） | 0.2 day |
| 5 | 修改 `docs/rfc/zh-cn/README.md:11` | 0.1 day |
| 6 | 修改 `docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md §D1/D2`（变更标注 🆕 v0.7.0 RFC-0029 D3） | 0.2 day |
| 7 | 守门验证 | 0.1 day |
| 8 | 触发 Phase 4（check-adr-landing 扩展） | 0.5 day |
| **合计** | | **1.8 day** |

---

## 10. 与现有架构原则的一致性

| 原则 | 一致性 |
|---|---|
| AGENTS.md 裁决规则 2 档（Domain = SSOT 第 1 档） | ✅ 本 RFC 接受后工程实践与裁决规则一致 |
| RFC frozen + errata 演进（RFC-0010） | ✅ RFC-0029 接受后冻结，仅追加 Errata |
| 文档三情态（Asset / RFC / Doc · RFC-0009） | ✅ RFC = 规定性（why），Domain = 定义性（what），glossary = 描述性（用户视图） |
| ADR 不再独立机制（v0.7 RFC-0027/0028） | ✅ 不创建新 ADR；现有 89 ADR 已迁移或归档 |
| Asset 结构 v2（Group → Axiom → Theorem） | ✅ Domain Axiom 承载约束；Theorem 承载细化推论 |
| AI Agent Blueprint 闭包 L2 加载链 | ✅ Domain 引用在 L2 闭包时实际加载；RFC 仅作"为什么"参考 |

---

## 附 A：原 Inv2RfcIsSsot 全文（修订前对照）

```
### Inv2RfcIsSsot
- RFC 是 OXN 项目的 SSOT——所有规定性内容（决策、约束、规则）必须落 RFC；不存 ADR + OXP 双层。
- v0.7 起废除 OXP 双层机制，48 条 Adopted ADR 迁移为 8 主题 RFC + 4 meta-RFC。
- v0.3.0 增补：CONTEXT-MAP.md 中的 R&N 32 术语对照迁至 RFC-0018 附录 A（规定性内容正确归位）。
```

修订后将变为（具体措辞由工程师审核 RFC-0029 时微调）：

```
### Inv2RfcSotDecisionLayer
- RFC/ADR = 规定性决策记录层（why）——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`；frozen + errata 演进策略；中文 only。
- 现行约束语义 SSOT = `.openxenon/assets/domains/*.md`（Asset 结构 v2：## Group → ### Axiom → - Theorem）——AI Agent 在 Blueprint 闭包时实际消费的"约束定义层"。
- 工程术语外部 SSOT = `docs/product/zh-cn/concepts/glossary.md`（单页；由 `scripts/sync-domain-glossary.ts` 单向生成，Domain → glossary）。
- ADR 不再作为独立机制——v0.7 起所有 ADR 已迁移为 RFC + Domain 落点（48 Adopted → 8 主题 RFC + 4 meta-RFC；6 Superseded → `.openxenon/.archived/docs/adrs/`）。后续决策走 RFC + Domain 路径。
- 引用方向：RFC/ADR 正文/related 引用 Domain 锚点作为约束解释（RFC → Domain 方向，RFC-0028 已开先例）；Domain 不反向引用 RFC/ADR（assets-no-docs 规则）。
- 🆕 v0.7.0 RFC-0029 D1 修订：原 "RFC 是 SSOT" 措辞修订为"RFC/ADR = 规定性决策记录层"；与 AGENTS.md 裁决规则对齐。
```
