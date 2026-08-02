---
version: 0.6.2-alpha.3
prerelease: alpha
date: 2026-08-02
type: feature
scope: draft-promote-routing
status: pending
---

# 0.6.2-alpha.3: Draft Promote 路由(OXN 形式管理 Draft 生命周期)

## 主题

v0.6.2 起 Draft 用 4 命令(create/list/archive/discard)管理,但 Promote 路径走 `oxn work create --blueprint X`(工程师手动拼装)。
v0.6.2-alpha.3 起用 **OXN 形式**(Blueprint + Domain + Workflow)管理 Draft 生命周期:

- 新 2 命令(promote / retarget)+ --target/--kind 参数;
- 4 阶段生命周期(gather → select-target → validate → dispatch-target)走 draft-promote-router Blueprint;
- 7 个 skeleton 模板驱动 promote-target-aware-workflow 的 target-aware dispatch;
- 兼容 v0.6.2 空白模式(默认无 --target)。

## 范围

### 新增 Asset(local-only,匹配现有约定)

- `domains/oxn-draft-promote-domain.md` v0.1.0 — Promote 路由领域
- `domains/oxn-draft-domain.md` v0.2.0 — Draft 概念边界(增 3 Term / 2 Ban / 2 Invariant)
- `workflows/draft-skeleton-fork.md` v0.1.0 — Skeleton 派生 Workflow
- `blueprints/draft-promote-router.md` v0.1.0 — Layer 1 总路由 Blueprint
- `blueprints/promote-target-aware-workflow.md` v0.1.0 — Layer 2 通用 Promote Blueprint (合并 4 → 1)
- `stacks/draft-promote-tooling.md` v0.1.0 — Promote 工具栈
- `blueprints/draft-skeletons/{rfc,asset-domain,asset-workflow,asset-stack,asset-blueprint,asset-roadmap,work}.md` — 7 skeleton 模板

### 归档 4 旧 Promote Blueprint

- `blueprints/doc-rfc-workflow.md` → `.archived/`
- `blueprints/asset-workflow.md` → `.archived/`
- `blueprints/doc-dev-workflow.md` → `.archived/`
- `blueprints/doc-prod-workflow.md` → `.archived/`

理由:Promote 路由统一走 draft-promote-router + promote-target-aware-workflow(1 件代替 4 件)。

### 新增 Engine 模块

- `packages/engine/src/Draft/skeleton.ts` — forkDraftSkeleton + DRAFT_TARGETS + ASSET_KINDS
- `packages/engine/src/Draft/promote.ts` — promoteDraft 4 阶段路由
- `packages/engine/src/Draft/retarget.ts` — retargetDraft 保留工程师内容
- `packages/engine/src/Draft/index.ts` — createDraft 增 --target/--kind 派生

### 新增 CLI 子命令

- `oxn draft create <name> --target <rfc|asset|work> [--kind <5 AssetKind>]`
- `oxn draft promote <name> [--target auto|<rfc|asset|work>] [--archive-after]`
- `oxn draft retarget <name> --new-target <rfc|asset|work> [--new-kind <5 AssetKind>]`

### 新增测试(33 件)

- `packages/engine/src/Draft/__tests__/skeleton.test.ts` — 12 测
- `packages/engine/src/Draft/__tests__/promote.test.ts` — 14 测
- `packages/engine/src/Draft/__tests__/retarget.test.ts` — 7 测

### 新增 9 个错误码

- `OXN_DRAFT_TARGET_INVALID` / `OXN_DRAFT_KIND_REQUIRED` / `OXN_DRAFT_KIND_INVALID`
- `OXN_DRAFT_SKELETON_NOT_FOUND` / `OXN_DRAFT_FRONTMATTER_INVALID`
- `OXN_DRAFT_PROMOTE_TARGET_MISSING` / `OXN_DRAFT_PROMOTE_TARGET_UNKNOWN`
- `OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH` / `OXN_DRAFT_PROMOTE_VALIDATE_FAILED`

### 文档同步

- `packages/cli/src/skills/locales/zh-CN/oxn-draft/instruction.md` — 6 命令(增 promote/retarget)+ --target/--kind
- `packages/cli/src/skills/locales/en/oxn-draft/instruction.md` — 英文版同步
- `packages/cli/src/skills/locales/zh-CN/oxn-draft/references/draft-lifecycle.md` — 增 §8 promote/retarget 详解
- `docs/product/zh-cn/concepts/glossary.md` — 增 6 Term(DraftTarget / DraftSkeleton / DraftPromoteLifecycle / PromoteRoute / PromoteLifecycle / TargetDispatchTable)
- `packages/engine/src/infra/probes/boundary-guard.ts` — OXN_BUILTIN_DOMAINS_FALLBACK 9 → 10 项

## 不破坏

- v0.6.2 4 命令(create / list / archive / discard)行为不变
- CLI `oxn work create --blueprint X` 直拼路径仍可用(不强制走 draft-promote-router)
- 4 旧 Promote Blueprint 归档但保留文件,工程师可手动 reference

## 不实现(明确推迟)

- AI Agent 自动推断 promote-target(基于内容关键字)→ v0.7.x
- 多人协同 Draft(lock / concurrent edit / merge)→ v0.7.x
- Promote 时自动生成 changelog 段(与 .changes/ 集成)→ v0.7.x
- Per-target Probe(rfc-promote-hook / asset-promote-hook)→ v0.7.x
- 跟踪 `.openxenon/assets/` 到 git(team governance 决策)→ 待 RFC

## 概念变化

- **Draft 不是 AssetKind 6** — Draft 仍走独立 4+2 命令,不入 Asset 5 类型
- **Draft 不走 Asset Lifecycle** — Draft ≠ Asset;各自独立的生命周期
- **Draft 可选 frontmatter** — `--target` 模式可选派生(替代 v0.6.2 强空白)
- **Promote 4 阶段** — gather → select-target → validate → dispatch-target 顺序强制
- **Promote 不分 IAP** — 单次 transactional,不分 Intent / Align / Proof
- **Promote 后源 Draft 不变** — 工程师决定 archive / discard
- **retarget 显式** — 不允许直接编辑 frontmatter 改 promote-target

## 关联文档

- `.openxenon/assets/domains/oxn-draft-domain.md` v0.2.0
- `.openxenon/assets/domains/oxn-draft-promote-domain.md` v0.1.0
- `.openxenon/assets/blueprints/draft-promote-router.md` v0.1.0
- `.openxenon/assets/blueprints/promote-target-aware-workflow.md` v0.1.0
- `.openxenon/assets/workflows/draft-skeleton-fork.md` v0.1.0
- `.openxenon/assets/stacks/draft-promote-tooling.md` v0.1.0
- `.openxenon/assets/blueprints/draft-skeletons/*` (7 件)

## 测试统计

| 阶段 | 累计 |
|---|---|
| v0.6.2-alpha.2 | 1622 pass |
| v0.6.2-alpha.3 | + 33 (P4 新增) |
| v0.6.2-alpha.3 总 | 1864 pass / 0 fail / 3 skip |
