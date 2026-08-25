# v1.3 错误处理速查（RFC-0033 D2 PlanLock 退役）

> 本文件是 `SKILL.md` 的按需加载补充。遇到错误时查阅。
>
> 完整错误码定义见 `src/core/errors/iap-error.ts`。

## 错误码速查表

| 错误码 | 触发条件 | 行动 |
|---|---|---|
| `IAP_ALIGN_CHECKLIST_MISSING` | task.part.intent_checklist 必填缺失 | YIELD_TO_HUMAN |
| `OXN_WORK_NOT_STARTED` | submit 时 run 未跑 | 先 `oxn work run <name>` |
| `OXN_WORK_NOT_FOUND` | work 从未创建过 | 调 `oxn work create` |
| `OXN_TASK_OXN_MISSING` | work run 时未找到 task.md | 调 `oxn work add-task` |
| `OXN_TASK_NOT_FOUND` | submit 的 task 名不存在 | 修 `--task` 参数 |
| `OXN_INTENT_CONTEXT_MISSING` | run --validate-only 时 context.md 缺失 | 写 `works/<w>/context.md` |
| `OXN_INTENT_SCOPE_VIOLATION` | Task Artifact 越界 Blueprint Scope | 修正 Task `## Artifacts` 段（不能改 Blueprint Scope） |
| `OXN_WORK_NOT_FOUND` | work 不存在 | `oxn work create <name>` |
| `OXN_CLI_INPUT_ERROR` | `oxn work inject` 无 flag | 加 `--paths` / `--context` / `--memory` |

🗑️ **已退役错误码**（v1.3 RFC-0033 D2）：
- `IAP_ALIGN_LOCK_NOT_FOUND` — PlanLock 已删，不再要求锁
- `IAP_ALIGN_LOCK_HASH_MISMATCH` — PlanLock 已删，hash 漂移不阻断
- `IAP_ALIGN_WORK_REMOVED` — PlanLock 已删，work.md 缺失走 `OXN_WORK_NOT_FOUND`

🗑️ **已退役错误码**（v1.2 RFC-0032 D6）：
- `OXN_ROUND_ALREADY_PASSED` — Round 已退场
- `OXN_ROUND_VERDICT_INVALID` — Round verdict 已退场

## 错误排查流程

执行 `work run` / `work submit` 时，OXN Engine 按以下次序检查：

1. **work 目录 + work.md 存在** — 缺失则抛 `OXN_WORK_NOT_FOUND`
2. **work.md 语法 + DAG + 引用** — 不通过则抛 `OXN_WORK_VALIDATE_FAILED` / `OXN_INTENT_*`
3. **.run/state.json 存在**（仅 submit 时）— 缺失则抛 `OXN_WORK_NOT_STARTED`

🗑️ RFC-0033 D2 退役了 planLock 守卫；work.md 可自由修改，hash 漂移仅记 ASSET_DRIFT 事件（不阻断）。

## 漂移可观测（DRIFT · RFC-0033 D4）

```
工作流：
  1. 修改 work.md（合法操作）
  2. oxn work submit <w> --task <t>
  3. submit 内部：调 hashWorkPlan 算 workMdHash
  4. 读 trace.jsonl 上次 SUBMIT 的 previousHash
  5. 不一致 → append ASSET_DRIFT 事件（不阻断 submit）
  6. append SUBMIT 事件（带新 workMdHash + probeResult）

可观测信号：
  - trace.jsonl 含 event='ASSET_DRIFT' 事件
  - submit 输出 data.drift = { component, previousHash, currentHash }
  - 多次 DRIFT = Blueprint 或 AI 遇到问题（人工 review）
```

## YIELD_TO_HUMAN 边界

> OXN 不会自动修复任何错误。错误一旦触发，由工程师决策路径：
> - `OXN_INTENT_*` → 修 work.md / context.md / task.md 内容
> - `OXN_TASK_*` → 调 add-task / edit-task
> - `OXN_WORK_NOT_*` → 重新 create 或 run
>
> v1.3 **不提供 `--force` 后门**。所有错误需工程师决策修复路径。