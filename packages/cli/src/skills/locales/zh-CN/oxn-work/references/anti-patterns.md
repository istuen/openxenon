# 反模式（v1.3 · RFC-0033 极简化）

> 本文件是 `SKILL.md` 的按需加载补充。代码审查或排查时查阅。

## 运行时反模式

| 反模式 | 后果 | 修复 |
|---|---|---|
| 跳过 run 直接 submit | `submit` 报 `OXN_WORK_NOT_STARTED` | 严格 create → run → submit 次序 |
| 跳过 run --validate-only | 缺 .work + blueprints.json 资产快照，向后兼容下游消费方可能读取失败 | 先 `oxn work run <w> --validate-only`，再 `oxn work run <w>` |
| 改 work.md 后期望 OXN 阻断 | 不会阻断（RFC-0033 D4：DRIFT 可观测不阻断） | submit 时检查 trace.jsonl 看是否 append ASSET_DRIFT 事件 |
| 找 .work 文件 | .work 已退役（RFC-0033 D5） | work.md 是 work 存在的真源 |
| 找 oxn work lock/unlock/validate | 命令已删（RFC-0033 D2） | 用 `oxn work run --validate-only` |

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
| `oxn work validate` | `oxn work run <w> --validate-only`（RFC-0033 D1） |
| `oxn work lock` / `oxn work unlock` | 已退役（RFC-0033 D2；work.md 可自由修改） |
| `oxn part new` / `oxn probe new` | Part / Probe **不是独立资产**，在 task 块内联写 |