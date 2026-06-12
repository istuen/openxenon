## Context

当前 `work` CLI 子命令包括 `init`、`list`、`validate`，缺少 Task CLI 中已实现的 `resume` 和 `complete` 生命周期操作。同时 `work init` 命名与 `task new` 不对齐。

## Goals / Non-Goals

**Goals:**
- 重命名 `work init` → `work new` 与 Task CLI 对齐
- 实现 `work resume` 恢复 Work 执行
- 实现 `work complete` 标记 Work 完成

**Non-Goals:**
- 不修改 `work list`、`work validate` 现有行为
- 不涉及 Work 内部执行逻辑的修改

## Decisions

1. **重命名策略**：直接重命名 `init` 为 `new`，保持现有参数兼容
2. **resume 实现**：读取 `.openxenon/work/<type>/<work-id>/state.json`，获取当前 Part 索引，返回下一个待处理 Part 的操作指令
3. **complete 实现**：更新 `state.json` 中 `status` 为 `completed`，可选记录完成时间

## Risks / Trade-offs

- [风险] `init` 已有用户使用：作为破坏性更小的重命名，可保持向后兼容或通过 alias 处理
- [权衡] Work state 管理：目前无持久化 state.json，需先建立基础结构再实现 resume/complete