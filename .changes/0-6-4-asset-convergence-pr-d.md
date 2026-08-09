---
version: 0.6.4-alpha.0
prerelease: alpha
date: 2026-08-09
type: refactor
scope: asset-convergence-pr-d
status: pending
---

# 0.6.4-alpha.0: Asset 收敛 PR-D（references 语法统一）

> 来源：[`.openxenon/drafts/design-asset-convergence-v064.md`](../../.openxenon/drafts/design-asset-convergence-v064.md) §PR-D
> 前置：PR-A（roadmap → assetmap）+ PR-B（Domain 收敛）+ PR-C（Workflow 合并）

## 摘要

References 语法：3 套并存 → **bare name + parent-kind metadata**（Q7 B 方案）

| 语法 | 变化 |
|---|---|
| Asset `references:` 字段（bare name） | **canonical** |
| Blueprint `## Use` 段 bare name + 显式 `kind:` | **canonical**（去 `@md/` 前缀） |
| `@md/{kind}/{name}` | **deprecated**，仍兼容 |

**核心收益**：`isAssetReferenced()` 假阴性消失（reverse index key 用 `${kind}::${name}` 形式归一化），archive/delete 守门不再漏判。

## Q7 B 方案详解

### 解析优先级

```
1. bare name          → 强制 parent kind 推断 → assets/{parentKind}s/{name}.md 查
2. @md/{kind}/{name}  → 显式 kind + name（deprecated v0.6.4）
3. 跨 kind 引用       → 必须用 Blueprint `## Use` 段（显式 kind: 字段）
```

### 错误码变化

- `IAP_INTENT_CROSS_KIND_REF`（v0.6.2+ hard-block）→ **保留**；Asset `references:` 字段写跨 kind 引用仍触发此错误码
- 🆕 解析失败时返回 `{kind, name}` 元组或 `null`，调用方自行报错（含 cycleHint）

## 代码层

`packages/engine/src/Asset/internal/reference-checker.ts`：

- **新增** `resolveReference(parentKind, refStr, projectRoot)`：解析单个引用字符串为 `(kind, name)` 元组
  - bare name → 强制 parent kind 推断，验证文件存在
  - `@md/{kind}/{name}` → 显式 kind + name（deprecated）
- `extractReferences(content, _parentKind?)`：新增可选 `parentKind` 参数（向后兼容单参数签名）
- `listAssetReferences(projectRoot, config?)`：
  - reverse index key 从 `name` 改为 `${kind}::${name}`（消除 false negative）
  - 每条 reference 通过 `resolveReference(parentKind, refStr, projectRoot)` 归一化
- 文档注释更新（v0.6.4 PR-D 标注）

## Blueprint 文件（4 个）

全部升级到 v2.2.0，`## Use` 段去 `@md/` 前缀：

| Blueprint | version | 变化 |
|---|---|---|
| `oxn-blueprint.md` | 2.1.0 → 2.2.0 | `## Use` 段 bare name + 显式 kind： |
| | | `- workflow: oxn-workflow` (was `@md/workflows/oxn-workflow`) |
| | | `- domain: oxn-domain` |
| | | `- stack: oxn-stack` / `git-stack` |
| `bug-fix-blueprint.md` | 2.1.0 → 2.2.0 | `references: []` 清空（cross-kind 引用全部移到 `## Use`）+ `## Use` 段去 `@md/` |
| `draft-promote-router.md` | 2.1.0 → 2.2.0 | 同上 |
| `promote-target-aware-workflow.md` | 2.1.0 → 2.2.0 | 同上 |

⚠️ **重要变化**：Blueprint frontmatter `references:` 字段从 v0.6.4 起**强制清空**——因为 Blueprint 的所有引用都是跨 kind，必须用 `## Use` 段（带显式 `kind:` 字段）。Root Blueprint（`oxn-blueprint.md`）本就 `references: []`，无需变更。

## Domain Invariant

`.openxenon/assets/domains/oxn-asset-domain.md` v1.0.0 → v1.1.0：

- **Inv15KindIsolationInReferences** 强化（Q7 B）：
  - 旧：Asset.references 仅可引用同 AssetKind
  - 新：bare name 强制 parent kind 推断；跨 kind 必须用 Blueprint `## Use` 段（显式 `kind:` 字段）；`@md/{kind}/{name}` deprecated 兼容
- 🆕 **Inv30ReferencesSyntaxCanonical**（新增）：references 语法统一为 bare name（canonical），`@md/{kind}/{name}` deprecated；解析边界固定在 `extractReferences()` + `resolveReference()`；reverse index key 用 `${kind}::${name}` 形式归一化

## Skill 文档

`packages/cli/src/skills/locales/{en,zh-CN}/oxn-asset/instruction.md`：

- 🆕 新增 `## references syntax (Q7 option B)` 段：3 套语法 → bare name 单一规范 + 解析优先级 + 解析器位置
- 错误码新增 `IAP_INTENT_CROSS_KIND_REF`（v0.6.4 PR-D 保留）
- Forbidden 列表新增 2 条：不写 `@md/{kind}/{name}` / 不在 `references:` 字段写跨 kind 引用

## 测试

`packages/engine/src/Asset/__tests__/unarchive-tree.test.ts:199`：

- 测试 8 "tree reverse 方向显示谁引用了我" 更新为 🆕 v0.6.4 PR-D 同 kind 解析场景
- 原测试用 workflow/blueprint 引用 domain（cross-kind），改为 3 个 domain 同 kind 互引
- 同步验证 PR-D 新行为：cross-kind references 在 `references:` 字段不解析（必须走 Blueprint `## Use`）

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
```

## 后续 PR（按依赖）

- **PR-E**：Q1 + Q3 物理归位（Probe 文件迁 `.openxenon/probes/` + `AssetType` → `EngineModuleType`）

详见 `.openxenon/drafts/design-asset-convergence-v064.md` §4。