---
entity: dev-meta
type: meta-baseline
created: 2026-08-05
status: shipped
related:
  - docs/adrs/0052-langium-retirement-oxn-deprecation.md
  - .changes/0-6-1-oxn-deprecation.md
  - .changes/0-6-1-pr4-langium-freeze.md
  - dev/versions/0-7-0-oxn-deprecation.md
synced-at: 2026-08-05
---

# .oxn Deprecation Baseline（v0.6.1 已落地部分）

> **类型**：dev meta 文档（OpenXenon 维护者操作参考）
> **状态**：✅ Shipped（v0.6.1 落地）
> **范围**：oxn-deprecation-rfc.md 的 PARTIAL ship 部分
> **完整路径**：见 [dev/versions/0-7-0-oxn-deprecation.md](../../dev/versions/0-7-0-oxn-deprecation.md)（v0.7.0 切割 deferred 部分）

## 1. 已落地交付

### 1.1 MD-native compiler（v0.6.1 PR-A / PR-B / PR-C）

| 阶段 | 内容 | 落地 |
|---|---|---|
| PR-A | MD-native compiler（5 类 EntityCompiler）| ✅ shipped |
| PR-B | decompiler 重写 + domains-md 重生 + `:::intent{...}` 废弃（PR-1 RFC T19 cleanup）| ✅ shipped |
| PR-C | VSCode grammar + VitePress CSS 着色 | ✅ shipped |

### 1.2 Langium freeze + DEPRECATED 标记

| 项 | 路径 | 状态 |
|---|---|---|
| CI 守卫 `check-no-new-langium-usage.ts` | `scripts/` | ✅ shipped（fatal）|
| `langium-driver/DEPRECATED.ts` | `packages/engine/src/oxl/langium-driver/` | ✅ shipped |
| 默认 driver `'unified'` → `'mdast'` | `driver.ts` | ✅ shipped |
| `--no-langium` flag | CLI | ✅ shipped |

### 1.3 .oxn fallback 保留

| 项 | 状态 |
|---|---|
| `AssetFormat` 默认 `oxn` → `md` | ✅ shipped |
| `resolveAssetFileCandidatesV61` 4 级候选 | ✅ shipped |
| `.oxn` 文件 v0.6.x 兼容 fallback | ✅ shipped（v0.7.0 切割见 deferred）|

## 2. ADR 关联

- [ADR-0052](../../docs/adrs/0052-langium-retirement-oxn-deprecation.md) — Langium 退役 + OXN 退役决策
- [ADR-0054](../../docs/adrs/0054-three-boundary-framework.md) — 三边界框架（前置）
- [ADR-0055](../../docs/adrs/0055-blueprint-as-composition-template.md) — Blueprint 组合模板（前置）
- [ADR-0056](../../docs/adrs/0056-external-inline-and-status.md) — External inline（前置）

## 3. Changelog

- [.changes/0-6-1-oxn-deprecation.md](../../.changes/0-6-1-oxn-deprecation.md) — 高层叙事
- [.changes/0-6-1-pr4-langium-freeze.md](../../.changes/_archive/0-6-1-asset-md-pr-fragments/0-6-1-pr4-langium-freeze.md) — PR-4 实施细节

## 4. deferred 部分

完整 v0.7.0 切割（git rm 全量 .oxn + 卸 Langium npm dep + 移除 `--oxn-legacy` flag + CLI 清理）见 [dev/versions/0-7-0-oxn-deprecation.md](../../dev/versions/0-7-0-oxn-deprecation.md)。
