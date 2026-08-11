---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-11
type: refactor
scope: rfc-0026-version-iteration-redesign
status: pending
---

# 0.7.0-alpha.0: RFC-0026 promote + 三层承诺流水线收尾

> 来源：[RFC-0026-version-iteration-redesign](../../docs/rfc/zh-cn/RFC-0026-version-iteration-redesign.md)（v0.7.0 promote Draft → Accepted）
> 前置：[RFC-0030-rfc-adr-historical-convergence](../../docs/rfc/zh-cn/RFC-0030-rfc-adr-historical-convergence.md) + [RFC-0027](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md) + [RFC-0028](../../docs/rfc/zh-cn/RFC-0028-context-map-deprecation.md) + [RFC-0029](../../docs/rfc/zh-cn/RFC-0029-inv2-revision.md)

## 摘要

三层承诺流水线（Draft → Goal → Version）收尾配套 RFC：

1. **D1 三层模型 + Intent Pool 退役** — Draft（探索）/ Goal（承诺）/ Version（发布）；Intent Pool v3 5 池机制吸收进 Draft（origin=insight）；`oxn pool *` 5 CLI 命令全部废弃。
2. **D2 Draft 新增 `--target goal` 路由** — `oxn draft promote --target goal --goal-slug=<s>` 从 Draft 升华；4 阶段生命周期；dispatch 后 auto `git checkout -b feat/goal-<slug> dev`。
3. **D3 废弃 `--target work` 直达路由** — `oxn draft promote --target work` 报 `OXN_DRAFT_TARGET_WORK_DEPRECATED` 引导走 Goal；快捷途径破坏承诺层导致版本失控（npm 0.4 停 4 个月根因）。
4. **D4 dev/pool 10 entries 最小迁移** — PlanningPool → Goal 概念正名；frontmatter 加 `branch:` + `source:` + `scheduled-version: ~`；CLI 校验。
5. **§2.4 Forcing Function a+b+c** — (a) 时间节奏 / (b) 最小 Goal 完成 / (c) Goal 变更；任一触发即 cut。
6. **§2.5 分支模型三层** — `main` / `dev` / `feat/goal-<slug>`；dev 长期集成；Goal 分支从 dev 拉。

## D1 · Intent Pool 退役 → Draft origin=insight

**决策**：Intent Pool v3 5 池机制（research/design/issue/audit/journal）吸收进 Draft 3 类（report/design/issue），零信息损失。

**落地清单**：

| 文件 | 改写内容 |
|---|---|
| `oxn-project-domain.md` | §Inv11IntentPoolV3Retired 已就位 |
| `oxn-proof-domain.md` | §InsightDraftMapping 加 "5 池吸收进 3 类 Draft" Theorem + "Intent Pool v3 整体退役" Theorem + "手工 gate 不再单独层" Theorem |
| `oxn-draft-domain.md` | §DraftOrigin 加 "D1 Insight → Draft 通路" Theorem + "insight → human 不可逆" Theorem |
| `oxn-cli-domain.md` | §ForbiddenConstructs 加 oxn-pool-* 6 项禁用 + `OXN_POOL_DEPRECATED` 错误码禁用 |

**CLI 兼容期**：`oxn pool {create,list,review,approve,reject}` v0.6.x → v0.7.0 期间报 deprecation warning；v0.8.0 彻底移除。

## D2 · Draft `--target goal` 路由

**决策**：`oxn draft promote --target goal --goal-slug=<s>` 升华 Draft 为 Goal。

**落地清单**：

| 文件 | 改写内容 |
|---|---|
| `oxn-project-domain.md` | §Goal 加 "D2 Draft 升华路径" Theorem |
| `oxn-draft-domain.md` | §DraftTarget 加 "D2 --target goal 升华路径" Theorem |
| `release-cut.md` | 引用 RFC-0026 + 三层承诺流水线 §Forcing Function |

**4 阶段生命周期**：`gather → validate-skeleton → fork-missing → dispatch-target`；dispatch 后：
- 写 `dev/pool/<slug>.md` Goal entry
- `git checkout -b feat/goal-<slug> dev` 自动拉分支
- 源 Draft 不变（promote 是 copy 不是 state transition）

## D3 · `--target work` 拒收

**决策**：`oxn draft promote --target work` 改为报 `OXN_DRAFT_TARGET_WORK_DEPRECATED` 引导走 Goal。

**落地清单**：

| 文件 | 改写内容 |
|---|---|
| `oxn-project-domain.md` | §Goal 加 "D3 --target work 废弃" Theorem |
| `oxn-draft-domain.md` | §DraftTarget 加 "D3 --target work 拒收" Theorem |
| `oxn-cli-domain.md` | §ForbiddenConstructs 加 oxn-draft-promote-target-work + `OXN_DRAFT_TARGET_WORK_DEPRECATED` 错误码禁用 |

**理由**：work 直达导致 Work 不绑 Goal → 版本号断链；探索阶段直接进执行 → 跳过承诺层；直接对应过去 4 个月 npm 停在 0.4 的失控。

## D4 · dev/pool 10 entries 最小迁移

**决策**：几乎免迁移，仅概念正名 + frontmatter 加字段。

**10 entries 清单**（2026-08-07 确认）：

| slug | priority | status | branch | source |
|---|---|---|---|---|
| anchor-slot | medium | planned | feat/goal-anchor-slot | direct |
| engine-closure-self-verify | critical | planned | feat/goal-engine-closure-self-verify | direct |
| work-unified-model | high | planned | feat/goal-work-unified-model | direct |
| probe-system-evolution | high | planned | feat/goal-probe-system-evolution | direct |
| infra-ports | medium | planned | feat/goal-infra-ports | direct |
| npm-ship-path | high | planned | feat/goal-npm-ship-path | direct |
| emergence | medium | planned | feat/goal-emergence | direct |
| asset-graph | medium | planned | feat/goal-asset-graph | direct |
| ai-three-modes | medium | planned | feat/goal-ai-three-modes | direct |
| term-upstream-dag | medium | planned | feat/goal-term-upstream-dag | direct |

**前置状态**（RFC-0026 起点）：10 entries 已全部具备 `branch:` + `source: direct` + `scheduled-version: ~` 字段；本轮 RFC-0026 promote 阶段无增量修改。

## §2.4 Forcing Function a+b+c

**触发器**：

- **(b) 最小 Goal 完成** — Goal 边界清晰（§2.2 入池条件 a），Work finalized + Domain proof PASS → 立即 cut
- **(c) Goal 变更** — 开发中发现 Goal 边界需要改（scope 蔓延/方向偏移）→ 立即 cut 当前（即使未完成），新 Goal 开新 Version
- **(a) 时间节奏** — 每 1 周自动检查：未 cut 的 finalized Goal + 1 周时间到 → 强制 cut 当前全部 finalized Goal（剩余 Goal 滚下个 Version）

**落地清单**：`oxn-project-domain.md` §Version 加 "Forcing Function a+b+c" + "Cut 必走 dry-run" Theorems。

## §2.5 分支模型三层

**结构**：

```
main (已发布，tag 落这里)
  ↑
dev (长期集成分支；Goal 分支合并目的地)
  ↑
  ├── feat/goal-<slug-A>（from dev）→ Goal A 的 Work
  ├── feat/goal-<slug-B>（from dev）→ Goal B 的 Work
  └── feat/goal-<slug-C>（from dev）→ Goal C 的 Work
```

**前置状态**：`dev` 分支已存在（v0.4 sync 起点 `0444c7c merge: feat/v0.4-unify-md → dev`）；本轮无新增分支。

**落地清单**：`oxn-project-domain.md` §Inv13BranchModelMainDevFeatGoal 加 "main 仅接收 dev merge" + "dev 是所有 Goal 分支源头" Theorems。

## §4.4 · dev/versions/ 退役

**前置状态**：`dev/versions/` 目录已不存在（仅 `.openxenon/.archived/dev/versions/{README.md, Blueprint-2.md, 0-7-0-*}.md` 保留历史溯源）；本轮无需操作。

## §4.5 · release-cut workflow 集成

**`release-cut.md`** 改造：
- v0.7.0 RFC-0026 promote 后，本 workflow 是 Goal → Version 转换的物理执行器
- 引用更新：`design-version-iteration-redesign.md` → RFC-0026（Accepted）
- version-cut slot 接 `oxn version cut --trigger <done|change|schedule>`（不变）
- post-publish-bump 是 Version Hygiene 强制保障（不变）

## 落地清单

| # | 动作 | 文件 | 状态 |
|---|---|---|---|
| 1 | RFC-0026 promote Draft → Accepted | docs/rfc/zh-cn/RFC-0026-version-iteration-redesign.md | ✅ |
| 2 | D1/D2/D3 Theorem + §2.4 §2.5 §4.5 集成 | oxn-project-domain.md | ✅ |
| 3 | D1 §DraftOrigin + D2/D3 §DraftTarget | oxn-draft-domain.md | ✅ |
| 4 | §Goal/§Version CLI + §ForbiddenConstructs | oxn-cli-domain.md | ✅ |
| 5 | §InsightDraftMapping 加 5 池退役 Theorem | oxn-proof-domain.md | ✅ |
| 6 | release-cut.md 引用 RFC-0026 | release-cut.md | ✅ |
| 7 | 6 项验证守门 | scripts/*.ts | ✅ |

## 验证守门

| 守门 | 状态 |
|---|---|
| `bun scripts/check-asset-structure.ts` | ✅ 23/23 |
| `bun scripts/validate-dependencies.ts` | ✅ 0 violations |
| `bun scripts/check-adr-landing.ts --enforce` | ✅ 25/25（强制模式全过） |
| `bun scripts/check-doc-boundary.ts` | ⚠️ 2 violations（预存在 RFC-0017） |
| `bun scripts/sync-domain-glossary.ts --write` | ✅ 9 Domain / 335 term headings |
| `bun run typecheck` | ✅ 通过 |

## 关联变更

| 关联项 | 处理 |
|---|---|
| `RFC-0027` Asset 收敛 v0.7 | 历史 RFC，frozen |
| `RFC-0028` CONTEXT-MAP 退役 | 历史 RFC，frozen |
| `RFC-0029` Inv2 语义修订 | 历史 RFC，frozen |
| `RFC-0030` RFC/ADR 历史溯源收敛 | 上游 RFC，已 Accepted |
| `oxn-project-domain.md` §Goal/§Version §Inv11-14 | 已落地 D2/D3/D4 + §2.4 §2.5 Theorem |
| `oxn-draft-domain.md` §DraftOrigin §DraftTarget | 已落地 D1/D2/D3 Theorem |
| `oxn-cli-domain.md` §Goal §Version §ForbiddenConstructs | 已落地 CLI 命令 + 5 池废弃 |
| `oxn-proof-domain.md` §InsightDraftMapping | 已落地 5 池退役 Theorem |
| `release-cut.md` workflow | 已集成 RFC-0026 引用 |

## changelog 历史

- `0-6-4-context-template.md` — v0.6.4 context-template（前置）
- `0-7-0-context-map-deprecation.md` — CONTEXT-MAP 退役（上游）
- `0-7-0-inv2-revision.md` — Inv2 语义修订（上游）
- `0-7-0-rfc-adr-historical-convergence.md` — RFC/ADR 历史溯源收敛（上游）
- `0-7-0-version-iteration-redesign.md` — **本 changelog**