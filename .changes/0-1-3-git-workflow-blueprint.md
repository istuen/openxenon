---
categories:
  - Added
---

- **Added** `.openxenon/blueprints/git-workflow.oxn`：独立 Blueprint 3-slot DAG（`prepare-workspace` → `precommit` → `finalize`），被 Work 编排层选择性插入到任何主 Blueprint 前后。**OXN 永远不替人 commit/merge**——finalize 槽位只产出 merge 可行性证据。
- **Added** `src/infra/git/workspace.ts`（L1-Infra）：git adapter，封装 `git status` / `rev-parse` / `merge-base` / `merge-tree --write-tree` / `worktree add|remove` 等命令。提供 `checkMergeFeasibility()` 用 `git merge-tree` 算法（纯观察，不修改 working tree/index/refs）计算 5 种 `MergeFeasibility`：can_ff_merge / can_merge_clean / has_conflicts / dirty_worktree / unknown。
- **Added** `src/infra/git/__tests__/workspace.test.ts`：24 个真 git repo 测试覆盖 `runGit` / `isWorkingTreeClean` / `branchExists` / `createWorkBranch` / `createWorktree` / `removeWorktree` / `listWorktrees` / `checkMergeFeasibility` 5 个核心场景（can_ff_merge / can_merge_clean / has_conflicts / dirty_worktree / unknown）+ `parseConflictFiles` 兼容 git 2.38+ 真实输出。
- **Added** 4 个 v1.2 builtin probes：`git-clean` / `git-branch-exists` / `git-status-clean` / `git-merge-feasible`。Infra 实现在 `src/infra/probes/{git-clean,git-branch-exists,git-status-clean,git-merge-feasible}.ts`；Kernel verdict 纯函数在 `src/kernel/verdicts/verdict.ts`；catalog entry 在 `src/kernel/verdicts/catalog.ts`（11→15 builtin）。
- **Added** `src/work/state.ts` 新增 `GitWorkspaceSchema` + `MergeFeasibilitySchema`（嵌入 `WorkStateSchema.gitWorkspace`）：记录 `strategy` / `workBranch` / `worktreePath` / `mergeFeasibility` / `conflictFiles` / `finalizedAt` / `failedBranch`。**PoC 哲学**：OXN 失败时保留 `failedBranch` 字段让工程师决定 cherry-pick / 删 / 重跑。
- **Added** `.openxenon/works/poc-git-isolation/work.oxn`：3-task + deps 编排（`git-prepare` 绑 git-workflow → `do-refactor` 绑 refactor-safe → `git-finalize` 绑 git-workflow），演示**Blueprint 是约束模板 + Work 编排层选择性使用 slot**——跳过 precommit（refactor-safe 的 verify slot 已含 lint+typecheck）。
- **Updated** `src/kernel/contracts/probe-port.ts`：`PROBE_STRATEGY_MAPPINGS` 新增 4 条 git-* 映射。
- **Updated** `src/infra/probes/index.ts`：注册 4 个 handler + alias + re-export。
- **Updated** `tests/integration/probe-catalog.test.ts`：catalog 11→15 builtin 列表更新。
- **Updated** `docs/reference/probe-types.md`：4 个新 builtin probe 文档（参数表 + 判定映射表）。
- **Note** PoC 阶段不实现 push / PR / auto-merge（属 P1 范围，v0.1 不引入外部副作用）。Work 状态机 / grammar 不动——v0.1 现有语法已支持 `task.blueprint: string` 单值 + `task.deps` 串 DAG 编排。
- **Note** `auto_merge` prop 方案经 3 轮分析（**OXN 永远不替人 merge**）后彻底删除。冲突场景由 `git-merge-feasible` probe 产出 `has_conflicts` verdict + 冲突文件列表，让工程师手动 resolve。
