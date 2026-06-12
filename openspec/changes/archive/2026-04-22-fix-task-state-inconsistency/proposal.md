## Why

当通过 `oxn task start` 启动任务时，出现以下问题：
1. 任务目录未在 `.openxenon/tasks/` 下创建
2. `oxn api step-start` 返回 "Invalid project" 错误
3. `oxn task stop` 报数据库约束错误（CHECK constraint failed: status IN (...)）

**根因分析**：
- 数据库 CHECK 约束使用大写状态值 `('PENDING', 'RUNNING', 'COMPLETED', 'ESCAPED', 'TERMINATED')`
- 但 `task-stop.ts` 使用小写 `'failed'` 调用 `updateTaskStatus`
- `step-start` 报错是因为 Core 没有正确使用 `process.cwd()` 获取项目路径，而是依赖 CLI 传递参数

## What Changes

- 统一所有代码中的 TaskStatus 为大写（与数据库 CHECK 约束一致）
- 修复 Core 直接使用 `process.cwd()` 获取项目路径，不再依赖 CLI 传递
- 实现任务启动时目录创建逻辑

## Capabilities

### New Capabilities
- `task-state-consistency`: 确保任务状态值统一为大写

### Modified Capabilities
- `task-execution`: 修复任务启动和停止的状态管理逻辑

## Impact

- 受影响代码：`src/api/handlers/task-stop.ts`、`src/api/socket-server.ts`
- 受影响模块：任务状态机
- 数据库：`project.db` 的 tasks 表
