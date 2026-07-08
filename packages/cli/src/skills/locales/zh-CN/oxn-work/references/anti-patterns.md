# 反模式（v1.1）

> 本文件是 `SKILL.md` 的按需加载补充。代码审查或排查时查阅。

## 运行时反模式

| 反模式 | 后果 | 修复 |
|---|---|---|
| 跳过 validate+lock 直接 run | 触发 `IAP_ALIGN_LOCK_NOT_FOUND` | 走完整 5→6 步（validate → lock → run） |
| 绕过 lock 守卫跑生产 | 无 `--force` 后门 | 永远走 lock 流程 |
| 在锁后修改 .oxn | 触发 `IAP_ALIGN_LOCK_HASH_MISMATCH`（planLock 已冻 4 组件 hash） | 先 `oxn work unlock`，再修改，再 `validate → lock` |
| 删 .work 文件 | 丢失静态门禁卡 = `LOCK_NOT_FOUND` | 永远不删；OXN 不自动恢复 |
| 先 submit 后 run | `work run` 是 setup，`submit` 是 advance | 严格 run → submit 次序 |
| 跳过 task 创建 | `work run` fail-fast 拦截（`OXN_TASK_OXN_MISSING`） | 先 `oxn work add-task` |
| work.oxn 引用不存在的 task 名 | `work run` 校验失败 | task 块和 work.oxn 的 `task` 列表对齐 |

## 概念混淆反模式

| 反模式 | 修复 |
|---|---|
| 把 ref 与 align 混为一谈 | `domain "X" ref "..."` 是 work 级声明；task 内 `domain "X"` 是 align |
| 在 task 块外加 `part` 字段 | part 必须嵌套在 task 块内 |

## 废弃语法（v1.0+ 已删除）

| 废弃 | 替换为 |
|---|---|
| `task "X" align "Y.Z"` | `task "X" { blueprint "Y"; part "Z" }` |
| `inject "X"` | task 内 `domain "X"` |
| Domain `noun` / `verb` / `domain_rules` | `term` / `ban` / `invariant` |
| Blueprint `expectation` / `rule` 块 | 已删除，验证由 Probe 承担 |
| `work "X" ref "@oxn/blueprints/Y"` | `blueprint "Y" ref "...";` 声明 |
| `oxn work new` | `oxn work create` |
| `oxn part new` / `oxn probe new` | Part / Probe **不是独立资产**，在 task 块内联写 |
