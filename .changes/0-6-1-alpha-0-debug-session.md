version: 0.6.1-alpha.0
date: 2026-07-03
type: alpha
---

# 0.6.1-alpha.0 — Debug Session 收口

> **主题**：本 session 收口 v0.6.1-alpha.0 调试发现的剩余 4 主题 + DEBUG_LOG 状态同步。
> 上一个 commit (`f7da1eb`) 修了 8 issues；本 session 补 1 新 issue + 同步 23 个陈旧状态 + 加 1 wontfix。

## 修复概览

| ID | 维度 | 严重度 | 描述 | 状态 |
|---|---|---|---|---|
| **#1-16** | Asset | P2 | `domains-md/.cache/*.hash` 散落文件缺少清理机制 | **fixed** (本次) |
| #1-17 | Asset | P2 | `oxn domain list --builtin` 不识别 `--builtin` flag | **wontfix** (本次：v0.6 RFC 未要求 builtin domain registry) |

## DEBUG_LOG 状态列同步（24 issues）

DEBUG_LOG.md 在 v0.6.1-alpha.0 调试期间记录了 41 issues。Cycle 2-5 实际已修但状态列未同步，本 session 统一 update：

**Cycle 1 标 open → 实际 fixed（10 issues）：**
- #1-2/4/9/10/11/12/13/15 → `38e5591`
- #1-14/18 → `f7da1eb`

**Cycle 2 标 open → 实际 fixed（10 issues）：**
- #2-1/3/6 → `f7da1eb`（SSOT `.opencode/skills/oxn-work/SKILL.md` 200 行版已无 oxn-cli 引用）
- #2-2/5/12/13/14 → `e4599d8`（work finalize + 8 阶段 + 错误码）
- #2-8 → `38e5591`
- #2-9 → `f7da1eb`

**Cycle 3 标 open → 实际 fixed（4 issues）：**
- #3-1/6/7 → `e4599d8`
- #3-2 → `38e5591` + `f7da1eb`

## 新增功能：`oxn domain cache clean`

`oxn domain cache clean [--dry-run]` 子命令 — 清理 `.openxenon/assets/domains/.cache/*.hash` 与 `.cache/*.md-hash`（Phase 1 / Phase 2 同步缓存）。

**引擎层**（`packages/engine/src/oxl/md-pipeline/sync-hash.ts`）：
- 新增 `clearCacheForEntity(rootDir, entity)` helper — 删 `.cache/` 下所有 `.hash` / `.md-hash` 文件（保留目录本身，下次 sync 复用）
- 路径与 `getCachePath` / `getCacheMdPath` 完全一致（work → `.openxenon/works/.cache/`，domain/blueprint → `{assetRoot}/{plural}/.cache/`）

**CLI 层**（`packages/cli/src/commands/domain.ts`）：
- 新增 `domainCacheSubcommand` (parent) + `domainCacheCleanSubcommand` (child)
- `--dry-run` flag：列出待删但不实际删
- `--json` / `--yaml` 输出格式
- 输出包含 `removed`, `cacheDir`, `paths[]` 字段

**i18n**（`packages/engine/src/infra/i18n/{zh-CN,en}.json`）：
- 新增 `domain.cache.description` + `domain.cache.clean.{description,dryRun}`

**测试**（`packages/cli/src/__tests__/domain-cache-clean-e2e.test.ts`）：5 个 e2e test：
1. basic：删 `.cache/*.hash` + `*.md-hash` 但保留 `.oxn`
2. idempotent：第二次 clean → 0 removed 无错
3. empty：无 `.cache/` 目录 → 返 "No domain cache to clean"
4. dry-run：列出但删除 `.hash` 文件
5. 多 domain：一次清多个域 cache

## 验证

- `bun run typecheck`: pass
- `bun test`: **1902 pass / 0 fail** (143 files, 118.63s)
- `bun run lint`: pass (2 pre-existing warnings, 0 errors)
- `bun run check` (biome): pass (484 files)
- `bun run format`: pass

## 关联 Commits

- `f7da1eb` fix(v0.6.1-alpha.0): debug-driven 8-issue 收口
- **(本 session)** fix(v0.6.1-alpha.0): 实现 oxn domain cache clean + 同步 DEBUG_LOG 状态列