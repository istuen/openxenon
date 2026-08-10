---
entity: draft
type: design
created: 2026-08-05
status: active
related:
  - RFC-0013
  - RFC-0009
  - RFC-0011
  - ADR-0066
  - ADR-0067
  - ADR-0083
  - ADR-0084
  - ADR-0085
  - ADR-0088
  - ADR-0089
  - ADR-0090
  - dev/versions/README.md
  - dev/README.md
---

# Draft: OpenXenon 文档去版本号重组（v0.6+ 收口）

> **目的**：v0.6.x 系列遗留的"版本号谎言"问题——部分特性已实现但仍带 v0.7 路径、部分推迟但仍带 v0.6.x 路径、部分架构真理本就不该带版本号。本 draft 整理成"versionless + 位置 = 语义"的稳定结构。
> **触发**：`docs/` 是对外用户手册，不放 OXN 自身开发内容文档；`dev/` 是开发者操作手册（含 `dev/versions/` 已绑版本 Roadmap）。

## 1. 现状盘点（v0.6+ 文档分布）

### 1.1 `docs/` — 对外用户手册（应保持 version-neutral）

```
docs/
├── product/zh-cn/concepts/         ← 无版本（glossary, IAP 范式等）
├── dev/zh-cn/                      ← 无版本（架构、测试、错误体系等）
├── rfc/zh-cn/RFC-0001..0019        ← RFC 体系（frozen, version-neutral by convention）
├── adrs/0001..0090                 ← ADR 体系（append-only, version-neutral）
└── versions/                       ← ❌ 不应在此（OpenXenon 自身开发内容）
```

### 1.2 `dev/` — OXN 自身开发手册（root 根目录）

```
dev/
├── README.md                       ← 开发者操作指南入口
├── versions/                       ← ✅ 已绑版本 Roadmap（RFC-0013 D3，2026-07-27 建）
│   ├── README.md
│   ├── 0-7-0-asset-graph.md
│   ├── 0-7-0-emergence.md
│   ├── 0-7-1-ai-three-modes.md
│   ├── 0-7-2-anchor-slot.md
│   └── 0-8-0-term-upstream-dag.md
├── pool/                           ← 备选池（无版本绑定）
└── fix/                            ← Fix Record
```

### 1.3 `.openxenon/drafts/rfc/` — 草稿层（混淆区）

| 文件 | 实际归属 | 处置 |
|---|---|---|
| `v0.6.2-draft-promote-routing.md` | 已被 `docs/rfc/zh-cn/RFC-0019` 承接 + 2 changelogs shipped | **归档** |
| `v0.6.3-asset-paper-schema-rfc.md` | 基础字段 v0.6.1 已落地，graph/DOT/Mermaid 推迟 | **Promote → `docs/rfc/zh-cn/RFC-0023`（基础部分 Accepted）+ graph 部分 deferred** |
| `v0.7-domain-hierarchy-restructure-rfc.md` | 实际 v0.6.1 落地 | **Promote → `docs/rfc/zh-cn/RFC-0021`** |
| `v0.7-emergence-rfc.md` | v0.7.0 已绑版本（已有 `dev/versions/0-7-0-emergence.md`）| **归档** |
| `v0.7.0-infra-ports-rfc.md` | v0.7.0 已绑版本（尚未在 dev/versions/）| **移到 `dev/versions/0-7-0-infra-ports.md`** |
| `v0.7.1-ai-three-modes-rfc.md` | v0.7.1 已绑版本（已有 `dev/versions/0-7-1-ai-three-modes.md`）| **归档** |
| `v0.7.2-anchor-slot-rfc.md` | v0.7.2 已绑版本（已有 `dev/versions/0-7-2-anchor-slot.md`）| **归档** |
| `v0.7.3-ideal-data-flow-rfc.md` | 实际 v0.6.1 落地 + 误带 v0.7.3 前缀 | **Promote → `docs/rfc/zh-cn/RFC-0022`**（误标，实质是 v0.6.1）|
| `v0.8.0-term-upstream-dag-rfc.md` | v0.8.0 已绑版本（已有 `dev/versions/0-8-0-term-upstream-dag.md`）| **归档** |
| `v0.8.1-probe-system-evolution-rfc.md` | v0.8.1 已绑版本（尚未在 dev/versions/）| **移到 `dev/versions/0-8-1-probe-system-evolution.md`** |
| `three-boundary-blueprint-elevation-rfc.md` | ADR-0054/0055/0056 已落地 | **Promote → `docs/rfc/zh-cn/RFC-0020`** |
| `version-unification-rfc.md` | meta（描述 v0.6.x → v0.7 合并）| **移到 `dev/meta/version-unification.md`** |
| `work-unified-model-rfc.md` | v0.7 推迟 | **移到 `dev/versions/0-7-0-work-unified-model.md`** |
| `oxn-deprecation-rfc.md` | PARTIAL：freeze 已 ship，完整退役 v0.7.0 推迟 | **拆 2 份：基础 → `dev/meta/oxn-deprecation-baseline.md`（已 ship）；完整 → `dev/versions/0-7-0-oxn-deprecation.md`** |
| `openxenon-architecture-from-adrs.md` | 历史聚合（已被 RFC 取代）| **归档** |
| `spike-probe-converge.md` | v0.3.1+ 推迟（老旧）| **归档** |
| `2026-07-05-archive-0040-0047-memory-series-superseded.md` | 已 archived | **保留** |

### 1.4 `docs/adrs/` — ADR 状态不一致

| ADR | 当前状态 | 实际 | 处置 |
|---|---|---|---|
| `0081-oxn-unified-error-framework.md` | Proposed (2026-07-24) | 错误体系已落地 | **推进 → Accepted** |
| `0082-diagnostic-unification.md` | Proposed (2026-07-25) | Diagnostic 统一已 ship | **推进 → Accepted** |
| `0001..0059/0087/012/013` | inline `> **状态**:` | （legacy 格式）| **迁 → YAML frontmatter**（一致性）|

### 1.5 `docs/rfc/zh-cn/` — frontmatter vs body 不一致

| RFC | 不一致点 |
|---|---|
| `RFC-0013-versioning-policy.md` | frontmatter `Accepted`，body 仍写 `📝 Draft（待 review）` |

### 1.6 `.changes/` — changelog 散落

6 个 v0.6.1-asset-md PR-1/PR-2/PR-3/PR-4/PR-4-ext/asset-md-default 散落重叠：
- `0-6-1-pr1-rfc-t19-cleanup.md`
- `0-6-1-pr2-md-prefix.md`
- `0-6-1-pr3-asset-canonical-flip.md`
- `0-6-1-pr4-langium-freeze.md`
- `0-6-1-pr4-extension-builtin-md.md`
- `0-6-1-asset-md-default.md`

→ 合并为 `0-6-1-asset-md-canonical.md`，原 6 个归档到 `.changes/_archive/0-6-1-asset-md-pr-1-4/`

## 2. 重组目标（versionless 稳定结构）

```
docs/                              (对外用户手册，version-neutral)
├── product/zh-cn/concepts/        (glossary, IAP, work-asset 等)
├── dev/zh-cn/                     (architecture, testing, error-system 等)
├── rfc/zh-cn/RFC-0001..0023       (23 个，version-neutral by convention)
└── adrs/0001..0090                (82 个，append-only)

dev/                               (OXN 自身开发手册)
├── README.md
├── versions/                      (已绑版本 Roadmap)
│   ├── README.md                  (更新索引表)
│   ├── 0-7-0-asset-graph.md       (已有)
│   ├── 0-7-0-emergence.md         (已有)
│   ├── 0-7-0-infra-ports.md       (NEW: 来自 drafts/rfc)
│   ├── 0-7-0-oxn-deprecation.md   (NEW: oxn-deprecation 完整退役部分)
│   ├── 0-7-0-work-unified-model.md (NEW: 来自 drafts/rfc)
│   ├── 0-7-1-ai-three-modes.md    (已有)
│   ├── 0-7-2-anchor-slot.md       (已有)
│   ├── 0-7-3-ideal-data-flow.md   (待评估：是否真为 v0.7.3 推迟)
│   ├── 0-8-0-term-upstream-dag.md (已有)
│   └── 0-8-1-probe-system-evolution.md (NEW: 来自 drafts/rfc)
├── pool/                          (备选池)
├── fix/                           (Fix Record)
└── meta/                          (NEW: meta 文档)
    ├── version-unification.md     (NEW: 来自 drafts/rfc)
    └── oxn-deprecation-baseline.md (NEW: 来自 oxn-deprecation-rfc 基础部分)

.openxenon/drafts/rfc/             (清空大部分)
├── (归档到 .openxenon/drafts/.archived/rfc/)

.changes/                          (历史快照保留)
├── 0-6-1-asset-md-canonical.md   (NEW: 合并产物)
└── _archive/0-6-1-asset-md-pr-1-4/ (6 个原文件)
```

## 3. 执行计划（6 Block，约 6-7 hr）

### Block 1：Tier 1 快速修复（1.5-2 hr）

| Task | 操作 | 时间 |
|---|---|---|
| T1.1 | RFC-0013 body 状态对齐（`📝 Draft` → `✅ Accepted 2026-07-27`）| 5 min |
| T1.2 | ADR-0081 → Accepted（检查 IAPError/OXNCrash 实现）| 15 min |
| T1.3 | ADR-0082 → Accepted（检查 Diagnostic 实现）| 15 min |
| T1.4 | 合并 6 个 v0.6.1-asset-md changelogs → `0-6-1-asset-md-canonical.md` + 归档原 6 个 | 30 min |
| T1.5 | 改名 3 个误导性 RFC：v0.7-domain-hierarchy → RFC-0021（待 promote）；v0.7.3-ideal-data-flow → RFC-0022（待 promote）；v0.6.3-asset-paper-schema → RFC-0023（待 promote）| 30 min |

### Block 2：deferred RFC → `dev/versions/`（2 hr）

| Task | 操作 | 时间 |
|---|---|---|
| T2.1 | `git mv` 已绑版本 draft 到 `dev/versions/`：<br>• `v0.7.0-infra-ports-rfc.md` → `dev/versions/0-7-0-infra-ports.md`<br>• `v0.8.1-probe-system-evolution-rfc.md` → `dev/versions/0-8-1-probe-system-evolution.md` | 10 min |
| T2.2 | `git mv` `work-unified-model-rfc.md` → `dev/versions/0-7-0-work-unified-model.md` | 5 min |
| T2.3 | 创建 `dev/meta/` 目录 + 移入 `version-unification-rfc.md` | 5 min |
| T2.4 | 拆 `oxn-deprecation-rfc.md`：<br>• 基础（freeze + DEPRECATED 标记，已 ship）→ `dev/meta/oxn-deprecation-baseline.md`<br>• 完整退役（git rm + .oxn 删除）→ `dev/versions/0-7-0-oxn-deprecation.md` | 30 min |
| T2.5 | 归档 `drafts/rfc/` 中已重复的 4 个：`v0.7-emergence-rfc.md` / `v0.7.1-ai-three-modes-rfc.md` / `v0.7.2-anchor-slot-rfc.md` / `v0.8.0-term-upstream-dag-rfc.md` → `.openxenon/drafts/.archived/rfc/` | 15 min |
| T2.6 | 归档老旧：`v0.6.2-draft-promote-routing.md`（被 RFC-0019 取代）/ `openxenon-architecture-from-adrs.md`（被 RFCs 取代）/ `spike-probe-converge.md`（v0.3.1+ 推迟）→ `.archived/` | 15 min |
| T2.7 | 更新 `dev/versions/README.md` 索引表（添加 4 个新文件 + 状态）| 20 min |

### Block 3：Promote shipped-but-prefixed → `docs/rfc/zh-cn/`（1.5-2 hr）

| Task | 操作 | 时间 |
|---|---|---|
| T3.1 | Promote `three-boundary-blueprint-elevation-rfc.md` → `docs/rfc/zh-cn/RFC-0020-three-boundary-blueprint-elevation.md` | 15 min |
| T3.2 | Promote `v0.7-domain-hierarchy-rfc.md` → `docs/rfc/zh-cn/RFC-0021-domain-hierarchy.md` | 15 min |
| T3.3 | Promote `v0.7.3-ideal-data-flow-rfc.md` → `docs/rfc/zh-cn/RFC-0022-ideal-data-flow.md`（说明：实际 v0.6.1 落地）| 15 min |
| T3.4 | Promote `v0.6.3-asset-paper-schema-rfc.md` → `docs/rfc/zh-cn/RFC-0023-asset-paper-schema.md`（基础 Accepted + graph 部分 deferred 指向 `dev/versions/`）| 20 min |
| T3.5 | RFC-0018 状态推进：检查 `oxn-project-domain.md` v0.3.0 + `CONTEXT-MAP.md` + `check-doc-boundary.ts`；frontmatter `status: Draft` → `Accepted` | 15 min |
| T3.6 | 写 `docs/rfc/zh-cn/README.md` 索引更新（加 RFC-0020..0023）| 15 min |
| T3.7 | 归档 Block 3 的 4 个源 draft | 10 min |

### Block 4：清理 + AGENTS.md 规则（1 hr）

| Task | 操作 | 时间 |
|---|---|---|
| T4.1 | Drafts 状态字段统一（emoji → `status:` 字段：active / ready / planned / archived）| 20 min |
| T4.2 | ADR-0001..0059/0087/012/013 迁 inline status → YAML frontmatter（一致性）| 20 min |
| T4.3 | AGENTS.md 加规则："versionless 原则" + "新 RFC/ADR 不带版本号" + "已绑版本 Roadmap → `dev/versions/`" | 15 min |

### Block 5：CI 守门（30 min）

| Task | 操作 | 时间 |
|---|---|---|
| T5.1 | 写 `bun scripts/check-versioned-docs.ts`（检测 `docs/{product,dev,rfc,adrs}/` 下 .md 包含 `v0.X.Y` 字符串则报错；白名单：`.changes/`, `dev/versions/`, `dev/meta/`, `.archived/`）| 25 min |
| T5.2 | lefthook.yml 加 `check-versioned-docs` pre-commit hook | 5 min |

## 4. 决策记录

- **Q1 (deferred RFC 处置)**: A — 移到 `dev/versions/`（root）
- **Q2 (v0.6.1 asset-md changelog)**: F — 合并 + archive
- **Q3 (ADR-0081/0082 状态)**: I — 推到 Accepted
- **Q4 (versions/ 位置)**: 用户决策 — `dev/versions/`（root），**不在 docs/**
- **Q5 (落盘流程)**: 用户决策 — 先写 Draft，再执行

## 5. 风险与缓解

| 风险 | 缓解 |
|---|---|
| RFC promote 后导致交叉引用 404 | T3.6 + T2.7 同步索引；全仓 grep 旧链接 |
| ADR-0081/0082 推到 Accepted 后实际代码不完整 | T1.2/T1.3 前先 grep 验证 |
| Drafts 状态字段统一破坏现有工具 | 仅改 frontmatter，content 不变 |
| 误改 4 个 pre-existing 修改文件 | 全程只动审计范围内文件；不动 glossary.md / sync-domain-glossary.ts / 2 drafts |
| Working tree 76 项改动冲突 | 每 Block 一个 commit，commit 前全跑守门 |

## 6. 执行 checklist

- [ ] T1.1 RFC-0013 body 对齐
- [ ] T1.2 ADR-0081 → Accepted
- [ ] T1.3 ADR-0082 → Accepted
- [ ] T1.4 合并 6 个 asset-md changelogs
- [ ] T1.5 改名 3 个误导性 RFC
- [ ] T2.1 移 deferred RFC 到 dev/versions/
- [ ] T2.2 work-unified-model 移
- [ ] T2.3 version-unification 移到 dev/meta/
- [ ] T2.4 拆 oxn-deprecation
- [ ] T2.5 归档 4 个 drafts/rfc 重复项
- [ ] T2.6 归档老旧 drafts/rfc
- [ ] T2.7 更新 dev/versions/README.md
- [ ] T3.1-3.4 Promote 4 个 RFC-0020..0023
- [ ] T3.5 RFC-0018 推进
- [ ] T3.6 docs/rfc/zh-cn/README.md 更新
- [ ] T3.7 归档 Block 3 源 draft
- [ ] T4.1 Drafts 状态字段统一
- [ ] T4.2 ADR inline → frontmatter
- [ ] T4.3 AGENTS.md 规则
- [ ] T5.1 check-versioned-docs.ts
- [ ] T5.2 lefthook.yml hook
- [ ] 最终 commit + push

## 7. 演进（2026-08-06）

> **本计划已演进**：原本规划 `dev/versions/` 长期持有版本 Roadmap，但 2026-08-06 工程师评估后认为 8 个版本号过早绑定反而是误导，scheduling 决定前应该让所有规划都在 `dev/pool/` 中待选。
> **新计划**：`.openxenon/drafts/doc-dev-versionless-pooling.md`
> **执行差异**：8 个 dev/versions/*.md 已回滚到 dev/pool/（去版本化），scheduling 时再 git mv 回来。


<!-- 已迁移：v0.7 CONTEXT-MAP.md 退役，详见 RFC-0028。文件中 CONTEXT-MAP 原文引用保留作为历史考古链，失效链接请用 git blame 追溯或参考对应 Domain / RFC。-->
