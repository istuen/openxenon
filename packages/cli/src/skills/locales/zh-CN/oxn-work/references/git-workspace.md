# git 工作空间指引（v0.0.27+）

> 本文件是 `SKILL.md` 的按需加载补充。**仅在 git worktree 场景**下加载。
>
> 提示：`oxn-work` Skill 主流程不处理 git 场景；本子场景独立走 builtin `git-workflow` 蓝图。

## 核心边界

> **OXN 永远不替人 commit / push / merge**。它只观察并产出可合并性证据，让人类在 `git merge` 时消费。

## builtin `git-workflow` 蓝图

OXN 在 git worktree 场景下提供 builtin `git-workflow` 蓝图（`src/builtin/blueprints/git-workflow.oxn`），4 阶段 slot 全部对接 L1 git 适配器（`src/infra/git/workspace.ts`）+ 4 个 catalog 探针（`git-clean` / `git-branch-exists` / `git-status-clean` / `git-merge-feasible`）。

## 派生 builtin 蓝图（标准 cp 约定，v0.6 路径）

```bash
oxn init
# v0.6.1-alpha.0: builtin blueprint 派生路径与 v0.6 assets 布局对齐
mkdir -p .openxenon/assets/blueprints
cp src/builtin/blueprints/git-workflow.oxn .openxenon/assets/blueprints/git-workflow.oxn
chmod 644 .openxenon/assets/blueprints/git-workflow.oxn  # 0o444 锁态时手动解锁
oxn domain create ProgramContext          # 至少含 term: WorkingTree / Branch / MergeCommit
oxn blueprint validate git-workflow
```

## 与 work 8 阶段流程集成（v0.6.1-alpha.0：create 自动生成 task.oxn 骨架）

```bash
# v0.6.1-alpha.0 #3-3 修复：work create 自动为 blueprint 每个 slot 生成对应 tasks/<slot>/task.oxn 骨架
oxn work create gw-feat-x --blueprint git-workflow
# 创建后 .openxenon/works/gw-feat-x/ 下自动有：
#   work.oxn
#   tasks/init/task.oxn
#   tasks/build/task.oxn
#   tasks/verify/task.oxn
#   tasks/ship/task.oxn       (git-workflow 4 slots = 4 task.oxn 骨架)
# 只需编辑文件填 skill_context 等内容，**不必再手动 add-task**

# 也可手动补加（如果 work 跑完要再加 task）：
oxn work add-task gw-feat-x --task extra --blueprint git-workflow --domain ProgramContext

oxn work validate gw-feat-x --json
oxn work lock gw-feat-x --json
```

## 人工 git 操作（OXN 不参与）

```bash
git worktree add -b feat/gw-feat-x ../wt-feat-x
cd ../wt-feat-x && $EDITOR files && git add -A && git commit -m "feat: ..."
cd -
oxn work run gw-feat-x --json
oxn work submit gw-feat-x --task ship --json          # 4 次（4 part = 4 slot）
oxn work status gw-feat-x --json                       # overallStatus = passed
oxn work finalize gw-feat-x --json                     # ⚠️ RFC-0032 Phase 2 已删；改用 `oxn work submit --work <w> --task <t>` 完成 work
```

## 拿到可合并性证据（关键）

`oxn work context` 不暴露 `checkMergeFeasibility`（写工作空间 → 违反 OXN 不替人决策边界）。要拿到证据，**手工调探针**或读 L1 适配器：

```bash
# E2E 测试演示（src/cli/__tests__/work-git-workspace-e2e.test.ts）
#  调 checkMergeFeasibility(branch, 'main', worktreePath)：
#    → can_ff_merge / can_merge_clean / has_conflicts / dirty_worktree / unknown
```

## 不做的事

- ❌ `oxn work create --worktree`（方案 C，未实现）
- ❌ OXN 替人 commit / merge（哲学边界）
- ❌ 锁后漂移源 `.oxn`（不会触发 planLock — 锁的是 per-work slim 索引 `works/<w>/blueprints.json`）

## 进一步阅读

- 详细设计：`docs/architecture/git-workflow-workspace.md`
- 4 probe 注册：`src/kernel/verdicts/catalog.ts:390-491`
- L1 适配器：`src/infra/git/workspace.ts:1-317`
- E2E 端到端验证：`src/cli/__tests__/work-git-workspace-e2e.test.ts`
