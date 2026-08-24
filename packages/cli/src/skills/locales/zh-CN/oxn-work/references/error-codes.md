# v1.1 错误处理速查

> 本文件是 `SKILL.md` 的按需加载补充。遇到错误时查阅。
>
> 完整错误码定义见 `src/core/errors/iap-error.ts`。

## 错误码速查表

| 错误码 | 触发条件 | 行动 |
|---|---|---|
| `IAP_ALIGN_CHECKLIST_MISSING` | task.part.intent_checklist 必填缺失 | YIELD_TO_HUMAN |
| `IAP_ALIGN_LOCK_NOT_FOUND` | .work.planLock 缺失/未锁 | YIELD_TO_HUMAN：未调 `oxn work lock` / init 缺失 |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | 4 组件 hash 之一漂移（workOxn/workDomains/blueprints/tasks） | YIELD_TO_HUMAN：context.component 字段定位漂移源 |
| `IAP_ALIGN_WORK_REMOVED` | work 目录被删 / work.oxn 失踪（无论 .work 是否还在） | YIELD_TO_HUMAN（区别于 WORK_NOT_FOUND：work 从未存在过） |
| `OXN_ROUND_ALREADY_PASSED` | 已 PASSED 仍调 next-round | YIELD_TO_HUMAN：调 `oxn work submit` 完成 work（RFC-0032 D6 next-round 已退场，错误码保留作历史）|
| `OXN_ROUND_VERDICT_INVALID` | `--verdict` 值不在 PASSED/FAILED/INCONCLUSIVE | 修命令参数 |
| `OXN_TASK_OXN_MISSING` | work run 时未找到 task.oxn | 调 `oxn work add-task` |
| `WORK_NOT_FOUND` | work 从未创建过 | 调 `oxn work create` |

## 三剑客守卫次序

执行 `work run` / `work submit` / `work status` 时，OXN Engine 严格按以下次序检查：

1. **先校验 planLock 存在** — 缺失则抛 `IAP_ALIGN_LOCK_NOT_FOUND`
2. **再校验 4 组件 hash** — 漂移则抛 `IAP_ALIGN_LOCK_HASH_MISMATCH`（`context.component` 字段指明漂移源：`workOxn` / `workDomains` / `blueprints` / `tasks`）
3. **最后校验 work.oxn 存在** — 缺失则抛 `IAP_ALIGN_WORK_REMOVED`

## 锁定后的故障排查

```
报错 IAP_ALIGN_LOCK_HASH_MISMATCH
   │
   ▼
读 context.component 字段
   │
   ├─ workOxn       → work.oxn 自身被改（不该改；先 unlock 再改）
   ├─ workDomains   → domain.oxn 漂移（unlock → 改 domain → 重新 lock）
   ├─ blueprints    → blueprint.oxn 漂移（同上）
   └─ tasks         → task.oxn 漂移（同上）
```

## YIELD_TO_HUMAN 边界

> OXN 不会自动修复任何 planLock 漂移。Hash 一旦被冻，重新修改资产必须经 `unlock → 改 → validate → lock` 流程。这是 v1.1 设计的硬约束，**不提供 `--force` 后门**。
