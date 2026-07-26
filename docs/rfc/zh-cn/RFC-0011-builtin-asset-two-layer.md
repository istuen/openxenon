---
entity: rfc
id: RFC-0011
theme: builtin-asset-two-layer
version: 1.0.0
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - .openxenon/drafts/rfc-migration-master-plan.md
  - F1/F2/F3: OxnBuiltinRegistry 三 SSOT 不一致 + scope 绕过 + stale path
synced-at: 2026-07-26
---

# RFC-0011: 内置 Asset 两层机制——`@oxn/` fallback + `@prj/` override

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：builtin-asset-two-layer
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **来源**：2026-07-25 grilling session #6（与 user 协作）+ v0.7 探索发现
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

Builtin Asset（`@oxn/` scope，编译时内置）与 Project Asset（`@prj/` scope，`.openxenon/assets/`）两层覆盖——后者优先。v0.6.1 发现 `OxnBuiltinRegistry` mock（4 probes + 3 phantom parts）与 `src/builtin/probes/*.md`（15 文件）+ `catalog.ts`（15 probes）三 SSOT 不一致，Phase 4 收窄修复范围（仅 probes + blueprints）。D18 延后 domains + workflows builtin 落地。

## 决策要点

### D1：两层覆盖机制

| 层 | scope | 物理位置 | 创建方式 | 优先级 |
|---|---|---|---|---|
| **Built-in Asset** | `@oxn/` | `src/builtin/`（OXN 仓库内） | 自举种子（手动创建） | 低（fallback） |
| **Project Asset** | `@prj/` | `.openxenon/assets/`（项目工作台） | 走 Work 流转 | 高（override） |

解析顺序：`@prj/` override > `@oxn/` fallback。项目可 fork builtin 到 project 层变可编辑。

### D2：`OxnBuiltinRegistry` 重写（Phase 4 范围收窄）

v0.6.1 三 SSOT 不一致（catalog.ts 15 probes + .md 15 probes + Registry mock 4 probes + 3 phantom parts）。Phase 4 修复：

- `_initProbes()` 改为从 `src/builtin/probes/*.md` 加载（mdast pipeline）
- `_initBlueprints()` 改为从 `src/builtin/blueprints/*.md` 加载
- 删除 3 phantom parts（无 .md 文件）
- 补齐 11 个缺失 probes（`ts-compiles`, `lint-check`, `git-branch-exists`, `http-responds`, `git-clean`, `deps-resolved`, `file-exports`, `fs-parseable`, `git-merge-feasible`, `test-pass`, `git-status-clean`）

### D3：D18 延后范围

| 范围 | Phase 4 处理 | 延后落地 |
|---|---|---|
| probes | ✅ 修复 | — |
| blueprints | ✅ 修复 | — |
| domains | ❌ 延后 | RFC-0011 记录，后续探索 |
| workflows | ❌ 延后 | RFC-0011 记录，后续探索 |

`oxn init --starter` flag（拷贝 builtin 到 `.openxenon/assets/`）也属延后范畴。

### D4：`@oxn/` scope 行为

`@oxn/` scope 绕过文件系统——`getScopeRoot('oxn')` 返回 null，只查内存 registry。这意味着：

- builtin 资产编译时打包进 OXN 二进制，不读硬盘
- 解析 `@oxn/probe/ts-compiles` 直接命中内存 registry
- 项目 override `@prj/probe/ts-compiles` 优先

### D5：Stale path 修复（Phase 4 顺手）

`oxn-scope.ts` 内 `.openxenon/arsenals/` 路径 stale（实际是 `.openxenon/assets/`，有 `TODO(v1.1-path)` 标记）——Phase 4 一并修复。

## 影响范围

- ✅ 19 个 builtin probes+blueprints 修复（4→15 probes + 0→3 blueprints）
- ✅ 3 phantom parts 删除
- ✅ `builtin-assets-md.test.ts` 测试守卫扩展
- 📝 domains + workflows builtin 延后（v0.8+）
- 📝 `oxn init --starter` flag 延后
- 📝 `oxn-scope.ts` stale path 顺手修复

## 相关术语

- [Built-in Asset](/glossary/zh-cn/project-terms.html#built-in-asset) — `@oxn/` scope 解析目标
- [Starter Asset](/glossary/zh-cn/project-terms.html#starter-asset) — `--starter` flag 拷贝产物
- [Asset](/glossary/zh-cn/asset-terms.html#asset) — E1 静态边界
- [Probe](/glossary/zh-cn/proof-terms.html#probe) — 内置 15 个

## 相关决策

- [.openxenon/drafts/rfc-migration-master-plan.md](../../.openxenon/drafts/rfc-migration-master-plan.md) — D8 + D14 + D18 锁定本机制
- [RFC-0009](./RFC-0009-doc-three-modalities.md) — 文档三情态分离（meta）
- [RFC-0010](./RFC-0010-frozen-errata.md) — RFC frozen+errata 演进策略（meta）
- [RFC-0012](./RFC-0012-bootstrap-exemption.md) — 自举种子豁免（meta）
- Phase 4 工作：`packages/engine/src/oxl/scope/oxn-builtin-registry.ts` 重写

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-0011 Accepted 起冻结。