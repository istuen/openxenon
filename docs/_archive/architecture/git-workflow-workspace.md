# git 工作空间（方案 B：OXN 不替人合并）

> 状态：v0.0.27+ 实验性
> 关联 Skill：`oxn-work`
> 关联资产：`src/builtin/blueprints/git-workflow.oxn`（builtin 蓝图）
> 关联探针：catalog 中 4 个 `git-*` probe（`src/kernel/verdicts/catalog.ts:390-491`）
> 关联适配器：`src/infra/git/workspace.ts:1-317`

## 1. 哲学

OXN 在 git 工作空间场景下的核心边界：

> **OXN 永远不替人 commit / push / merge**

它只回答两件事：
1. 当前 git 物理观测的**客观事实**（working tree 干净否？分支存在否？三路合并能成吗？）
2. 把这些事实**结构化**为 IAP verdict，让人类在 `git merge` 之前拿到可合并性证据。

这条边界写在 `src/infra/git/workspace.ts:1-17` 的文件头注里，**不是临时妥协**——是产品决策。`src/builtin/blueprints/git-workflow.oxn` 的 4 阶段都是"观察"或"行动占位"：

| Slot                  | 触发的探针                              | 阶段意义                           |
| --------------------- | --------------------------------------- | ---------------------------------- |
| `ensure_clean_workspace` | `git-clean` + `git-branch-exists`    | 入口守卫：tree 干净 + base 存在   |
| `prepare_branch`      | `git-status-clean`                      | 准备分支阶段再次确认状态           |
| `develop`             | —                                       | 工程师实施工作（AI 行动上下文）   |
| `verify_merge_feasible` | `git-merge-feasible`                  | 收尾：用 merge-tree 判定可合并性 |

## 2. 落地步骤（人工 + OXN 协作）

### 2.1 准备工作区（一次）

```bash
# 在 git 仓库根目录
oxn init                                                # 建 .openxenon/ 边界
cp src/builtin/blueprints/git-workflow.oxn \
   .openxenon/blueprints/git-workflow.oxn              # 派生 builtin 蓝图
oxn domain create ProgramContext                       # 建 git 域（term: WorkingTree / MergeCommit / Branch）
oxn blueprint validate git-workflow                    # 语法检查
```

### 2.2 建 Work + Task（v1.1 8 阶段流程）

```bash
oxn work create gw-feat-x --blueprint git-workflow
# 编辑 .openxenon/works/gw-feat-x/work.oxn（注入 context / domain ref / task 块）
oxn work add-task gw-feat-x --task ship --blueprint git-workflow --domain ProgramContext
# 编辑 tasks/ship/task.oxn（4 个 part 对应 4 个 slot；与 builtin 蓝图 1:1）
oxn work validate gw-feat-x --json                     # 写 .work 静态门禁卡
oxn work lock gw-feat-x --json                         # 锁 4 组件 hash
```

### 2.3 人工 git 操作（OXN 不参与）

```bash
# 1) 建 worktree
git worktree add -b feat/gw-feat-x ../wt-feat-x

# 2) 在 worktree 里干活（OXN 看不到也无需看）
cd ../wt-feat-x
$EDITOR some-file
git add -A
git commit -m "feat: ..."

# 3) 主仓拉新 commit 后,看可合并性
cd -
oxn work run gw-feat-x --json
oxn work submit gw-feat-x --task ship --json           # 4 次（4 part = 4 slot）
oxn work status gw-feat-x --json                       # overallStatus = passed
```

### 2.4 OXN 产出可合并性证据（关键）

`oxn work context <w> --task <t> --json` 会拉出当前 task 的上下文（含探针状态）。要拿到 git 可合并性的硬证据，**手工调探针**：

```bash
# 在 worktree 内：OXN 不替人 merge — 只跑 merge-tree 算法判定
git -C ../wt-feat-x merge-tree --write-tree main feat/gw-feat-x
# 退出码：0 = can_merge_clean / 1 = has_conflicts
```

**为什么 CLI 不直接暴露** `oxn work check-merge <w>`：
- 该命令会**写**东西（work-trace / frozen 候选），破坏 OXN 不替人决策的边界
- 当前由 e2e 测试（`src/cli/__tests__/work-git-workspace-e2e.test.ts`）覆盖 L1 适配器（`checkMergeFeasibility`）+ 4 probe semanticName 的端到端联动

## 3. 探针语义（catalog 4 git probe）

| semanticName         | verdict 含义 (clean: true / exists: true / can_ff_merge / can_merge_clean → PASS) |
| -------------------- | --------------------------------------------------------------------------------- |
| `git-clean`          | working tree 干净（无未提交改动）                                                  |
| `git-branch-exists`  | 指定本地分支存在                                                                  |
| `git-status-clean`   | `git status --porcelain` 为空（与 `git-clean` 同义，verbose alias）               |
| `git-merge-feasible` | `git merge-tree --write-tree` 判定（5 种状态：can_ff_merge / can_merge_clean / has_conflicts / dirty_worktree / unknown） |

来源：`src/kernel/verdicts/catalog.ts:390-491`。
所有 4 个 probe 都是 `builtin: 'oxn'`，`internalRef` 在 `@oxn/probes/...` 命名空间下。

## 4. 错误处理

`git-workflow` 蓝图与 v1.1 planLock 守卫集成：

| 错误码                        | 触发条件                                              | 行动                                                                 |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `OXN_ALIGN_LOCK_NOT_FOUND`    | 未跑 `oxn work lock` / `.work` 文件被删             | 先 `validate → lock`                                                  |
| `OXN_ALIGN_LOCK_HASH_MISMATCH` | 锁后漂移 `work.oxn` / `blueprints.json` / `task.oxn` | `unlock → edit → validate → lock`                                    |
| `OXN_ALIGN_WORK_REMOVED`      | `work.oxn` 失踪但 `.work` 还在                       | 重新 `validate → lock`（确认是否破坏性操作）                         |

注：**planLock 锁的是 per-work slim 索引**（`works/<w>/{domains,blueprints}.json`），**不是源 `.oxn` 文件**。要触发 `blueprints` 分量漂移，改 `works/<w>/blueprints.json`（e2e 测试 3 演示）。

## 5. 不做的事（明确边界）

- ❌ OXN **不**调 `git commit` / `git push` / `git merge` / `git rebase`
- ❌ OXN **不**替人选 worktree 分支名（人工命名）
- ❌ OXN **不**替人解冲突（冲突解决 = 人类活动）
- ❌ `oxn work create` **不**自动 `--worktree`（方案 C 范围，未实现）
- ❌ OXN **不**改 `.git/hooks` / `.git/config`

## 6. 验证（CI 命令）

```bash
# 1. builtin 蓝图编译 + 形状
bun test src/builtin/blueprints/__tests__/git-workflow-compile.test.ts

# 2. E2E（真 git 仓 + worktree + 4 探针联动）
bun test src/cli/__tests__/work-git-workspace-e2e.test.ts

# 3. 整套不退化
bun test
```

E2E 依赖 `git --version` 可用。CI runner 通常有；本地不可用时该 suite 4 个 test 全部 `test.skip`（`isGitAvailable` 探测）。
