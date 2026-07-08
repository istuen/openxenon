# V0→V1 路径映射

> 本文件是 `SKILL.md` 的按需加载补充。**仅迁移老项目时**加载。
>
> v1.1 把 work 运行时状态从 work.oxn 同级目录搬到 `.run/` 子目录，方便 lock 守卫写静态卡。

## 路径对照表

| V0 路径 | V1 路径 |
|---|---|
| `works/<w>/work-state.json` | `works/<w>/.run/state.json` |
| `works/<w>/work-trace.jsonl` | `works/<w>/.run/trace.jsonl` |
| `works/<w>/work-frozen.json` | `works/<w>/.run/frozen.json` |
| `works/<w>/tasks/<t>/task-state.json` | `works/<w>/tasks/<t>/state.json` |
| `works/<w>/tasks/<t>/task-trace.jsonl` | `works/<w>/tasks/<t>/trace.jsonl` |
| `works/<w>/tasks/<t>/task-frozen.json` | `works/<w>/tasks/<t>/frozen.json` |
| （无） | `works/<w>/.work`（静态门禁卡） |
| （无） | `works/<w>/.migrated-v0/<rel>`（V0 备份） |

## 紧凑表达（grep 模式）

- V0: `works/<w>/work-{state,trace,frozen}.{json,jsonl}`
- V1: `works/<w>/.run/{state,trace,frozen}.{json,jsonl}`

## 迁移命令

```bash
oxn work migrate <work-name>
# 把 V0 布局 works/<w>/work-state.json 等迁移到 V1 布局 .run/
# 原 V0 文件备份到 .migrated-v0/（不删，留审计）
```

迁移工具特性：
- **不删原文件**：备份到 `works/<w>/.migrated-v0/<rel>` 供审计
- **幂等**：可重复执行，不破坏 V1 文件
- **新建 work 跳过**：V0 路径不存在的 work 直接进入 V1 流程
