---
title: Asset 结构 v2 Schema
---

# Asset 结构 v2 Schema

> **受众**：OpenXenon 贡献者 / 维护者 / AI Agent
>
> **核心命题**：Asset 正文用统一的 `## Group → ### Axiom → - Theorem` 三层结构表达；Engine 仅识别结构骨架，业务语义由 Group 名承载。
>
> **取代关系**：v2 收编了 v1 的 `## Terms:` / `## Bans` / `## Invariants` / `## Slots` 多种形态；旧形态仍向后兼容。
>
> **设计稿**：[`.openxenon/drafts/design-asset-structure-unification.md`](../../openxenon/drafts/design-asset-structure-unification.md)

## 概述

OpenXenon v0.7.4（2026-08-08）引入 Asset 结构 v2：5 类 AssetKind（domain / workflow / stack / blueprint / assetmap）的正文统一为同一种结构，Engine 仅做结构骨架识别，业务语义由 Group 名承载。

| 维度 | v1（已废除） | v2（当前） |
|---|---|---|
| 结构形态数 | 4 套独立结构（domain / workflow / stack / blueprint 各不同） | 1 套通用结构 + 1 套 Blueprint 特例 |
| 段名语义 | 硬编码（Terms / Bans / Invariants / Slots） | 自由 Group 名（Concept / Forbidden / Boundary / Phases / Tools / Quality 等皆可） |
| Engine 解析 | 4 套不同 parser | 1 套通用 parser + Blueprint 4 段识别 |
| 工程师学习成本 | 4 套规则 | 1 套规则 + Blueprint 特例 |

## 通用 Asset 结构

```markdown
# Asset: <Kind>/<Name>

## [Group Name]            ← 自由 Group 名
  ### [Axiom Name]         ← 公理（Term / 阶段 / 工具 / 概念 皆是）
    - [Theorem]            ← 定理（隶属于最近 Axiom）
    - [Theorem]
  ### [Axiom Name]
    - [Theorem]
## [Another Group]
  ### [Axiom]
    - [Theorem]
```

### 核心规则

- `## <Group>` — 关注点分组，名字 free-form
- `### <Axiom>` — 公理；**可缺省**（形态 C）
- `- <text>` 在 `###` 下 — 定理（隶属于最近 Axiom）
- `- <text>` 直接在 `##` 下（无 `###`）— 跨公理复合定理

### 三种合法形态

| 形态 | 描述 | 例子 |
|---|---|---|
| **A** Axiom + Theorem | `## Group` 下 `### Axiom` + 多条 `-` | `## Concept` 下 `### Operation` 配 2 条 `-` |
| **B** 纯 Axiom | `## Group` 下只有 `### Axiom`（无 `-`） | `## Core Entities` 下 `### Product` / `### SKU` / `### Order` |
| **C** 纯 Theorem | `## Group` 下直接 `-`（无 `### Axiom`） | `## Business Rules` 下 3 条 `-`；`## Failure Stop` 下 1 条 `-` |

形态 C 是 **同等地位合法形态**，不是 A 的退化。一个 Group 下可同时包含 A / B / C 三种内容（混排）。

## Blueprint 特例结构

Blueprint 作为 5 类 AssetKind 之一，特例保留：

```markdown
# Blueprint: <Name>

## Use <Asset Type>        ← 多个 H2，每个 Asset Type 一个（workflow / domain / stack / ...）
  ### [Asset Path]
    - path: @prj/<kind>/<name>
## Use <Another Asset Type>
  ### [Asset Path]
    - path: @prj/<kind>/<name>

## Slot                    ← 单一 H2（v2 收编）
  ### [Slot Axiom]
    - observe: [...]
    - operate: [...]
    - deps: [...]

### Scope                   ← 顶层 H3（与 ## 同级）
  - allow: [...]
  - forbid: [...]

### Context Template        ← 顶层 H3
  - business: ...
  - process: ...
```

### Blueprint 与通用 Asset 的差异

| 维度 | Domain / Workflow / Stack | Blueprint |
|---|---|---|
| `## Group` | 自由命名 | 固定为 `## Use <type>` + `## Slot` |
| `### Axiom` | 自由命名 | 路径名 / Slot 名 / 顶层字段 |
| 顶层 `###` | 不存在 | 存在（Scope / Context Template） |
| 解析器分支 | 通用解析器 | 通用解析器 + 4 段识别 |

> **兼容性**：Blueprint 仍接受 v1 形态 `## Use`（无 `<type>` 后缀）+ `## Scope` / `## Context Template` H2 形式。

### 字段负载

- **Stack Tool**：`### <tool>` 下用 `- field: value` 形式（`version` / `operations` / `role` / `command` / `config` / `desc`）
- **Slot**：`### <slot>` 下用 `- field: value` 形式（`observe` / `operate` / `deps` / `refs`）
- **Scope**：`### Scope` 顶层 H3 或 `## Scope` 顶层 H2 下用 `- allow: [...]` / `- forbid: [...]`

字段负载不参与 Theorem 派生树，是 Engine 的解析锚点。

## Engine 兼容层

### Group 名 → Category 映射（domain.ts）

```typescript
const GROUP_TO_CATEGORY: Record<string, DomainCategory> = {
  // 旧结构
  Terms: 'Terms', Bans: 'Bans', Invariants: 'Invariants', Stack: 'Stack',
  // v0.7.4 free-form Group 名
  Concept: 'Terms', Forbidden: 'Bans', Boundary: 'Invariants',
  Practice: 'Terms', Foundation: 'Terms', Phases: 'Terms',
  Reference: 'Terms', FailureHandling: 'Terms',
  Quality: 'Terms', ToolchainRule: 'Invariants', Slogan: 'Terms',
}
```

### classifyAxiom 优先级（domain.ts）

1. 旧结构 H2 名直接映射（Terms / Bans / Invariants / Stack）
2. v0.7.4 free-form Group：按 Axiom 体字段负载推断
   - `- value:` 字段 → Invariant
   - `- items:` 字段 → Ban
3. Group 名映射（Forbidden → Ban / Boundary → Invariant 等）
4. 仅有 `- desc:` 字段 → Term
5. 未知 Group → 默认 Term

### Blueprint Parser 兼容（per-work-blueprints-merger.ts）

- `## Use` 单段（legacy）+ `## Use <kind>` 多段（v2）双轨解析
- `## Boundaries`（legacy）+ `## Slot`（v2）等价处理
- `## Scope` / `## Context Template` H2 形式（兼容 v1）+ 顶层 `### Scope` / `### Context Template` H3 形式（v2）双轨解析

### Free-text List 兼容（utils.ts）

`collectListFields` 把无 `key: value` 格式的 `- <text>` 行归为 `_text` 合成字段，供 Axiom 体回退（形态 A 的 `- <Theorem>` 列表）。

## 守门契约

`scripts/check-asset-structure.ts`（v0.7.4 Phase 1 新增）：

| 检查项 | 违规码 |
|---|---|
| `## Group` 不重名（同一 Asset 内 H2 唯一） | `E_ASSET_DUPLICATE_GROUP` |
| `### Axiom` 行下只允许 `-` bullet + 字段负载（形态 A） | `E_ASSET_INVALID_AXIOM_BODY` |
| Group 下可仅含 Axiom（B）/ 仅含 List（C）/ Axiom + List（A）—— 形态 C 合法 | `E_ASSET_INVALID_GROUP_BODY` |
| Group 下可仅含 `### Axiom`（无 `-`）—— 形态 B 合法 | （无违规） |
| Blueprint 模板识别：`## Use <type>` / `## Slot` / 顶层 `###` | `E_ASSET_BLUEPRINT_USE_KIND_MISSING` / `E_ASSET_BLUEPRINT_USE_KIND_UNKNOWN` / `E_ASSET_BLUEPRINT_DUPLICATE_USE_TYPE` / `E_ASSET_BLUEPRINT_MISSING_USE_OR_SLOT` / `E_ASSET_BLUEPRINT_MISSING_SCOPE` / `E_ASSET_BLUEPRINT_INVALID_TOP_LEVEL` / `E_ASSET_BLUEPRINT_SLOT_MISSING_DEPS` |
| Stack Tool 字段负载解析（version / operations / role / command） | （内联） |
| Slot 字段负载解析（observe / operate / deps） | （内联） |
| 必填 frontmatter（entity + name） | `E_ASSET_MISSING_ENTITY` / `E_ASSET_MISSING_NAME` / `E_ASSET_KIND_INVALID` |

接入位置：
- `lefthook.yml` pre-commit（与 check-heading-skeleton / check-doc-boundary 并列）
- `package.json scripts.check:asset-structure`
- CI（与现有 4 个守门脚本并列）

## 决策记录（Grilling 锁定项）

| # | 问题 | 锁定答案 |
|---|---|---|
| 1 | Term 用 `### Term` 还是 `- [Term]` 行标记？ | **`### Term` H3** |
| 2 | 机器契约（inv-* / IAP_*）放哪？ | **留在 Asset 内**（`## Boundary` Group 收纳） |
| 3 | Stack Tool 字段化？ | **保留 H3 + 字段负载**（version / operations / role） |
| 4 | Glossary 锚点？ | **保留 `### Term` H3 锚点** |
| 5 | 改造范围？ | **S2：全部 5 类 Asset 收编** |
| 6 | `## Term` / `## Boundary` / `## Forbidden` 段位？ | **同名 Group（free-form）** |
| 7 | Blueprint 4 段（Use / Boundaries / Scope / Context Template）？ | **`## Use <Asset Type>` + `## Slot` + 顶层 `### Scope / ### Context Template`** |
| 8 | Group 下可不可以只有 `-`（无 `### Axiom`）？ | **可以 —— 形态 C** |

## 参考

- 设计稿：[`.openxenon/drafts/design-asset-structure-unification.md`](../../openxenon/drafts/design-asset-structure-unification.md)
- RFC：[`docs/rfc/zh-cn/`](../../rfc/zh-cn/)
- 标杆 Asset：[`.openxenon/assets/blueprints/bug-fix-blueprint.md`](../../openxenon/assets/blueprints/bug-fix-blueprint.md)
- 守门脚本：`scripts/check-asset-structure.ts`
- Domain Parser：`packages/engine/src/oxl/md-pipeline/transformers/domain.ts`
- Blueprint Parser：`packages/engine/src/Work/per-work-blueprints-merger.ts`
- Glossary Sync：`scripts/sync-domain-glossary.ts`