---
version: 0.6.4-alpha.0
prerelease: alpha
date: 2026-08-09
type: refactor
scope: asset-convergence-pr-c
status: pending
---

# 0.6.4-alpha.0: Asset 收敛 PR-C（Workflow 合并）

> 来源：[`.openxenon/drafts/design-asset-convergence-v064.md`](../../.openxenon/drafts/design-asset-convergence-v064.md) §PR-C
> 前置：PR-A（roadmap → assetmap）+ PR-B（Domain 收敛）

## 摘要

Workflow 文件数：17 → **13**（-4）

| 变化 | 类型 | 详情 |
|---|---|---|
| `dev-workflow.md` | **扩展** | v2.0.0 → v3.0.0；slot 数 4 → 9（折入 5 个专用 slot） |
| `add-cli-subcommand.md` | **删除 + 折入** dev-workflow `cli-add` slot |  |
| `ts-retrieve-design-develop-test.md` | **删除 + 折入** dev-workflow `ts-implement` slot |  |
| `refactor-safe.md` | **删除 + 折入** dev-workflow `refactor` slot |  |
| `git-workflow.md` | **删除 + 折入** dev-workflow `git-branch` slot |  |

⚠️ **同名区别**：`packages/engine/src/builtin/blueprints/git-workflow.md` 是 **Blueprint**（不是 Workflow），保持不变；命名同名但 AssetKind 不同（kind=blueprint vs kind=workflow）。

## dev-workflow v3.0.0：9 slot 流水线

### 4 个**通用 slot**（v2 基础）

- `retrieve` — 检索项目现状（fs-content-match）
- `design` — 规划变更（fs-exists + 类型签名）
- `develop` — 实现代码（lint-check + ts-compiles）
- `test` — 验证（ts-compiles + test-pass）

### 5 个**专用 slot**（v0.6.4 PR-C 折入）

| Slot | 折入源 | 关键 observe |
|---|---|---|
| `cli-add` | `add-cli-subcommand.md` | ts-compiles + test-pass |
| `ts-implement` | `ts-retrieve-design-develop-test.md` | fs-content-match + ts-compiles |
| `refactor` | `refactor-safe.md` | fs-content-match + fs-not-exists + lint-check + ts-compiles + test-pass |
| `git-branch` | `git-workflow.md` | git-clean + git-branch-exists + git-status-clean + git-merge-feasible |

## Slot 折叠规则（E3 c 决策）

新增 Axiom `### SlotFoldingRule`（dev-workflow ## Practice + oxn-work-domain ## ConceptEngineering）：

```
优先级 1: Blueprint `## Use` 内 `slot: <name>` 显式字段（最高）
优先级 2: sub-target 映射
  - promote-asset-workflow → test slot
  - promote-rfc → design slot
优先级 3: goal 关键词匹配
  - "CLI" / "subcommand" → cli-add
  - "重构" / "refactor" → refactor
  - "TS" / "TypeScript" → ts-implement
  - "git" / "branch" → git-branch
优先级 4: 默认 test slot（保证所有 dev 流程都包含验证）
```

折叠后 Blueprint `## Use workflow: @md/workflows/dev-workflow` **不需 slot 字段**；OXN 自动路由。

## AssetMap 场景引用

`.openxenon/assets/assetmaps/oxn-system.md` scene-dev：

- 删 4 个 workflow 引用行（add-cli-subcommand / refactor-safe / git-workflow / ts-retrieve-design-develop-test）
- dev-workflow 描述更新：标注 "🆕 v0.6.4 PR-C: 9 slot，含 cli-add / ts-implement / refactor / git-branch 4 个折入的专用 slot；E3 c slot 由上下文推断"

最终 scene-dev：4 Domain + 8 Workflow（原 4 Domain + 12 Workflow）。

## Blueprint 引用

**.openxenon/assets/blueprints/** 下 4 个 Blueprint **不引用**被删除的 4 个 Workflow（搜索结果：无 `@md/workflows/(add-cli-subcommand|ts-retrieve-design-develop-test|refactor-safe|git-workflow)` 引用）。

引用清单（仅列举存活的 Workflow 引用）：

| Blueprint | 引用 Workflow |
|---|---|
| `bug-fix-blueprint.md` | `@md/workflows/fix-issue` |
| `oxn-blueprint.md` | `@md/workflows/oxn-workflow` |
| `draft-promote-router.md` | `@md/workflows/draft-skeleton-fork` |
| `promote-target-aware-workflow.md` | `@md/workflows/asset-create` / `doc-author` / `draft-skeleton-fork` |

零修改。

## Domain Axiom

`.openxenon/assets/domains/oxn-work-domain.md` v1.0.0 → v1.1.0：

- 新增 Axiom `### SlotFoldingRule`（## ConceptEngineering 段，紧邻 Operate Axiom）
- 36 个 invariant 全部保留

## 验证结果

```
bun run typecheck                              ✓ pass
bun run check                                  ✓ pass (1 pre-existing info)
bun test packages/engine packages/cli          ✓ 1931/1931 pass
bun test (full)                                2133/2137 pass (4 pre-existing failures unrelated)
bun scripts/check-asset-structure.ts           ✓ 30/30 pass (was 34/34; -4 deleted workflow)
bun scripts/check-doc-boundary.ts              ✓ 0 violations
bun scripts/validate-dependencies.ts           ✓ 0 violations
bun scripts/sync-domain-glossary.ts --write    ✓ 写入完成
oxn assetmap show oxn-system --scene dev       ✓ 4 Domain + 8 Workflow 正常输出
```

## 后续 PR（按依赖）

- **PR-D**：Q7 references 语法统一（B 方案 bare name + parent-kind metadata）
- **PR-E**：Q1 + Q3 物理归位（Probe 文件迁 `.openxenon/probes/` + `AssetType` → `EngineModuleType`）

详见 `.openxenon/drafts/design-asset-convergence-v064.md` §4。