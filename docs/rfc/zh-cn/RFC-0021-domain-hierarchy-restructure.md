---
entity: rfc
id: RFC-0021
theme: domain-hierarchy-restructure
status: Accepted
date: 2026-07-16
accepted: 2026-07-16
supersedes: []
superseded-by: ~
related:
  - ADR-0060: docs/adrs/0060-domain-vocabulary-boundary.md
  - ADR-0070: docs/adrs/0070-glossary-domain-sync.md
  - .changes/0-6-1-domain-hierarchy.md
promoted-from: .openxenon/drafts/.archived/rfc/v0.7-domain-hierarchy-restructure-rfc.md
note: 文件名带 v0.7 前缀是历史遗留，实际落地在 v0.6.1（见 .changes/0-6-1-domain-hierarchy.md）
synced-at: 2026-08-05
landing-reason: declarative
---

# RFC-0021: Domain 三层架构（root / package / module）

> **类型**：RFC（OpenXenon 规范）
> **主题**：domain-hierarchy-restructure
> **状态**：✅ Accepted（v0.6.1 落地，文件原带 v0.7 前缀已 deprecated；promote 自 drafts/rfc/v0.7-domain-hierarchy-restructure-rfc.md）
> **来源**：2026-07-16 istuen + opencode
> **批次**：v0.6.1 Domain 体系重构


# Domain 三层架构重构方案（root / package / module）

> **背景**：v0.6 重构时**先做了 Asset + Work**，文档更新滞后，导致 Asset 内容超前于 Doc。
> 同时 OpenXenon 当前有 **20 个扁平 Domain**，无层级结构，无法清晰表达"OpenXenon 是什么"。
> 本方案引入三层 Domain 架构（Layer 0 全局顶层 + Layer 1 包级 + Layer 2 业务核心），
> 让 Asset 与 Doc 都从这套层级编译。

---

## 1. 核心设计原则

| 原则 | 含义 |
|---|---|
| **Asset 是分布式 SSOT**（关键词 + 边界） | 不存在"OpenXenon 整体"单一 Domain；整体由多个 Domain 共同构成 |
| **Doc 是独立 SSOT**（产品手册 + 开发手册） | 文档可引用 Asset 路径硬链，但 Asset 不指向 Doc |
| **三层引用方向：单向** | 子 Domain → 父 Domain。oxn-domain 不引用任何子 Domain |
| **Layer 1 重复词策略：重名不重定义** | OXN CLI/OXN Engine 在 oxn-domain 定义一次；Layer 1 子域可重名但 desc 仅补父域未说的部分 |
| **旧 Domain 处置：渐进迁移** | 新 Domain 建好后从旧 Domain 拉 terms，旧 Domain 加 banner 但暂不删；全部新 Domain 验收后再删 |

---

## 2. 三层 Domain 全景图

```
Layer 0 · 全局顶层（唯一 · root）
─────────────────────────────────
oxn-domain
  ├─ terms:    OpenXenon, OXN CLI, OXN Engine
  ├─ bans:     -
  ├─ invariants: single-source-of-truth
  └─ references: -  (不向下引用)


Layer 1 · 包级（两个 · @openxenon/cli + @openxenon/engine）
─────────────────────────────────────────────────────────
oxn-cli-domain                        oxn-engine-domain
  ├─ references: [oxn-domain]          ├─ references: [oxn-domain]
  ├─ terms:                              ├─ terms:
  │   OXN CLI* (补)                       │   OXN Engine* (补)
  │   Command, SubCommand,                │   Kernel, OXL, Infra,
  │   Arg, OutputFormat,                  │   Daemon, Pool,
  │   ErrorCode, Skill, I18n,             │   Langium, Security,
  │   OXnConfig, Grammar,                 │   Workspace, CliBin,
  │   Schema, Validator                   │   AssetMode
  └─ ...                                 └─ ...


Layer 2 · 业务核心（四个 · E1-E4）
─────────────────────────────────
oxn-asset-domain        oxn-work-domain        oxn-proof-domain       oxn-insight-domain
  ├─ references:           ├─ references:          ├─ references:          ├─ references:
  │  [oxn-engine-domain,    │  [oxn-engine-domain,  │  [oxn-engine-domain,   │  [oxn-engine-domain,
  │   oxn-cli-domain]       │   oxn-asset-domain]   │   oxn-work-domain]    │   oxn-work-domain,
  ├─ terms:                 ├─ terms:               ├─ terms:               │   oxn-proof-domain]
  │  Domain, Blueprint,     │  Work, Task, Slot,    │  Probe, Part,         ├─ terms:
  │  Stack, Roadmap,        │  Part, RefPool,       │  Builtin, Scope,      │  Insight, Pattern,
  │  AssetKind (5),         │  IAPPhase, Round,     │  Registry, Verdict,   │  CrossProof,
  │  AssetMode,             │  BirthCert,           │  Frozen, Trace,       │  ModeRec,
  │  AssetLifecycle,        │  PlanLock,            │  ContentHash, Taint   │  AuditTrail,
  │  PlanLock,              │  AssetHash,           │                        │  Citation,
  │  AssetCitation,         │  SkillContext,        │                        │  Pool
  │  AssetDAG, AssetPaper   │  Artifact, Frozen
  └─ ...                   └─ ...                 └─ ...                  └─ ...


独立保留（不进核心三层，独立 SSOT）
─────────────────────────────────
CodeQualityContext              # 工具/质量
DocEngineeringContext           # 文档工程元域
VitePressContext                # 外部工具集成
```

---

## 3. oxn-domain 顶层骨架

```markdown
---
entity: domain
version: 0.1.0
name: OxnDomain
abstract: |
  OpenXenon 全局顶层业务领域。三个核心 term 定义 OpenXenon 的本质结构。
  作为 root Domain，被 oxn-cli-domain 与 oxn-engine-domain 引用。
references: []
citations: 0
oxn-source-sha: pending
synced-at: 2026-07-16
---

# Domain: OxnDomain

## Terms

### OpenXenon
- desc: 轻量级人机协作工具。一句话：工程师定意图，AI Agent 跑对齐，
  OXN Engine 出证明。核心命题：当 AI 说"做完了"，由 OXN Engine 独立公证。
  解决 AI 三痛点：Drift / Hallucination / 幻觉自证。

### OXN CLI
- desc: 用户/AI Agent 接触 OpenXenon 的入口；`oxn` 命令。
  实现位于 packages/cli/，是薄组合调用层。
  三档退出分类器：IAPError / OXNCrash / isCliInputError。
  子域：oxn-cli-domain（详细 commands/args/errors）。

### OXN Engine
- desc: OpenXenon 全部业务实现 + 独立验证主权。
  实现位于 packages/engine/，承载 L0-L2 + daemon。
  核心机制：frozen.json + outcome.md + content_hash + planLock。
  子域：oxn-engine-domain（详细 kernel/oxl/infra/daemon）。

## Invariants

### single-source-of-truth
- value: |
  OpenXenon = OXN CLI + OXN Engine。任何对 OpenXenon 的描述必须可拆解
  到这两个组件；两者组合唯一构成 OpenXenon。
```

---

## 4. 完整 8 个工单（含 W8 收尾）

### 🔴 W1：新建 `oxn-domain`（Layer 0 · 顶层）

| 项 | 内容 |
|---|---|
| **触发** | 用户决策：oxn-domain 作为全局顶层 |
| **范围** | 新建 `.openxenon/assets/domains/oxn-domain.md`，含 3 terms + 1 invariant + 空 references |
| **terms 来源** | 新建（无迁移） |
| **验证** | `oxn domain validate oxn-domain` 通过；roadmap sync 不报 dangling |
| **预估** | 0.5h |
| **Doc 同步** | `docs/zh-cn/product/introduction.md` 引用 oxn-domain（Asset 路径硬链） |
| **依赖** | 无 |

### 🔴 W2：新建 `oxn-cli-domain`（Layer 1 · CLI 包）

| 项 | 内容 |
|---|---|
| **触发** | Layer 1 顶层，包级 SSOT |
| **范围** | 新建 `.openxenon/assets/domains/oxn-cli-domain.md` |
| **terms 来源** | `intent-domain` + `iap-error-context` + `I18nContext` + `config-domain` |
| **迁移 terms** | OXN CLI / Command / SubCommand / Arg / OutputFormat / ErrorCode / Skill / Grammar / Schema / Validator / I18nKey / OXnConfig |
| **references** | `[oxn-domain]` |
| **保留旧 Domain** | intent-domain / iap-error-context / I18nContext / config-domain 加 banner「migrated to oxn-cli-domain」但**暂不删** |
| **验证** | `oxn domain validate oxn-cli-domain` 通过；新 terms 覆盖旧 4 个 Domain 的所有核心 term |
| **预估** | 2h |
| **Doc 同步** | 新建 `docs/zh-cn/dev/oxn-cli.md`（从 terms 编译） |
| **依赖** | W1 |

### 🔴 W3：新建 `oxn-engine-domain`（Layer 1 · Engine 包）

| 项 | 内容 |
|---|---|
| **触发** | Layer 1 顶层，包级 SSOT |
| **范围** | 新建 `.openxenon/assets/domains/oxn-engine-domain.md` |
| **terms 来源** | `L0L3Context` + `MonorepoContext`（engine 部分）+ `DaemonContext` + `GrammarContext` + `SecurityContext` |
| **迁移 terms** | Layer / SubLayer / Kernel / Foundation / Infra / Daemon / Langium / OXL / Sandbox / Workspace / CliBin |
| **references** | `[oxn-domain]` |
| **OXN Engine term** | 重名不重定义：desc 仅说「参见 oxn-domain.terms.OXN Engine + 子域独有部分」 |
| **预估** | 3h |
| **Doc 同步** | 新建 `docs/zh-cn/dev/oxn-engine.md`（从 terms 编译） |
| **依赖** | W1 |

### 🟡 W4：新建 `oxn-asset-domain`（Layer 2 · E1）

| 项 | 内容 |
|---|---|
| **触发** | E1 业务 SSOT |
| **范围** | 新建 `.openxenon/assets/domains/oxn-asset-domain.md` |
| **terms 来源** | `AssetModeContext` + `AssetLifecycleContext` |
| **迁移 terms** | AssetKind **5 类收敛** / AssetMode / AssetLifecycle（create/evolve/archive）/ PlanLock / AssetCitation / AssetDAG / AssetPaper / AssetFrontmatter / AssetFileResolver |
| **references** | `[oxn-engine-domain, oxn-cli-domain]` |
| **关键修复** | AssetModeContext 6 类 → 5 类（删除 library/external，ADR-0056 已 Superseded） |
| **预估** | 2h |
| **Doc 同步** | `docs/zh-cn/product/concepts/asset.md` 从 terms 编译 |
| **依赖** | W2, W3 |

### 🟡 W5：新建 `oxn-work-domain`（Layer 2 · E2）

| 项 | 内容 |
|---|---|
| **触发** | E2 业务 SSOT |
| **范围** | 新建 `.openxenon/assets/domains/oxn-work-domain.md` |
| **terms 来源** | `WorkOrchestrationContext` + `align-domain` + `intent-align-context`（Work 相关部分） |
| **迁移 terms** | WorkV1 / IAPPhase / Phase / Work / Task / Slot / Part / Probe / RefPool / Round / BirthCert / PlanLock / AssetHash / SkillContext / Artifact / Frozen |
| **references** | `[oxn-engine-domain, oxn-asset-domain]` |
| **预估** | 3h |
| **Doc 同步** | `docs/zh-cn/product/concepts/work.md` 从 terms 编译 |
| **依赖** | W4 |

### 🟡 W6：新建 `oxn-proof-domain`（Layer 2 · E3）

| 项 | 内容 |
|---|---|
| **触发** | E3 业务 SSOT |
| **范围** | 新建 `.openxenon/assets/domains/oxn-proof-domain.md` |
| **terms 来源** | `proof-domain` + `TaintContext` + `intent-align-context`（Proof 部分） |
| **迁移 terms** | Probe / Part / Builtin / Scope / Registry / Kernel / Verdict（PASS/FAIL/INCONCLUSIVE）/ Frozen / Trace / ContentHash / Taint（12 项） |
| **references** | `[oxn-engine-domain, oxn-work-domain]` |
| **预估** | 3h |
| **Doc 同步** | `docs/zh-cn/product/concepts/proof.md` 从 terms 编译 |
| **依赖** | W5 |

### 🟡 W7：新建 `oxn-insight-domain`（Layer 2 · E4）

| 项 | 内容 |
|---|---|
| **触发** | E4 业务 SSOT |
| **范围** | 新建 `.openxenon/assets/domains/oxn-insight-domain.md` |
| **terms 来源** | `PoolContext` + 现有 insight 概念整合 |
| **迁移 terms** | Insight / Pattern / CrossProofAccumulation / ModeRecommendation / AuditTrail / Citation / Pool / Raw / Audit / Judged |
| **references** | `[oxn-engine-domain, oxn-work-domain, oxn-proof-domain]` |
| **预估** | 1.5h |
| **Doc 同步** | `docs/zh-cn/product/concepts/insight.md` 从 terms 编译 |
| **依赖** | W6 |

### 🟢 W8：旧 Domain 删除（收尾）

| 项 | 内容 |
|---|---|
| **触发** | W1-W7 全部完成且新 Domain 验证通过 |
| **范围** | 删除 `intent-domain.md` / `align-domain.md` / `proof-domain.md` / `L0L3Context.md` / `MonorepoContext.md` / `DaemonContext.md` / `AssetModeContext.md` / `AssetLifecycleContext.md` / `WorkOrchestrationContext.md` / `iap-error-context.md` / `TaintContext.md` / `SecurityContext.md` / `config-domain.md` / `I18nContext.md` / `intent-align-context.md` / `PoolContext.md` / `GrammarContext.md`（共 17 个） |
| **保留** | CodeQualityContext / DocEngineeringContext / VitePressContext（独立 SSOT） |
| **验证** | `oxn domain list` 仅剩 10 个 Domain（7 新 + 3 独立） |
| **预估** | 0.5h |
| **依赖** | W7 |

---

## 5. 工单依赖图

```
W1 (oxn-domain)
    │
    ├── W2 (oxn-cli-domain)
    │       │
    └── W3 (oxn-engine-domain)
            │
            ├── W4 (oxn-asset-domain)
            │       │
            │       └── W5 (oxn-work-domain)
            │               │
            │               ├── W6 (oxn-proof-domain)
            │               │       │
            │               │       └── W7 (oxn-insight-domain)
            │               │               │
            └───────────────┴───────────────┴── W8 (旧 Domain 删除)
```

**可并行**：W2 与 W3 在 W1 完成后并行；其他有强依赖。

---

## 6. 节奏与工作量

| 阶段 | 工单 | 预估工时 | 累计 |
|---|---|---|---|
| **v0.7.0 W1** | W1（oxn-domain 顶层） | 0.5h | 0.5h |
| **v0.7.0 W2-W3** | W2（cli）+ W3（engine） | 5h | 5.5h |
| **v0.7.1 W4-W5** | W4（asset）+ W5（work） | 5h | 10.5h |
| **v0.7.2 W6-W7** | W6（proof）+ W7（insight） | 4.5h | 15h |
| **v0.7.3 W8** | W8（旧 Domain 删除） | 0.5h | 15.5h |

**总计**：~15.5h（约 2 个工作日），分散在 4 个版本。

---

## 7. Doc 编译映射（基于新 Domain）

| Layer | Domain | 编译产物（Doc） | 状态 |
|---|---|---|---|
| 0 | oxn-domain | `docs/zh-cn/product/introduction.md` | **替换** |
| 1 | oxn-cli-domain | `docs/zh-cn/dev/oxn-cli.md` | **新建** |
| 1 | oxn-engine-domain | `docs/zh-cn/dev/oxn-engine.md` | **新建** |
| 2 | oxn-asset-domain | `docs/zh-cn/product/concepts/asset.md` | **替换** |
| 2 | oxn-work-domain | `docs/zh-cn/product/concepts/work.md` | **替换** |
| 2 | oxn-proof-domain | `docs/zh-cn/product/concepts/proof.md` | **替换** |
| 2 | oxn-insight-domain | `docs/zh-cn/product/concepts/insight.md` | **替换** |
| 独立 | DocEngineeringContext | `docs/zh-cn/dev/three-tier-docs.md` | 维持 |
| 独立 | VitePressContext | `docs/zh-cn/dev/vitepress-context.md` | 维持 |

---

## 8. 验收清单（每个 W 完成时）

```bash
# Domain 验证
oxn domain validate <name>          # 通过

# Asset 一致性
oxn asset list --kind domain        # 新 Domain 列出
oxn roadmap sync oxn-system --scene doc --dry-run   # 无 dangling

# 边界守门
bun scripts/check-doc-boundary.ts   # 0 violations

# Doc 同步
bun run docs:build                  # 通过

# 全守门
bun run check && bun run lint && bun run typecheck  # 全过
```

---

## 9. 工单统一执行模板

```bash
# W1 顶层示例
oxn work create domain-oxn-top \
  --blueprint asset-create \
  --domain AssetLifecycleContext \
  --goal "新建 oxn-domain 顶层 Domain（含 OpenXenon/OXN CLI/OXN Engine 三个 term）"

# W2 包级示例
oxn work create domain-oxn-cli \
  --blueprint asset-create \
  --domain AssetLifecycleContext \
  --goal "新建 oxn-cli-domain 包级 Domain，从 intent-domain/iap-error-context/I18nContext/config-domain 迁移 terms"

# W3-W7 类似
```

---

## 10. 关键决策记录（锁定）

| # | 决策 | 选项 |
|---|---|---|
| D1 | 顶层 Domain 命名 | `oxn-domain` |
| D2 | 引用方向 | 单向：子 → 父（oxn-domain 不向下引用） |
| D3 | Layer 1 重复词策略 | 重名不重定义 |
| D4 | Frontmatter 字段 | 完整字段：entity + version + name + abstract + references + citations + synced-at |
| D5 | 旧 Domain 处置 | 渐进迁移：新建后拉 terms，全部建好后再删旧 |
| D6 | 本轮范围 | 只出方案文档，不动 Domain 文件 |
| D7 | Doc 与 Asset 关系 | 独立 SSOT；Doc 可引用 Asset 路径硬链，Asset 不指向 Doc |

---

## 11. 未来工作（不阻塞本方案）

- 自动同步脚本：`scripts/check-doc-asset-coverage.ts`（Asset terms 在 Doc 出现率）+ `scripts/check-doc-asset-coverage.ts`（Asset → Doc 双向覆盖检查）
- Domain 层级字段（`layer: 0|1|2`）— 当前不强制
- AI Agent 引导：`oxn-asset` Skill 消费 oxn-domain 后能自动路由到 Layer 1
- Doc 编译脚本：`scripts/compile-domain-to-doc.ts`（从 Domain terms 自动生成 Doc 草稿）

---

## 12. RFC 化路径

本方案走 doc-promote Work 提升为正式 RFC：

```bash
oxn work create promote-domain-hierarchy-rfc \
  --blueprint doc-promote \
  --domain DocEngineeringContext \
  --goal "提升 v0.7-domain-hierarchy-restructure 草案到 .openxenon/docs/rfcs/v0.7-domain-hierarchy-rfc.md"
```

提升后本 draft 文件归档至 `.openxenon/pools/drafts/_archive/`。
