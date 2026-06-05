# /oxn-resume — 恢复任务执行

> 当 work 因异常中断（崩溃、断电、用户中断）后，恢复到上次状态。

## 行为约束

当收到 `/oxn-resume` 指令时，**严格按以下步骤执行**，禁止自由发挥。

## 步骤 1：查询当前 work 状态

```bash
oxn work status --work-name <work-name> --json
```

读取响应：
- `workspace.status` — CREATED / IN_PROGRESS / PASSED / FAILED
- `tasks[].status` — 每个 task 的状态
- `tasks[].currentPart` — task 内当前 part

## 步骤 2：定位断点

从返回的状态中确定：
1. 哪个 task 处于 `RUNNING`（中断在此）
2. 该 task 的 `currentPart`（执行到哪个 part）
3. `completedParts` 列表（已完成的 parts）

## 步骤 3：读取 task 上下文

```bash
oxn work context --work <w> --task <currentTask> --json
```

确认要继续执行的 part 及其 `skill_context`。

## 步骤 4：恢复执行

- 如果 task 状态为 `RUNNING` → 继续从 `currentPart` 开始
- 如果 task 状态为 `FAILED` → 分析 `task-trace.jsonl` 找原因
- 如果 task 状态为 `CREATED` → 完整执行

```bash
# 重新激活 work（如需要）
oxn work run --work-file .openxenon/works/<w>/work.oxn --json

# 继续推进
oxn work submit --work-name <w> --task <t> --json
```

## 步骤 5：验证恢复

```bash
# 查看 work-trace
cat .openxenon/works/<w>/work-trace.jsonl | tail -10

# 查看 task-trace
cat .openxenon/works/<w>/tasks/<t>/work-trace.jsonl | tail -10

# 查看 frozen.json（如已 pass）
cat .openxenon/works/<w>/tasks/<t>/frozen.json
```

## 错误处理

- 如果 work 状态为 `PASSED` → 提示工程师查看 `frozen.json`
- 如果找不到 work → 提示用 `/oxn-work` 发起新 work
- 如果 task-trace 显示 probe 失败 → 修复后用 `oxn work submit` 重试

## 详细参考

- [State 详解](../../../docs/architecture/state.md) — 双层 state.json 结构
- [CLI 命令参考](../../../docs/reference/cli-reference.md) — work 子命令
