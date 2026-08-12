---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-11
type: fix
scope: builtin-skeleton-templates-goal
status: pending
---

# 0.7.0-alpha.0: 修复 goal.md skeleton 未进 BUILTIN_SKELETON_TEMPLATES

> 来源：v0.7.0 RFC-0026 CLI 物理实现落地后的已知遗留（commit c2211c2 §已知遗留）
> 关联：[0-7-0-rfc-0026-cli-execution.md](./0-7-0-rfc-0026-cli-execution.md) + [0-7-0-version-iteration-redesign.md](./0-7-0-version-iteration-redesign.md)

## 摘要

修复 v0.6.3 Fix #1 后遗留的 `goal.md` skeleton 缺失问题：`packages/cli/src/init/builtin-skeleton-templates.ts` 的 `BUILTIN_SKELETON_TEMPLATES` 数组从 v0.6.2-alpha.3 起只列 7 项（rfc + 5 assets + work），漏了仓库 `.openxenon/draft-skeletons/goal.md`（实际 v0.5.0 D2 起就已存在）。导致 `oxn init` 后 `oxn draft create --target goal --goal-slug <s>` 报 `OXN_DRAFT_SKELETON_NOT_FOUND`，需手动 `cp` 才能工作。

## 问题回顾

### 当前状态（修复前）

```
$ oxn init
# 落地 7 skeleton 模板到 .openxenon/draft-skeletons/
$ ls .openxenon/draft-skeletons/
asset-assetmap.md
asset-blueprint.md
asset-domain.md
asset-stack.md
asset-workflow.md
rfc.md          # ← rfc
work.md         # ← work
                ← goal.md MISSING（仓库有但 oxn init 不写）
```

### 用户痛点

```bash
$ oxn draft create test-goal --target goal --goal-slug my-goal
{
  "ok": false,
  "error": {
    "code": "OXN_DRAFT_SKELETON_NOT_FOUND",
    "message": "Skeleton template not found at /.../.openxenon/draft-skeletons/goal.md"
  }
}
```

**绕过**：手动 `cp .openxenon/draft-skeletons/goal.md <project>/.openxenon/draft-skeletons/`。

**根因**：`packages/cli/src/init/builtin-skeleton-templates.ts:272-280` 数组定义时漏了 `goal.md`（v0.5.0 D2 RFC-0026 D2 路径加进去的 `.openxenon/draft-skeletons/goal.md` 同步未进 `BUILTIN_SKELETON_TEMPLATES`）。

## 修复

### Step 1 · `builtin-skeleton-templates.ts` 加 `GOAL_SKELETON`

```typescript
const GOAL_SKELETON = `---
entity: skeleton
target-entity: goal
---

# Goal: <theme>

> Goal = IAP 准备阶段承诺单元；与 Work（IAP 执行）正交。
> v0.5.0 / D2 起由 \`oxn draft promote --target goal --goal-slug <slug>\` 从 Draft 派生（v0.7.0 RFC-0026 D2 落地）。

## Goal Frontmatter (派生后)

...
`

export const BUILTIN_SKELETON_TEMPLATES: readonly BuiltinSkeletonTemplate[] = [
  { filename: 'rfc.md', content: RFC_SKELETON },
  { filename: 'asset-domain.md', content: ASSET_DOMAIN_SKELETON },
  { filename: 'asset-workflow.md', content: ASSET_WORKFLOW_SKELETON },
  { filename: 'asset-stack.md', content: ASSET_STACK_SKELETON },
  { filename: 'asset-blueprint.md', content: ASSET_BLUEPRINT_SKELETON },
  { filename: 'asset-assetmap.md', content: ASSET_ASSETMAP_SKELETON },
  { filename: 'work.md', content: WORK_SKELETON },
  { filename: 'goal.md', content: GOAL_SKELETON }, // 🆕 v0.7.0 RFC-0026 D2
] as const
```

### Step 2 · 测试文件改 `长度 = 8` + 顺序加 `goal.md`

```typescript
test('1. 长度 = 8 (v0.7.0 RFC-0026 D2 加 goal.md)', () => {
  expect(BUILTIN_SKELETON_TEMPLATES).toHaveLength(8)
})

test('2. 顺序 = [rfc, asset-{5 kind}, work, goal]', () => {
  expect(BUILTIN_SKELETON_TEMPLATES.map((t) => t.filename)).toEqual([
    'rfc.md',
    'asset-domain.md',
    'asset-workflow.md',
    'asset-stack.md',
    'asset-blueprint.md',
    'asset-assetmap.md',
    'work.md',
    'goal.md', // 🆕 v0.7.0 RFC-0026 D2
  ])
})

// target-entity 值集合 + 'goal'
expect(['rfc', 'domain', 'workflow', 'stack', 'blueprint', 'assetmap', 'work', 'goal']).toContain(targetEntity)
```

### Step 3 · 注释/文档同步

| 文件 | 修改 |
|---|---|
| `packages/cli/src/init/builtin-skeleton-templates.ts` | JSDoc "7 模板" → "8 模板" + "v0.7.0 RFC-0026 D2 加 goal.md" |
| `packages/cli/src/commands/init.ts` | 注释 "落地 7 skeleton" → "落地 8 skeleton (v0.7.0 RFC-0026 D2 加 goal.md)" |
| `packages/cli/src/skills/locales/zh-CN/oxn-draft/references/draft-lifecycle.md` | "7 个 skeleton" → "8 个" + `--target` 列表加 `goal`；promote/retarget 命令示例加 `goal` |

## 验证

### 端到端（修复后）

```bash
$ rm -rf .openxenon && oxn init
# ✓ 落地 8 skeleton 模板到 .openxenon/draft-skeletons/
$ ls .openxenon/draft-skeletons/
asset-assetmap.md  asset-blueprint.md  asset-domain.md
asset-stack.md     asset-workflow.md  goal.md         ← 新增
rfc.md             work.md

$ oxn draft create test-goal --target goal --goal-slug my-goal
✓ Created draft: /.../.openxenon/drafts/test-goal.md

$ cat .openxenon/drafts/test-goal.md
---
entity: skeleton
target-entity: goal
promote-target: goal
created-from: asset-create@3.0.0-mode-skeleton
synced-at: 2026-08-12
---

# Goal: <theme>
...
```

### 单元测试

| 套件 | 状态 |
|---|---|
| `packages/cli/src/init/__tests__/builtin-skeleton-templates.test.ts` | ✅ 43/43（含长度=8 + 顺序 + target-entity 值集合） |
| `packages/cli/src/__tests__/e2e/draft-e2e.test.ts` | ✅ 39/39 |
| **合计** | **82/82 pass · 211 expect()** |

### 守门

| 守门 | 状态 |
|---|---|
| `bun scripts/check-asset-structure.ts` | ✅ 23/23 |
| `bun scripts/check-adr-landing.ts --enforce` | ✅ 全部通过 |
| `bun scripts/check-doc-boundary.ts` | ✅ 0 violations |
| `bun run typecheck` | ✅ 通过 |
| `pnpm exec biome check` | ✅ 无错误 |

## 落地清单

| # | 动作 | 文件 | 状态 |
|---|---|---|---|
| 1 | builtin-skeleton-templates.ts 加 GOAL_SKELETON 常量 | packages/cli/src/init/builtin-skeleton-templates.ts | ✅ |
| 2 | BUILTIN_SKELETON_TEMPLATES 数组加 goal.md | packages/cli/src/init/builtin-skeleton-templates.ts | ✅ |
| 3 | 测试改长度 8 + 顺序加 goal.md | packages/cli/src/init/__tests__/builtin-skeleton-templates.test.ts | ✅ |
| 4 | init.ts 注释 "7" → "8" | packages/cli/src/commands/init.ts | ✅ |
| 5 | Skill reference 文档同步（7→8 个 skeleton + --target 加 goal） | packages/cli/src/skills/locales/zh-CN/oxn-draft/references/draft-lifecycle.md | ✅ |
| 6 | 端到端验证 + 单元测试 | - | ✅ |

## 关联变更

| 关联项 | 处理 |
|---|---|
| `RFC-0026` D2 `--target goal` 升华路径 | commit c2211c2 已落（CLI 执行层） |
| `.openxenon/draft-skeletons/goal.md` | v0.5.0 D2 已存在（仓库源）；本次同步到 BUILTIN_SKELETON_TEMPLATES |
| `oxn-draft-domain.md` §DraftTarget D2 Theorem | commit 5ac8f1d 已落 |
| `oxn-cli-domain.md` §Goal axiom | commit 5ac8f1d 已落 |

## changelog 历史

- `0-7-0-context-map-deprecation.md` — CONTEXT-MAP 退役
- `0-7-0-inv2-revision.md` — Inv2 语义修订
- `0-7-0-rfc-adr-historical-convergence.md` — RFC/ADR 历史溯源收敛
- `0-7-0-version-iteration-redesign.md` — RFC-0026 Domain 落地
- `0-7-0-rfc-0026-cli-execution.md` — RFC-0026 CLI 执行层
- `0-7-0-builtin-skeleton-templates-goal.md` — **本 changelog**