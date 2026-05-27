## Why

当前 `/oxn-task` 流程被 daemon 阻塞——所有 task 命令依赖 daemon 运行才能工作。但自举场景（项目根目录首次使用 oxn）无法启动 daemon，导致 CLI 命令完全不可用。必须让 CLI 直接操作文件系统，使 task 命令独立于 daemon 运行，打通自举路径。

## What Changes

- `oxn task submit --blueprint <path>`: 读取 Blueprint YAML，写入 `.openxenon/tasks/<task-id>/blueprint.yaml` 和 `state.json`
- `oxn task next --task-id <id>`: 读取 state.json，找到下一个 PENDING 的 Stage，更新状态为 RUNNING
- `oxn task verify --task-id <id> --stage-id <id>`: 执行 Stage 内的所有 Probe，更新 state.json
- `oxn task status --task-id <id>`: 读取 state.json，输出当前状态
- 写入 `trace.yaml` 追加审计日志
- 写入 `step-manifest.json` 步骤级状态明细

**BREAKING**: daemon 不再是 task 流程的前置条件。daemon 降级为可选的监控增强。

## Capabilities

### New Capabilities

- `cli-task-filesystem`: CLI 直接操作文件系统实现 task 状态机，不依赖 daemon
  - submit: 读取 Blueprint，生成 task-id，写入 state.json
  - next: 读取 state.json，推进 Stage 状态
  - verify: 执行 Probes，更新 state.json 和 trace.yaml
  - status: 查询当前状态

### Modified Capabilities

- (无)

## Impact

- `src/cli/task.ts` 核心实现文件
- `src/kernel/schemas/probe.ts` Probe 评判层保持不变（纯函数）
- `src/infra/probes/` 能力层保持不变（物理执行）
- 无新增依赖