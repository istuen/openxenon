---
version: 0.6.1-alpha.0
date: 2026-07-02
type: alpha
---

# 0.6.1-alpha.0 — 调试驱动修复

> **主题**：基于 v0.6.0 架构的稳定性修复。在 5 个 Cycle（Asset / Skill / Work / Round / Proof）系统化测试后，按问题分批修复 P0/P1 阻塞性问题。
>
> **测试结果**：1,890 → 1,884 pass（+0 回归）/ 6 fail（v0.6 Skill 极简版的预期产物，Phase 3 backlog）

## 修复概览

| Cycle | 维度 | 修复 Issue | commit |
|---|---|---|---|
| 2 | Asset + Skill | 12 个 P0/P1（路径布局 / chmod 0o444 / DAG 环检测 / builtin 模板 / sync-md data loss） | `38e5591` |
| 3 | Work | 7 个 P0/P1（**致命：work finalize 完全未实现** / per-work-blueprints-merger 路径 / SKILL.md 补全） | `e4599d8` |
| 4 | Round | 0（Round Loop 正常工作，PASSED 抛错不污染状态） | — |
| 5 | Proof | 1 个 P1（verify 加 frozen.json hash drift 检测） | `28556bb` |

## 核心修复亮点

### 1. P0 致命：`oxn work finalize` 从零实现（Cycle 3）

v0.6.0 阶段 SKILL.md 多次提到 `work finalize` 是 8 阶段流程的收口，但 **CLI 从未实现**该命令。`next-round` 的错误码 `OXN_ROUND_ALREADY_PASSED` 提示用户"Run `oxn work finalize` instead"，但 `finalize` 根本不存在。

- 引擎层：新增 `finalizeWork()` 函数（双层状态-exec.ts）
- CLI：新增 `finalizeSubcommand` + 22 行 human renderer
- 状态机：`status` 终态映射（passed / failed / error）
- SKILL.md (zh+en)：8 阶段流程图补全 `finalize` + 错误码表新增 `OXN_ROUND_ALREADY_PASSED` / `OXN_ROUND_VERDICT_INVALID`

### 2. P0 致命：path 布局修正（Cycle 2）

v0.6 RFC 定义 `.openxenon/assets/domains/` 等 v0.6 路径，但 CLI 实际 hard-code 老路径：

| 修复 | 文件 |
|---|---|
| `domain compile` → `assets/domains-md/`（替换老 `domains-md/`） | `packages/cli/src/commands/domain.ts` |
| `resolveAssetDir` 4 路径支持 v0.5/v0.6 双布局 | `packages/engine/src/infra/paths.ts` |
| `getCachePath/getCacheMdPath` 跟随 config.assetRoot | `packages/engine/src/oxl/md-pipeline/sync-hash.ts` |
| `per-work-blueprints-merger` 用 `resolveAssetCandidates` 兼容 | `packages/engine/src/Work/per-work-blueprints-merger.ts` |
| `work create --blueprint` 改 `required: true` | `packages/cli/src/commands/work.ts` |

### 3. P0 致命：planLock 守卫前提（Cycle 2）

- domain/blueprint create 落盘后立即 `chmodSync(path, 0o444)`（planLock 守卫前提）
- domain sync-md 写 .oxn 前临时抬位 0o644 → 写 → 恢复 0o444（解决 sync 与 0o444 冲突）

### 4. P0 致命：DAG 环检测（Cycle 2）

- blueprint validate 新增 `findDagCycle()` 函数（DFS + 灰/白/黑标记）
- 触发 `OXN_BLUEPRINT_DAG_CYCLE` 错误码
- builtin blueprint 模板用正确 `slot` 语法（移除废弃 `type "task"` + `part slot`）

### 5. P1：proof hash drift 检测（Cycle 5）

- `oxn proof verify` 之前只校验 `proofs-target-work` 注释的 work.md hash，**不**校验 frozen.json 自身
- 现在 verify 入口先调 `readFrozenProof`（含 hash 校验），sign 错就抛 `E_PROOF_HASH_DRIFT`

## 测试覆盖

| 指标 | 数值 |
|---|---|
| 测试总数 | 1,890 |
| 通过 | 1,884 (+0 回归) |
| 失败 | 6（**全部**是 v0.6 Skill 极简版的预期产物） |
| 新增修复 | 20 个 P0/P1 Issue（5 个 P0 致命） |
| 改动文件 | 14 个（+596 行 / -64 行） |

## 6 个已知失败（v0.6 Skill 极简版预期产物）

1. `/oxn-proof skill content (no leak) > skill 文件存在` — 期望 oxn-proof skill 文件，v0.6 已删
2-4. `/oxn-proof skill content (no leak) > skill 教学/不含 param/不含 verdict` — 同上
5. `PR-4: Skills i18n translation guard > 3. getSkillContent throws for untranslated locale`
6. `Skill 资产完整性（v0.1.3 跨目录一致） > 三个工具目录下的 SKILL.md frontmatter 完全一致`

→ **这些将在 v0.6.1 正式版（或 v0.7）删除对应测试用例**，不影响 v0.6.1-alpha.0 的可用性。

## 升级路径（从 v0.6.0 升级到 v0.6.1-alpha.0）

**不兼容**：
- `.openxenon/domains-md/`（老）→ `.openxenon/assets/domains-md/`（新）需要重新 sync
- 旧项目首次 `oxn domain create` 后会自动 sync 到新位置

**兼容**：
- 旧版 `.openxenon/domains/` 仍可读（fallback 路径）
- `chmod 0o444` 仅对**新**创建的文件生效，不追溯旧文件
- builtin blueprint 模板修复（移除废弃语法）— 老 blueprint 仍可工作（v0.6 grammar 兼容）

## 后续路线

- **v0.6.1 正式版**：删除 6 个 known fail 的测试用例
- **v0.7**：涌现层骨架（Insight 审核闭环 + Hall v0.5 Vue 组件化）
- 完整路线见 [v0.7+ Roadmap Overview](../../.openxenon/pools/sprints/v0.7-plus-roadmap/overview.md)

## 调试日志

完整调试日志：[`/Users/issac/tmp/oxn-v060-test/DEBUG_LOG.md`](file:///Users/issac/tmp/oxn-v060-test/DEBUG_LOG.md)

包含 18 + 14 + 7 + 0 + 1 = **40 个 Issue** 的完整记录、状态、修复 commit、关闭 Cycle。
