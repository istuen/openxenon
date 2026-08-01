---
version: 0.6.2-alpha.1
date: 2026-07-27
type: alpha
status: planned
---

# 0.6.2-alpha.1 — 规划池迁移 + 术语新增 + RFC-0013 Accept

> 本 changelog 是 2026-07-27 可执行产出，版本号沿用 0.6.2-alpha prerelease。
> 6 项交付物全部落盘；Engine 闭环自证 + npm ship 是后续 alpha 迭代的目标。

## 核心改动

### 规划池（Planning Pool）迁移

- **新位置**：`dev/pool/` —— 前瞻性规划备选，无 version 字段
- **保留位置**：`dev/versions/` —— 已绑版本 Roadmap（version 必填）；**当前为空**
- **迁移**：`git mv` 5 个 v0.7.0+ 规划（emergence / asset-graph / ai-three-modes / anchor-slot / term-upstream-dag）+ frontmatter 转换（version → priority/theme）
- **新增 entry**：`engine-closure-self-verify.md`（critical）+ `npm-ship-path.md`（critical）
- **RFC-0013 Errata**：D3 补充 `dev/pool/` 作为 Roadmap 的前置状态（备选 → 已绑版本 两阶段）

### 术语新增（7 条）

| 术语 | 英文 | 权威源 |
|---|---|---|
| 自举完成 v2 | Bootstrapping Closure (v2) | `CONTEXT-MAP.md` + `oxn-engine-domain.md`（待补）|
| 规划池 | Planning Pool | `oxn-project-domain.md` + `dev/pool/README.md` |
| 单向 Blueprint 修复语义 | One-Shot Blueprint Fix Semantics | `oxn-proof-domain.md:inv-23` |
| 生命周期联动 | Lifecycle Linkage | `oxn-engine-domain.md`（待补）|
| Dev Version | Dev Version | `dev/pool/npm-ship-path.md` |
| Release Version | Release Version | `dev/pool/npm-ship-path.md` |
| 定义完成度 vs 实现完成度 | Definition vs Implementation Completeness | `CONTEXT-MAP.md` |

### Engine 域新增 invariant

- **`oxn-proof-domain.md:inv-23 probe-pass-implies-fixed`** —— 单向 Blueprint 修复语义：Probe=COMPLETED 即 fixed；DEVIATED → 工程师开新 Work（非 Blueprint retry）

### RFC-0013 Accept

- `status: Draft → Accepted`（frontmatter）
- Errata 2026-07-27：D3 补充规划池语义（PlanningPool → Roadmap 两阶段）

## 影响范围

- **测试**：未触及运行时代码，测试套件不变（1630 pass / 0 fail）
- **构建**：`bun run typecheck` / `bun test` / `bun run lint` / `bun scripts/validate-dependencies.ts` 需重跑验证
- **文档**：CONTEXT-MAP.md + oxn-project-domain.md + oxn-proof-domain.md + dev/pool/README.md + dev/versions/README.md + 5 个原 Roadmap 文件 + 2 个新 pool entry + RFC-0013 = **11 个 markdown 文件改动**
- **git 状态**：5 个 rename（dev/versions/0-X-Y-*.md → dev/pool/*.md）+ 多个 modify + 多个 untracked
- **不变量**：`oxn-engine-domain.md:inv-4 Monorepo 包边界`、`oxn-project-domain.md:inv-1 三情态分离`、`oxn-asset-domain.md:inv-15 kind-isolation` —— 全部保持

## 未落地（待后续 alpha 迭代）

- `oxn-engine-domain.md` 新增 `LifecycleLinkage` 术语（CONTEXT-MAP 已收，本域未收）
- `release-cut.md` 加 npm-publish-dry-run + npm-tag-check Probe（Block 3 in npm-ship-path.md）
- `oxn-proof-domain.md` builtin-probe-types 扩展（v0.1 范围需扩到 npm-*）
- Engine 闭环自证实际跑通（`engine-closure-self-verify.md`）
- npm ship 实际跑通（`npm-ship-path.md` 6 个 Block 全解锁）

## 关联文档

- `.openxenon/drafts/2026-07-27-grilling-session-output.md`（如未来落盘，本会话产出汇总）
- `dev/pool/engine-closure-self-verify.md` —— 后续 alpha 迭代目标 1
- `dev/pool/npm-ship-path.md` —— 后续 alpha 迭代目标 2
- `docs/rfc/zh-cn/RFC-0013-versioning-policy.md` —— Errata 2026-07-27
