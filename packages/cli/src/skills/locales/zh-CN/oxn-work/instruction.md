# /oxn-work — Drive Work v1.1

## 目标
建 **Work + ≥1 Task** 走 8 阶段：`create → add-task → validate → lock → run → submit → finalize`（`migrate?` 可选）

## 硬规则
- `validate`→`lock`→`run` 严格；无 `--force`
- lock 后漂移 = `HASH_MISMATCH`；OXN 不 commit/push
- Part/Probe 内联于 `task { part { probe {} } }`

## 范式
D=业务 Intent | B=技术 Intent | W=Align 编排 | T=Align 执行

## 执行
1. 前置：`oxn init` + `.openxenon/assets/blueprints/*.oxn`
2. fork `assets/work-{explore,develop,fix,onboarding}.md` → 改名为 `work.oxn`
3. 模板是完整 .md 示例，可被 `WorkCompiler.parse()` 直接解析（不是 OXL 代码块文档）
4. 走 8 阶段：`references/8-phase-detail.md`
5. 报错：`references/error-codes.md`

## 模式
| 需求 | 模板（.md 含 OXN 代码块）|
|---|---|
| 摸清/报告 | `assets/work-explore.md` |
| 单域开发 | `assets/work-develop.md` |
| bug 修复 | `assets/work-fix.md` |
| 跨域 | `assets/work-onboarding.md` |

## 错误
`LOCK_NOT_FOUND`/`HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## 禁止
跳 validate+lock；锁后改 `.oxn`；废弃语法（`align|inject|noun|verb|new`）。
