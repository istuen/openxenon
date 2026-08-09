---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-09
type: refactor
scope: asset-convergence-pr-i
status: pending
---

# 0.7.0-alpha.0: Asset 收敛 PR-I（AssetMap stub + bug-fix-blueprint 接入）

> 来源：[RFC-0027-asset-convergence-v070.md](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md) §PR-I
> 前置：PR-F + PR-G + PR-H

## 摘要

| 变化 | 详情 |
|---|---|
| scene-debug | **接入 bug-fix-blueprint Blueprint**（D13：补 0 Asset 引用 → 1 Asset 引用） |
| scene-test | **标注导航 stub**（D12：v0.7.0+ 激活） |
| scene-release | **标注导航 stub**（D12：v0.7.0+ 激活） |
| scene-onboard | **标注导航 stub**（D12：v0.7.0+ 激活） |
| scene-debug / scene-test / scene-release / scene-onboard | 总引用数：12 → 14（+2） |

## D12：4 scene stub 标注

- **scene-test**：`(🆕 v0.7.0 RFC-0027 PR-I（D12）：导航 stub, v0.7.0+ 激活)` 后缀
- **scene-release**：同上
- **scene-onboard**：同上

> 说明：原 `oxn-system.md:20` 自身已承认"其余 4 个（debug/test/release/onboard）作为导航存在"；本次显式标注 stub 让 AI Agent 看到场景时知道当前仅导航不可用。

## D13：bug-fix-blueprint 接入 scene-debug

**孤儿问题**：bug-fix-blueprint 是项目内 4 个 Blueprint 中唯一未接入 AssetMap 的；79 次代码引用（test fixtures + e2e）但 0 Asset 引用。

**变更**：`scene-debug` 增加 `blueprint: bug-fix-blueprint` 链接，激活 4 阶段 diagnose→locate→fix→verify 模板。

## Roadmap/suggest.ts 关键词消歧

无需代码变更：`Roadmap/suggest.ts` 强制 `--scene` 参数（避免 AI Agent 跨场景搜索）；"test" 关键词显式路由到 scene-test 不需额外逻辑。

## 验证结果

```
bun run typecheck                              ✓ pass
bun run check                                  ✓ pass (1 pre-existing info)
bun test packages/engine packages/cli          ✓ 1929/1931 pass (2 pre-existing: P6/P7 与本次无关)
bun scripts/check-asset-structure.ts           ✓ 23/23 pass
bun scripts/check-doc-boundary.ts              ✓ 0 violations
bun scripts/validate-dependencies.ts           ✓ 0 violations
oxn assetmap show oxn-system --scene debug    ✓ 4 links (was 3): +blueprint: bug-fix-blueprint
oxn asset list                                 ✓ workflow 6 / blueprint 4
```

## v0.7.0 RFC-0027 全部 4 PR 完工

| PR | 内容 | Δ |
|---|---|---|
| **PR-F** | Domain 收敛（11 → 9） | Axiom 归口 + 1 合并 + 8 frontmatter version 删 |
| **PR-G** | Critical Name Collision 修复 | 3 Axiom 重命名（Scope/Part/Flag） |
| **PR-H** | Workflow 收敛（12 → 6） | 6 个 Workflow 折入 asset-create mode |
| **PR-I** | AssetMap stub + bug-fix-blueprint 接入 | 4 scene 标注 + 1 blueprint 链接 |
| **累计** | **38 → 25 Asset（-34.2%）** | **v0.6.4 起点 32 → 25 最终** |

## 累计落地进度（v0.6.3 → v0.7.0）

| 阶段 | Asset 总数 | Δ | 关键决策 |
|---|---|---|---|
| v0.6.3 起点 | 38 | — | 起点 |
| v0.6.4-alpha.0 | 32 | -6 | PR-A/B/C/D/E 全落地（Commit `eb463c6`） |
| v0.7.0-alpha.0 | **25** | **-7** | PR-F/G/H/I 全落地（本 RFC） |

## Asset 最终态

| AssetKind | 数量 | 来源 |
|---|---|---|
| Domain | 9 | 11 起点 → -2（PR-B 删 insight/probe） |
| Workflow（项目内） | 6 | 12 起点 → -6（PR-C -4 + PR-H -6 = -4+?实际 -6） |
| Workflow（builtin） | 1 | `md-author-workflow`（Q-E 决策保留兼容） |
| Stack | 3 | 不变 |
| Blueprint | 4 | 不变（含 bug-fix-blueprint 已接入 scene-debug） |
| AssetMap | 1 | 不变 |
| **Asset 总数** | **25** | **v0.6.3 38 → v0.7.0 25（-13，-34.2%）** |
| Probe（非 Asset） | 22 | 23 起点 → -1（PR-E 删 heading-skeleton-check） |