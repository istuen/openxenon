---
title: RFC 索引
synced-at: 2026-07-26
---

# RFC 索引

<!-- allow-version -->
> OpenXenon 规范（RFC）归档。OpenXenon Proposal (OXP) 双层机制已废除（v0.7），所有规定性内容统一为单层 RFC。
<!-- /allow-version -->
> RFC 是 OpenXenon 项目的 SSOT——所有决策、约束、规则必须落 RFC；不再保留 ADR（内部日志）+ OXP（外部镜像）双层。

## 什么是 RFC？

**RFC（Request For Comments）= OpenXenon 规范**——规定性文档（Prescriptive Modality），回答"为什么决定 X"。

- 住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`
- frozen + errata 演进策略（accepted 后核心冻结，仅可追加 errata 段）
- 顺序编号 + theme 字段
- 中文 only
- 只引用 `docs/glossary/`

详见 [RFC-0009 文档三情态分离](./RFC-0009-doc-three-modalities.html) + [RFC-0010 RFC frozen+errata 演进策略](./RFC-0010-frozen-errata.html)。

<!-- allow-version -->
## 已落盘的 RFC（v0.7 首批 promote）
<!-- /allow-version -->

| RFC | 主题 | 来源 ADR 数 | 状态 |
|---|---|---|---|
| [RFC-0001 OXL/Blueprint 哲学](./RFC-0001-oxl-philosophy.html) | 主题：oxl-philosophy | 3 (0001, 0021, 0052) | ✅ Accepted |
| [RFC-0002 Kernel/L0 边界](./RFC-0002-kernel-l0.html) | 主题：kernel-l0 | 8 (0002, 0003, 0008, 0009, 0010, 0011, 0013, 0037) | ✅ Accepted |
| [RFC-0003 AI 协作哲学](./RFC-0003-ai-collaboration.html) | 主题：ai-collaboration | 8 (0012, 0020, 0031, 0032, 0057, 0058, 0067, 0076) | ✅ Accepted |
| [RFC-0004 Work/Asset 体系](./RFC-0004-work-asset.html) | 主题：work-asset | 13 (0004, 0005, 0024, 0025, 0035, 0049, 0050, 0051, 0054, 0055, 0056, 0061, 0075) | ✅ Accepted |
| [RFC-0005 Insight/Skill](./RFC-0005-insight-skill.html) | 主题：insight-skill | 2 (0018, 0074) | ✅ Accepted |
| [RFC-0006 Docs/Brand（`@` 寻址）](./RFC-0006-docs-brand.html) | 主题：docs-brand | 1 (0023) | ✅ Accepted |
| [RFC-0007 Domain 词汇与 OXN 定位](./RFC-0007-domain-positioning.html) | 主题：domain-positioning | 10 (0059, 0060, 0068, 0069, 0070, 0072, 0073, 0077, 0078, 0079) | ✅ Accepted |
| [RFC-0008 命名/演进策略](./RFC-0008-naming-evolution.html) | 主题：naming-evolution | 3 (0066, 0071, 0080) | ✅ Accepted |
| [RFC-0009 文档三情态分离](./RFC-0009-doc-three-modalities.html) | 主题：doc-three-modalities | meta-RFC（grilling #6） | ✅ Accepted |
| [RFC-0010 RFC frozen+errata 演进策略](./RFC-0010-frozen-errata.html) | 主题：frozen-errata | meta-RFC（grilling #6） | ✅ Accepted |
| [RFC-0011 内置 Asset 两层机制](./RFC-0011-builtin-asset-two-layer.html) | 主题：builtin-asset-two-layer | meta-RFC（grilling #6） | ✅ Accepted |
| [RFC-0012 自举种子豁免](./RFC-0012-bootstrap-exemption.html) | 主题：bootstrap-exemption | meta-RFC（grilling #6） | ✅ Accepted |
| [RFC-0013 版本号政策](./RFC-0013-versioning-policy.html) | 主题：versioning-policy | meta-RFC（grilling #6） | ✅ Accepted |
| [RFC-0014 Asset 注入机制](./RFC-0014-asset-injection-mechanism.html) | 主题：asset-injection-mechanism | meta-RFC（grilling Asset vs RAG） | ✅ Accepted |
| [RFC-0015 Proof 体系重整](./RFC-0015-proof-system-overhaul.html) | 主题：proof-system-overhaul | 0（grilling #2 Proof/Probe/Verdict 审视） | 📝 Draft |
<!-- allow-version -->
| [RFC-0016 通用验证 Probe 扩展](./RFC-0016-generic-verification-probes.html) | 主题：generic-verification-probes | 0（v0.6.2-alpha.2 实施完成）| 📝 Draft |
<!-- /allow-version -->
| [RFC-0017 术语双层 SSOT](./RFC-0017-terminology-two-tier-ssot.html) | 主题：terminology-two-tier-ssot | 0 | 📝 Draft |
| [RFC-0018 项目工程元层](./RFC-0018-project-engineering-meta.html) | 主题：project-engineering-meta | 0 | 📝 Draft |
| [RFC-0019 Draft Promote 路由](./RFC-0019-draft-promote-routing.html) | 主题：draft-promote-routing | 0 | 📝 Draft |
| [RFC-0020 三边界框架 + Blueprint 提升组合模板](./RFC-0020-three-boundary-blueprint-elevation.html) | 主题：three-boundary-blueprint-elevation | 4 (0019, 0048, 0053, 0054, 0055, 0056) | ✅ Accepted（promote 自 drafts/，2026-08-05）|
<!-- allow-version -->
| [RFC-0021 Domain 三层架构](./RFC-0021-domain-hierarchy-restructure.html) | 主题：domain-hierarchy-restructure | 2（0060, 0070）| ✅ Accepted（v0.6.1 落地；promote 自 drafts/，2026-08-05）|
| [RFC-0022 理想态数据流 runtime 闭环](./RFC-0022-ideal-data-flow.html) | 主题：ideal-data-flow | 1（0061）| ✅ Accepted（v0.6.1 落地；promote 自 drafts/，2026-08-05）|
| [RFC-0023 Asset Paper Schema](./RFC-0023-asset-paper-schema.html) | 主题：asset-paper-schema | 2（0051, 0056）| 🟡 Partially Accepted（基础 v0.6.1；图渲染 deferred v0.7.0）|
<!-- /allow-version -->

**统计**：8 主题 RFC（48 Adopted ADR 迁移）+ 7 meta-RFC + 4 落地 RFC（2026-08-05 promote 自 drafts/）+ 5 Draft = 24 个 RFC（其中 19 Accepted + 5 Draft）。

## RFC 生命周期

```
.openxenon/drafts/<scope>-draft.md（散落，无格式）
    ↓ oxn work create rfc-XXXX-... --blueprint doc-rfc-workflow
    ↓ lock → run → submit → finalize
docs/rfc/zh-cn/RFC-XXXX-<theme>.md（accepted 后核心冻结，仅可追加 errata 段）
```

### Status 值

| Status | 含义 |
|---|---|
| `Draft` | 起草中（仅存于 `.openxenon/drafts/`，未 promote） |
| `Proposed` | 提交评审（已走 IAP gather 阶段，待 validate） |
| `Accepted` | 已接受（核心冻结，仅可追加 errata 段） |
| `Superseded` | 已被新 RFC 取代（指向 `superseded-by`） |
| `Withdrawn` | 主动撤销（与 Superseded 区别：非被推翻而是作者撤回） |

### 演进规则

- accepted 状态后正文不可编辑
- 仅可追加 `## Errata` 段（每次 bump patch version）
- Supersede 走新 RFC 标 `superseded-by` / `supersedes`

详见 [RFC-0010 frozen+errata](./RFC-0010-frozen-errata.html)。

<!-- allow-version -->
## ADR → RFC 迁移说明（v0.7）
<!-- /allow-version -->

OXN 旧文档体系采用 ADR + OXP 双层决策记录机制：

| 旧机制 | 新机制 |
|---|---|
| ADR（内部 SSOT, append-only） | （废除） |
| OXP（外部镜像，frozen） | RFC（合并两者职责） |

<!-- allow-version -->
**48 条 Adopted ADR**（v0.7 探索时点）+ 5 条 Partially Adopted + 11 条 Proposed + 6 条 Superseded = **70 条 ADR**，已迁移 / 归档如下：
<!-- /allow-version -->

| 来源 | 处理 | 物理位置 |
|---|---|---|
| 48 Adopted ADR | 合并入 8 主题 RFC | `docs/rfc/zh-cn/RFC-000{1..8}-*.md` |
| 5 Partially Adopted | 合并入 RFC（含遗留 follow-up） | 同上 |
| 11 Proposed | 合并入 RFC（含未来实施记录） | 同上 |
| 6 Superseded | 物理归档（保留追溯） | `.openxenon/.archived/docs/adrs/00XX-*.md` |

**3 条 OXP**（2026-07-22 首批 promote）内容已分别合并入：
- OXP-0001（术语精简）→ RFC-0008 命名/演进策略
- OXP-0002（彻底不判）→ RFC-0003 AI 协作哲学
- OXP-0003（Daemon 职责边界）→ RFC-0007 Domain 词汇与 OXN 定位

OXP 文件已删除（Phase 3 步骤 3.1）。

## ADR 归档查询

<!-- allow-version -->
v0.7+ 所有 ADR 已物理归档到 `.openxenon/.archived/docs/adrs/`，共 72 文件（64 迁移 ADR + 6 早期 Superseded + 2 历史 ADR）。
<!-- /allow-version -->

| 查询需求 | 位置 |
|---|---|
| RFC 的 ADR 来源追溯 | 各 RFC 文档 `## 相关决策` 段 |
| ADR 全文检索 | `.openxenon/.archived/docs/adrs/00XX-*.md` |
| ADR 状态查询 | ADR frontmatter `status` 字段 |
| Supersede 关系 | ADR frontmatter `supersedes` / `superseded-by` 字段 |

## 下一步

**Phase 4**（可并行）：OxnBuiltinRegistry `.md` 加载（probes+blueprints 重写 + stale path 修复）
**Phase 5**：文档同步 + AGENTS.md + 19 条跨层链接修复 + boundary checker 启用
**Phase 6**：6 项验证（docs:build / typecheck / test / lint / validate-dependencies / check-doc-boundary）

详见 [.openxenon/drafts/rfc-migration-master-plan.md](../../.openxenon/drafts/rfc-migration-master-plan.md)。