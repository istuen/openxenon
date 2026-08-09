---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-09
type: breaking-change
scope: asset-convergence-pr-g
status: pending
---

# 0.7.0-alpha.0: Asset 收敛 PR-G（Critical Name Collision 修复）

> 来源：[RFC-0027-asset-convergence-v070.md](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md) §PR-G
> 前置：PR-F（Domain 收敛）

## 摘要

3 个 Critical Name Collision Axiom 重命名：

| # | 旧名 | 新名 | 位置 | 冲突源 |
|---|---|---|---|---|
| 1 | `Scope` | `ReferenceScope` | `oxn-proof-domain.md:40` | work-domain `### Scope`（Blueprint 文件范围） |
| 2 | `Part` | `BuiltinPart` | `oxn-proof-domain.md:37` | work-domain `### Part`（Task 内 skill 单元） |
| 3 | `Flag` | `InterferenceFlag` | `oxn-proof-domain.md ForbiddenConstructs` | cli-domain `Flag/Option/Switch`（参数层） |

## 向后兼容

`Scope` / `Part` / `Flag` 作为 deprecated alias 在 proof-domain 保留至 v0.8 移除（已在 Axiom 注释中标注 `@deprecated`）。

## 代码层无 cascade

代码层 TypeScript 类型名 `Scope` interface（`packages/engine/src/Asset/scope-matcher.ts:23`）、`Part` type（`packages/engine/src/kernel/index.ts:135` 等）是 internal identifier，不与 Domain Axiom 冲突；保留现状。

InterferenceFlag 代码层已使用（`packages/engine/src/infra/providers/{file,git,shell,http}-provider.ts` 等）— 不需 cascade。

## 验证结果

```
bun run typecheck                              ✓ pass
bun run check                                  ✓ pass (1 pre-existing info)
bun test packages/engine packages/cli          ✓ 1931/1931 pass
bun scripts/check-asset-structure.ts           ✓ 29/29 pass
bun scripts/check-doc-boundary.ts              ✓ 0 violations
```

## 后续 PR（按依赖）

- **PR-H**：6 Workflow 删除 + asset-create mode 化
- **PR-I**：scene stub + bug-fix-blueprint 接入

详见 [RFC-0027 §PR-H/I](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md#5-各-pr-文件清单)。