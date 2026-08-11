---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-11
type: feat
scope: rfc-0026-cli-execution
status: pending
---

# 0.7.0-alpha.0: RFC-0026 CLI 执行层落地（D1/D2/D3）

> 来源：[RFC-0026-version-iteration-redesign](../../docs/rfc/zh-cn/RFC-0026-version-iteration-redesign.md) §D1/D2/D3
> 配套：[0-7-0-version-iteration-redesign.md](./0-7-0-version-iteration-redesign.md) — Domain 落地
> 前置：[0-7-0-rfc-adr-historical-convergence.md](./0-7-0-rfc-adr-historical-convergence.md)

## 摘要

三层承诺流水线（Draft → Goal → Version）的 **CLI 物理执行层** 落地：

1. **D2 `--target goal` CLI 通路打开** — 新增 `--goal-slug` arg；engine 全套逻辑（`packages/engine/src/Draft/promote.ts`）已就位，CLI 现在透传 goalSlug。
2. **D3 `--target work` 拒收** — 新增 `OXN_DRAFT_TARGET_WORK_DEPRECATED` 错误码 + 引导提示走 Goal 承诺层。
3. **D1 `oxn pool *` 5 命令废弃** — **前置 commit 67dc7d9（2026-08-07）已物理删除** pool.ts + pool-list/create/review/approve/reject.ts（11 文件总计）。

## D2 · `--target goal` CLI 通路

**改动位置**：`packages/cli/src/commands/draft.ts` `promote` 子命令

**新增**：
```typescript
'goal-slug': {
  type: 'string',
  description: 'v0.7.0+: --target=goal 必填；kebab-case slug（用作 Goal id + branch 后缀 feat/goal-<slug>）',
}
```

**透传**：
```typescript
const goalSlug = !goalSlugRaw || goalSlugRaw === '' ? undefined : goalSlugRaw
const result = promoteDraft(
  { ..., goalSlug, ... },
  config,
)
```

**端到端验证**：
```bash
$ oxn draft promote test-goal --target goal --goal-slug my-first-goal
✓ Promote dispatch: promote-draft-goal → dev/pool/my-first-goal.md
  Target: goal
  Note: Pass --commit to actually write the target file.
```

**4 阶段生命周期**（engine 已实现）：
1. `gather` — router Blueprint 读 Draft frontmatter + body
2. `validate-skeleton` — 校验 `goal-slug` kebab-case 格式
3. `fork-missing` — 从 `.openxenon/draft-skeletons/goal.md` 派生
4. `dispatch-target` — 写 `dev/pool/<slug>.md` + auto `git checkout -b feat/goal-<slug> dev`

## D3 · `--target work` 拒收

**改动位置**：`packages/cli/src/commands/draft.ts` `promote` 子命令

**新增错误码**：`OXN_DRAFT_TARGET_WORK_DEPRECATED`

**实现**：
```typescript
if (targetOverrideRaw === 'work') {
  outputUserInputError(
    'OXN_DRAFT_TARGET_WORK_DEPRECATED',
    `--target work 已废弃（RFC-0026 D3）。work 直达破坏 Goal 承诺层，导致版本失控。`,
    {
      suggestion:
        '请改走 Goal 承诺层：\n' +
        '  1. oxn draft promote --target goal --goal-slug <slug>\n' +
        '  2. 然后 oxn goal work <slug> 创建 IAP Work\n' +
        '见 RFC-0026 §D3 + oxn-draft-domain §DraftTarget。',
    },
  )
  return
}
```

**端到端验证**：
```bash
$ oxn draft promote design-test-work --target work
{
  "ok": false,
  "error": {
    "code": "OXN_DRAFT_TARGET_WORK_DEPRECATED",
    "message": "--target work 已废弃（RFC-0026 D3）。work 直达破坏 Goal 承诺层，导致版本失控。",
    "suggestion": "请改走 Goal 承诺层：\n  1. oxn draft promote --target goal --goal-slug <slug>\n  2. 然后 oxn goal work <slug> 创建 IAP Work\n见 RFC-0026 §D3 + oxn-draft-domain §DraftTarget。"
  }
}
```

**CLI 表面变更**：
- `draft promote --help` 输出：`--target` 描述从 "rfc / asset / work" → "rfc / asset / goal（work v0.7.0+ 废弃）"
- 错误信息：明确给出 `oxn draft promote --target goal --goal-slug` + `oxn goal work` 两步迁移路径

## D1 · `oxn pool *` 5 命令废弃

**前置状态**（commit 67dc7d9, 2026-08-07）：已物理删除

```
D:\nold:    packages/cli/src/commands/pool.ts (22 lines)
deleted:    packages/cli/src/commands/pool-list.ts
deleted:    packages/cli/src/commands/pool-create.ts
deleted:    packages/cli/src/commands/pool-review.ts
deleted:    packages/cli/src/commands/pool-approve.ts
deleted:    packages/cli/src/commands/pool-reject.ts
deleted:    packages/cli/src/__tests__/e2e/pool-review-approve-reject-e2e.test.ts
deleted:    packages/cli/src/commands/daemon-start.ts
deleted:    packages/cli/src/commands/daemon-status.ts
deleted:    packages/cli/src/commands/daemon-stop.ts
deleted:    packages/cli/src/commands/daemon.ts
deleted:    packages/cli/src/commands/dev-pool-migrate.ts
```

**当前状态**：`oxn --help` 输出已不含 `pool` 子命令；CLI 表面从 20 → 17 命令组。

**Engine 层**：`packages/engine/src/Pool/` + `packages/engine/src/infra/frozen/pool-writer.ts` 等 util 保留 1 版本兼容期（v0.8.0 彻底移除）。

## 已知遗留（独立议题）

- **`goal.md` skeleton 未进 `BUILTIN_SKELETON_TEMPLATES`**：仓库 `.openxenon/draft-skeletons/goal.md` 存在但 `packages/cli/src/init/builtin-skeleton-templates.ts:272-280` 只列 7 项（rfc + 5 assets + work），不含 `goal.md` 和 `asset-roadmap.md`。`oxn init` 不会创建这两个 skeleton，需手动 `cp .openxenon/draft-skeletons/goal.md <project>/.openxenon/draft-skeletons/` 或后续 PR 修复。
- **本次 PR 不修此遗留**：focus 严格限定 RFC-0026 D1/D2/D3 的 CLI 执行层落地。

## 落地清单

| # | 动作 | 文件 | 状态 |
|---|---|---|---|
| 1 | CLI promote 子命令加 `--goal-slug` arg | packages/cli/src/commands/draft.ts | ✅ |
| 2 | CLI promote 透传 goalSlug 到 engine | packages/cli/src/commands/draft.ts | ✅ |
| 3 | CLI promote 加 `--target work` 拒收 | packages/cli/src/commands/draft.ts | ✅ |
| 4 | 错误码 `OXN_DRAFT_TARGET_WORK_DEPRECATED` 定义 | packages/cli/src/commands/draft.ts | ✅ |
| 5 | `oxn pool *` 5 命令物理删除 | packages/cli/src/commands/pool*.ts | ✅（commit 67dc7d9） |
| 6 | CLI description 更新（v0.7.0 RFC-0026 引用） | packages/cli/src/commands/draft.ts | ✅ |
| 7 | 6 项验证守门 | scripts/*.ts + typecheck + test | ✅ |

## 验证守门

| 守门 | 状态 |
|---|---|
| `bun scripts/check-asset-structure.ts` | ✅ 23/23 |
| `bun scripts/check-adr-landing.ts --enforce` | ✅ 全部通过 |
| `bun run typecheck` | ✅ 通过 |
| `bun run check (biome)` | ✅ 1 info（预存在） |
| `bun test packages/cli/src/__tests__/e2e/draft-e2e.test.ts` | ✅ 39/39 |
| `bun test packages/engine/src/Draft/__tests__/` | ✅ 87/87 |

## 端到端验证

```bash
# D3 --target work 拒收
$ oxn draft promote design-test-work --target work
OXN_DRAFT_TARGET_WORK_DEPRECATED 错误码 + 引导文本

# D2 --target goal 升华
$ oxn draft promote test-goal --target goal --goal-slug my-first-goal
✓ Promote dispatch: promote-draft-goal → dev/pool/my-first-goal.md
```

## 关联变更

| 关联项 | 处理 |
|---|---|
| `RFC-0026` 三层承诺流水线 | 已 Accepted（commit 5ac8f1d） |
| `oxn-draft-domain.md` §DraftTarget D2/D3 Theorem | 已落（commit 5ac8f1d） |
| `oxn-cli-domain.md` §ForbiddenConstructs pool/deprecated | 已落（commit 5ac8f1d） |
| `goal.md` skeleton（未在 init） | 本次不动，单独 PR |
| `cli-convergence` Work 删 pool/daemon 死码 | commit 67dc7d9（2026-08-07） |

## changelog 历史

- `0-7-0-context-map-deprecation.md` — CONTEXT-MAP 退役
- `0-7-0-inv2-revision.md` — Inv2 语义修订
- `0-7-0-rfc-adr-historical-convergence.md` — RFC/ADR 历史溯源收敛
- `0-7-0-version-iteration-redesign.md` — RFC-0026 Domain 落地
- `0-7-0-rfc-0026-cli-execution.md` — **本 changelog**