---
version: 0.6.4-alpha.0
prerelease: alpha
date: 2026-08-09
type: refactor
scope: asset-convergence-pr-e
status: pending
---

# 0.6.4-alpha.0: Asset 收敛 PR-E（物理归位 + 类型消歧）

> 来源：[`.openxenon/drafts/design-asset-convergence-v064.md`](../../.openxenon/drafts/design-asset-convergence-v064.md) §PR-E
> 前置：PR-A（roadmap → assetmap）+ PR-B（Domain 收敛）+ PR-C（Workflow 合并）+ PR-D（references 语法统一）

## 摘要

| 变化 | 类型 | 详情 |
|---|---|---|
| `.openxenon/probes/` | **新建** | Q1：项目探针文档与 Asset 平级，独立目录 |
| `.openxenon/assets/probes/` | **删除** | 4 个 .md 文件已迁移或清理 |
| `paths.ts:14` `AssetType` | **重命名** `EngineModuleType` | Q3：消除与 AssetKind / OxnAssetType 命名歧义 |
| builtin probe 路径 | **未变** | `packages/engine/src/builtin/probes/*.ts`（19 builtin）|

## Q1 — Probe ≠ Asset 物理归位

### 路径迁移

| 文件 | from | to |
|---|---|---|
| `doc-boundary.md` | `.openxenon/assets/probes/doc-boundary.md` | `.openxenon/probes/doc-boundary.md` |
| `docs-build.md` | `.openxenon/assets/probes/docs-build.md` | `.openxenon/probes/docs-build.md` |
| `docs-heading-check.md` | `.openxenon/assets/probes/docs-heading-check.md` | `.openxenon/probes/docs-heading-check.md` |

### 删除

- `.openxenon/assets/probes/heading-skeleton-check.md`（指向已退役 Intent Pool v3，僵尸文件）
- `.openxenon/assets/probes/` 目录（空后删除）

### 物理位置最终态

```
.openxenon/
├── assets/                      ← 5 类 AssetKind（domain/workflow/stack/blueprint/assetmap）
│   ├── assetmaps/
│   ├── blueprints/
│   ├── domains/
│   └── workflows/
└── probes/                      ← 🆕 项目探针文档（probe contract specs，**非 Asset**）
    ├── doc-boundary.md
    ├── docs-build.md
    └── docs-heading-check.md
```

## Q3 — `AssetType` → `EngineModuleType`（类型消歧）

### 问题

`paths.ts:14` 定义 `AssetType = 'probes' | 'blueprints' | 'parts'`（Engine 模块类型）。
但项目内另有 2 个同名 / 相似名类型：

| 类型 | 定义位置 | 值 |
|---|---|---|
| `AssetType`（**path-to-rename**） | `paths.ts:14` | `'probes' \| 'blueprints' \| 'parts'` |
| `AssetType`（IAP 实体） | `oxl/driver.ts:29` | `'domain' \| 'blueprint' \| 'work' \| 'task' \| 'proof'` |
| `OxnAssetType`（builtin scope） | `oxl/scope/oxn-scope.ts:21` | `'probe' \| 'part' \| 'blueprint' \| 'interface'` |

3 个不同语义同名 / 相似名类型，IDE 自动补全 + 文档阅读歧义大。

### 改动

- `packages/engine/src/infra/paths.ts:14` — `AssetType` → `EngineModuleType`
  - 值不变：`'probes' | 'blueprints' | 'parts'`（仅类型名 rename，无 break-change）
  - 加 JSDoc 注释说明 3 种 AssetType 命名消歧
- `packages/engine/src/infra/loader.ts` — 9 处 `AssetType` 同步改 `EngineModuleType`

### 影响范围

仅 `loader.ts` 1 个文件 import `paths.ts` 中的 `AssetType`（搜索确认）。其他 2 个同名类型**不动**——它们语义独立。

## Domain Axiom

`.openxenon/assets/domains/oxn-proof-domain.md` v1.1.0 → v1.2.0：

- `### Probe` Axiom 追加 PR-E 注释：Probe 物理位置 2 处（builtin + 项目路径）
- project probe path：`.openxenon/probes/*.md`（与 Asset 平级不混 Asset）
- 36 个 invariant 全部保留

## 代码层

`packages/engine/src/infra/paths.ts:14` — `AssetType` → `EngineModuleType`（含 JSDoc 解释）

`packages/engine/src/infra/loader.ts` — 9 处 import + 用法同步

## 验证结果

```
bun run typecheck                              ✓ pass
bun run check                                  ✓ pass (1 pre-existing info)
bun test packages/engine packages/cli          ✓ 1931/1931 pass
bun test (full)                                2133/2137 pass (4 pre-existing failures unrelated)
bun scripts/check-asset-structure.ts           ✓ 30/30 pass
bun scripts/check-doc-boundary.ts              ✓ 0 violations
bun scripts/validate-dependencies.ts           ✓ 0 violations
bun scripts/sync-domain-glossary.ts --write    ✓ 写入完成
oxn assetmap show oxn-system --scene dev       ✓ 正常输出
ls .openxenon/probes/                          ✓ 3 文件
ls .openxenon/assets/                           ✓ 无 probes/ 子目录
```

## 资产数量最终态（PR-A → PR-E 累计）

| 类型 | 起点 | 最终 | Δ |
|---|---|---|---|
| Domain | 13 | **11** | -2（PR-B 删 insight + probe 合 proof） |
| Workflow | 17 | **13** | -4（PR-C 折 dev-workflow） |
| Stack | 3 | **3** | 0 |
| Blueprint | 4 | **4** | 0 |
| AssetMap | 1 | **1** | 0 |
| **Asset 总数** | **38** | **32** | **-6（-15.8%）** |
| Probe（**非 Asset**） | 4 项目 + 19 builtin = 23 | 3 项目 + 19 builtin = **22** | -1 |

## Asset 收敛全 PR 总结（PR-A → PR-E）

| PR | 内容 | Δ |
|---|---|---|
| **PR-A** | roadmap → assetmap + AssetMap parser 格式修复 | 类型 + parser |
| **PR-B** | Q5 删 insight + Q6 probe 合 proof | -2 Domain |
| **PR-C** | Q8 折 4 Workflow 到 dev-workflow | -4 Workflow |
| **PR-D** | Q7 references 语法统一（bare name canonical） | references 解析 |
| **PR-E** | Q1 Probe ≠ Asset 物理归位 + Q3 `AssetType` → `EngineModuleType` | 物理路径 + 类型消歧 |

详见 `.openxenon/drafts/design-asset-convergence-v064.md` §4。