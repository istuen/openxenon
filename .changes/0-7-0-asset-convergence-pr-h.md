---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-09
type: breaking-change
scope: asset-convergence-pr-h
status: pending
---

# 0.7.0-alpha.0: Asset 收敛 PR-H（Workflow 层收敛）

> 来源：[RFC-0027-asset-convergence-v070.md](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md) §PR-H
> 前置：PR-F（Domain 收敛）+ PR-G（Critical Name Collision 修复）

## 摘要

Workflow 文件数：12 → **6**（-6：6 个项目 Workflow 删除并合并到 `asset-create` mode 参数化；builtin `md-author-workflow` 不动）

| 删除 Workflow | 折入目标 |
|---|---|
| `draft-skeleton-fork.md` | asset-create 加 `--mode skeleton` 选项 |
| `doc-publish.md` | VitePress 部署走 CI（已在 CI 配置），保留 `doc-author.publish` slot |
| `explore-analyze-report.md` | 用 `oxn draft create --type report` 替代 |
| `asset-archive.md` | asset-create 加 `--mode archive` 选项 |
| `asset-evolve.md` | asset-create 加 `--mode evolve` 选项 |
| `oxn-workflow.md`（root 优化） | 改为由 root Blueprint oxn-blueprint 在 Boundaries 中组合 dev-workflow + doc-author |

## asset-create v3.0.0：4 mode 参数化

```yaml
# v0.7.0: asset-create 支持 --mode 参数化
asset-create --mode create    # 默认：fork 同 kind 模板
asset-create --mode skeleton  # 从 .openxenon/draft-skeletons/ fork（吸收 draft-skeleton-fork）
asset-create --mode evolve    # 读 current → plan → apply（吸收 asset-evolve）
asset-create --mode archive   # check-references → confirm → move-to-archived（吸收 asset-archive）
```

## 引用 cascade

### AssetMap
- `oxn-system.md` scene-dev 删除 5 个孤儿 workflow 引用行（asset-archive / asset-evolve / explore-analyze-report / doc-publish + 更新 asset-create 描述）

### CLI / Engine 代码
- `packages/engine/src/Draft/skeleton.ts:74` — `WORKFLOW_VERSION` 常量从 `draft-skeleton-fork@0.1.0` → `asset-create@3.0.0-mode-skeleton`
- `packages/engine/src/kernel/verdicts/catalog.ts:500` — 注释删除 doc-publish 提及

### Skill locales
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-asset/instruction.md` — 跨 kind 引用示例从 `- workflow: oxn-workflow` 改为 `- workflow: dev-workflow`（oxn-workflow 已删）
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-draft/instruction.md` — `draft-skeleton-fork` 提及改为 `asset-create --mode skeleton`
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-draft/references/draft-lifecycle.md` — `created-from` 字段更新
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md` — `explore-analyze-report` 提及改为 `dev-workflow` (slot: ts-implement)
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/assets/work-explore.md` — Blueprint 引用更新

### 测试同步
- `packages/engine/src/Draft/__tests__/skeleton.test.ts` — `created-from` 字段断言更新
- `packages/cli/src/__tests__/e2e/draft-e2e.test.ts` — `created-from` 字段断言更新
- `packages/engine/src/Draft/__tests__/promote-dispatch.test.ts` — explore-analyze-report → dev-workflow

## 验证结果

```
bun run typecheck                              ✓ pass
bun run check                                  ✓ pass (1 pre-existing info)
bun test packages/engine packages/cli          ✓ 1929/1931 pass (2 pre-existing failures: P6/P7 与本次无关)
bun scripts/check-asset-structure.ts           ✓ 23/23 pass
bun scripts/check-doc-boundary.ts              ✓ 0 violations
bun scripts/validate-dependencies.ts           ✓ 0 violations
bun scripts/sync-domain-glossary.ts --write    ✓ 写入完成
oxn asset list                                  ✓ workflow 6 (was 12)
```

## 后续 PR（按依赖）

- **PR-I**：D12 stub 标注 + D13 bug-fix-blueprint 接入

详见 [RFC-0027 §PR-I](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md#5-各-pr-文件清单)。