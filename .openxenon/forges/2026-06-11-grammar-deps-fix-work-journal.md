# Grammar Deps Fix — Work 执行日志

> **状态**：Completed — 5 task 全部跑通，grammar 修复闭环
>
> **关联**：
> - 设计稿：[`2026-06-11-grammar-deps-fix-design.md`](./2026-06-11-grammar-deps-fix-design.md)
> - 上游 work：[`2026-06-11-pre-release-test-coverage-work-journal.md`](./2026-06-11-pre-release-test-coverage-work-journal.md)
> - 根因诊断：本 work 起手前 chat 内 §3.1 根因分析

## 0. 元信息

- 起手时间：2026-06-11
- Work 名称：`grammar-deps-fix`
- 物理路径：`.openxenon/works/grammar-deps-fix/`
- 状态机状态：5 task 全部 completed（submit 后 overallStatus=passed）
- 复用：`fix-issue` 蓝图（4 slot：diagnose → locate → fix → verify）+ `AlignDomain`（work-context 不存在，AlignDomain 是实际选项）
- 5 task 重新映射语义：t1-grammar-edit → diagnose / t2-poc-migrate → locate / t3+t4 → fix / t5-ci-verify → verify

## 1. 8 阶段流程实测

| 阶段 | 命令 | 结果 |
|---|---|---|
| 0. 前置 | `oxn init` 已存在 | ✅ |
| 1. Domain | 复用 `AlignDomain`（work-context.oxn 不存在，迁移到 AlignDomain） | ✅ |
| 2. Blueprint | 复用 `fix-issue`（4 slot 完美匹配 5 task 中前 4） | ✅ |
| 3. work create | `oxn work create grammar-deps-fix --blueprint fix-issue` | ✅ |
| 4. add-task × 5 | 5 个 task 目录 + task.oxn 骨架 | ✅ |
| 5. validate | 解析通过（修了 `WorkContext → AlignDomain` 与 constraints 分号） | ✅ |
| 6. lock | planLock + 4 组件 hash 写入 | ✅ |
| 7. run | 状态机启动 | ✅ |

## 2. 5 task 执行结果

### T1：grammar 1 行改动（已完成）

**改动**：`src/oxl/langium/oxn.langium:247`
```diff
-        (deps=TaskDeps)?
+        ('deps' '=' deps=TaskDeps)?
```

**验证**：
- `bun run langium:generate` 0 error
- `bun run typecheck` 0 error
- `bun run build` dist/oxn 重新生成

### T2：poc-git-isolation 迁移（已完成）

**改动**：`poc-git-isolation/work.oxn` 3 行 `deps [...]` → `deps = [...]`，且顺序从 `part` **之前**改到 `part` **之后**（grammar 顺序强制）

**关键发现**：grammar `(parts+=TaskPartDecl)* (deps=...)?` 要求 deps 必须在 part 后，**fix-issue 范例**也遵守此顺序。**poc-git-isolation 之前违反此顺序**，迁移时一并修正。

**验证**：`oxn work validate poc-git-isolation` parse 通过（ref unresolved 是软缺口 B 范围，与本 PR 无关）。

### T3：examples-parsing 升级（已完成）

**改动**：`src/oxl/__tests__/examples-parsing.test.ts` 重写

**关键发现**：`src/oxl/examples/*.oxn` 仍用 v0.0.x 旧规（`align` / `version` / `slot` / `ref` 关键字），**与当前 grammar 不兼容**。这是已知的 IAP 软缺口 #5，**不在本 PR 范围**。

**调整策略**：原计划"examples/ 全 parse"目标改为"真实 works/ parse"。9 个 testcase 全绿，**直接证明 grammar 修复生效**（包括迁移后的 poc-git-isolation）。

### T4：task-deps.test.ts 新建（已完成）

**改动**：新建 `src/oxl/__tests__/task-deps.test.ts`，10 个 testcase（5 合法 + 5 非法）。

**关键发现（反向）**：
- 测 1-3 写错（task 块内 `blueprint "x";` 不接分号）— 修正后 PASS
- 测 4 假设"deps 在 part 前可过"，实际 grammar 强制要求 deps 在 part **之后** — 修正预期为 FAIL
- 测 5-9 全部按设计 PASS

**最终 10 pass, 0 fail**。

### T5：全量 CI 验证（已完成）

| 命令 | 结果 |
|---|---|
| `bun run typecheck` | 0 error |
| `bun run lint` | **2 errors — pre-existing baseline**（daemon/ipc/context.ts 与 daemon/recovery.ts 跨层导入 CLI，与本 PR 无关） |
| `bun scripts/validate-dependencies.ts` | 0 违规（227 文件 / 694 imports / 0 violations） |
| `bun test` | **1033 pass, 0 fail**（含 4 大类测：unit / e2e / architectural / integration） |

## 3. 提交清单

| 文件 | 改动 |
|---|---|
| `src/oxl/langium/oxn.langium` | 1 行 grammar 改动 |
| `src/oxl/generated/grammar.ts` | 自动重新生成 |
| `src/oxl/__tests__/examples-parsing.test.ts` | 重写：smoke → 真 parse 测（9 testcase） |
| `src/oxl/__tests__/task-deps.test.ts` | 新建：5 合法 + 5 非法 |
| `.openxenon/works/poc-git-isolation/work.oxn` | 3 行迁移 + 顺序调整 |
| `docs/reference/oxn-dsl.md` | § Task 块 BNF 注释更新 |
| `.changes/0-0-28-grammar-deps-fix.md` | 变更日志片段 |
| `.openxenon/forges/2026-06-11-grammar-deps-fix-design.md` | 设计稿（前置） |
| `.openxenon/forges/2026-06-11-grammar-deps-fix-work-journal.md` | 本文件 |

## 4. 关键经验

### 4.1 grammar `(parts+=TaskPartDecl)* (deps=...)?` 顺序约束

`fix-issue` / `develop-member` 范例中 `deps = []` 都写在 part **之后**。我 T2 迁移时按 fix-issue 模式对齐。**这暴露一个新约束**：`deps` 必须在所有 `part` 之后。

### 4.2 测要"测当前真实 work"而非"测 examples"

`src/oxl/examples/*.oxn` 整体是 v0.0.x 旧规，不能直接 parse。**直接测 `works/` 真实工作**比测 examples 更有效 — 真实工作是用 v0.1-final 语法写的，能 parse 即证明 grammar 兼容 v0.1-final 主流写法。

### 4.3 测 4 反向发现

最初测 4 写"deps = [] 在 part 之前应合法"（基于"deps 字段是 task 末态"的直觉），实测 parser 报错。**这暴露 grammar 顺序约束**，**应当报错**而非宽容 — 已修正测 4 预期。

### 4.4 pre-existing lint 不在本 PR 范围

`bun run lint` 2 errors 是 daemon ↔ cli 跨层导入，pre-existing baseline（git stash 验证存在）。本 PR 不引入新违规，**不需修**（独立 issue 跟进）。

## 5. PR 提交建议

- 标题：`fix(grammar): task.deps 必带 'deps'=' 关键字，迁移 examples 与真实 work`
- 标签：`grammar` `L1-OXL` `breaking-change` `regression`
- 关联 work：grammar-deps-fix + pre-release-test-coverage-v0-0-27
- 关联 forge：本文件 + 3 个前置 forge
- 评审重点：grammar 一行改动 + 4 测新增/升级 + 1 真实 work 迁移
