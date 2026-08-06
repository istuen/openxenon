---
version: 0.6.4
prerelease: alpha.0
date: 2026-08-06
type: release-notes
scope: 0-6-4-context-template
status: draft
---

# 0.6.4-alpha.0 — Blueprint Context Template + Scope + PlanLock 5-hash

> **状态**：🟡 **Draft**（Work `blueprint-context-template` + `implement-context-template-v1` 都走完 IAP 闭环；待 promote）
> **来源**：2026-08-06 grilling session（domain-modeling skill）
> **关联 Draft**：`.openxenon/drafts/design-blueprint-context-template.md`
> **总测试**：2114 pass / 0 fail / 0 skip（165 files）

## 主题

**Blueprint = 上下文工程元结构**。Work 不再依赖 AI Agent 自己拼上下文；Blueprint 显式声明 Scope + Context Template，AI Agent 按 Goal 从 Blueprint 引用的 Assets 提取相关术语，写入 PlanLock 保护的 context.md / tasks/*/context.md。

## 关键变更

### 🆕 新增

| 特性 | 来源 | 落地文件 |
|---|---|---|
| Blueprint `## Scope` 段 | 设计稿 §2.1 | `.openxenon/assets/blueprints/*.md` (4 个迁移) + `draft-skeletons/asset-blueprint.md` |
| Blueprint `## Context Template` 段 | 设计稿 §2.7 | 同上 |
| PlanLock 5-hash 扩展 | 设计稿 §2.4 | `packages/engine/src/Work/plan-hash.ts` + `birth-cert.ts` |
| Scope 校验（lock-time） | 设计稿 §2.5 | `packages/engine/src/Asset/scope-matcher.ts` 🆕 + `work-validator.ts` |
| `oxn work inject` 3-flag 子命令 | 设计稿 §2.6 | `packages/cli/src/commands/work.ts` |
| `Task ## Artifacts` 段解析 | 设计稿 §2.5 | `packages/engine/src/oxl/summary-extractors.ts` |
| Skill 注入指令更新 | 设计稿 §6 | `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md` |

### 📝 修订

| 修订 | 来源 | 落地文件 |
|---|---|---|
| PlanLock 5-hash（新字段 optional 向后兼容） | 设计稿 §2.4 | `birth-cert.ts` PlanLockSchema + applyPlanLock + verifyPlanLock |
| Domain 新增 6 Terms + 4 Invariants | 设计稿 §5 | `oxn-work-domain.md` |
| Domain 新增 2 Invariants | 设计稿 §5 | `oxn-asset-domain.md` |
| Domain 改名：context.md → memory.md | 设计稿 §5.2 | `oxn-work-domain.md` (实体重命名，ADR-0049 引用更新) |
| 4 个 Blueprint 补 ## Scope + ## Context Template | 设计稿 Phase 5 | `oxn-blueprint.md` / `bug-fix-blueprint.md` / `promote-target-aware-workflow.md` / `draft-promote-router.md` |

### 🔧 新错误码

| Code | 触发 | AI 响应 |
|---|---|---|
| `OXN_INTENT_CONTEXT_MISSING` | lock 时 context.md 不存在 | 先写 `works/<name>/context.md` 再 lock |
| `OXN_INTENT_SCOPE_VIOLATION` | Task Artifact 越界 Scope | 修正 Task `## Artifacts` 段（不能改 Blueprint Scope） |

### ⚠️ 兼容性

- PlanLock 3-hash 旧 `.work` 文件仍可读（向后兼容）；`workContextHash` + `taskContextsHash` 为 optional
- `lock-time` 强制 context.md 存在 — 新 Work 必须先写
- `OXN_INTENT_SCOPE_VIOLATION` 不阻断 unlock + re-edit 流程

## 架构决策

| 决策 | 选择 | 理由 |
|---|---|---|
| PlanLock 5-hash 而非 6-hash | 5 | task memory.md 不入 PlanLock（动态），work memory.md 不入 |
| Scope 校验时机 | lock-time | 不新增 Probe；与现有 `unresolved refs` 校验同构 |
| Blueprint 是否复制 Asset 内容 | 不复制（仅声明 refs） | 避免 inv-26 违反（Domain 与 Blueprint 互不写内容） |
| Context Template 默认值 | Engine 内置默认（基于 Use refs + Boundaries + Goal 推导） | Blueprint 可覆写 |
| CLI 注入格式 | Markdown（非 JSON） | 语义内容 LLM 原生格式；JSON 仅路径元数据 |
| memory.md 实现 | Phase 2 | 当前 `oxn work inject --memory` 返回 null + 提示 |
| `--paths` JSON key 命名 | snake_case (work_md / context_md / memory_md) | 与项目其他 JSON 约定一致 |

## 测试覆盖

```
+ packages/engine/src/Asset/__tests__/scope-matcher.test.ts    (13 tests)
+ packages/engine/src/Work/__tests__/plan-hash-5hash.test.ts   (8 tests)
~ packages/engine/src/Work/__tests__/plan-hash.test.ts          (5-hash 现实修正)
~ packages/engine/src/Work/__tests__/birth-cert.test.ts         (fixture 加新字段)
~ packages/engine/src/Work/__tests__/work-validator-dag.test.ts    (新 schema 字段)
~ packages/engine/src/Work/__tests__/work-validator-boundary.test.ts (新 schema 字段)
~ packages/cli/src/__tests__/e2e/work-ideal-data-flow-e2e.test.ts    (fixture 加 context.md)
```

## Guard 验证

```
✅ bun run typecheck                (0 errors)
✅ bun run check (biome)            (0 errors, 10 files auto-fixed)
✅ bun run lint (eslint)            (passed)
✅ bun test                          (2114 pass, 0 fail)
✅ check-doc-boundary.ts             (0 violations)
✅ check-heading-skeleton.ts         (passed)
✅ validate-dependencies.ts          (0 violations)
✅ sync-domain-glossary.ts --write   (auto-injected glossary-ref to 9 Domain files)
```

## Work 链路

```
blueprint-context-template  (Design Draft 落盘 + Domain 更新 + skeleton + Skill)
  → IAP: create → add-task → validate → lock → run → submit×2 → finalize

implement-context-template-v1 (Engine + CLI 实施 + Blueprint 迁移 + 测试)
  → IAP: create → add-task → validate → lock → run → submit×2 → finalize
  → Final outcome: DEVIATED
```

## Phase 2 待办（Draft §6）

- [ ] `memory.md` 实际实现（Round 切换时由 AI Agent 追加 Loop History + Observations）
- [ ] Engine 内置默认 Context Template 推导逻辑
- [ ] `oxn work inject --memory` 返回真实 memory.md 内容
- [ ] 现有 Blueprint 通过新版本（`oxn asset evolve`）正式迁移，不破坏引用方
- [ ] promote Draft → RFC-XXXX-context-template
- [ ] ADR-XXXX 记录 5-hash schema 迁移路径