## Context

任务系统存在三个相互关联的问题：

1. **状态值大小写不一致**：`task-stop.ts:31` 使用小写 `'failed'`，但数据库 CHECK 约束使用大写 `('PENDING', 'RUNNING', 'COMPLETED', 'ESCAPED', 'TERMINATED')`。

2. **"Invalid project" 错误**：CLI 通过 socket 发送请求时没有传递 projectPath，Core 无法确定项目位置。正确做法应该是由 Core 引擎直接使用 `process.cwd()` 获取当前工作目录，然后查询该目录下的 `.openxenon/project.oxn` 获取项目上下文。

3. **任务目录未创建**：任务启动时，应在 `.openxenon/tasks/<task-id>/` 下创建目录和 `step-manifest.json`，但该逻辑未实现。

## Goals / Non-Goals

**Goals:**
- 统一所有代码中的 TaskStatus 为大写
- 修复 Core 的项目路径获取逻辑，使用 `process.cwd()` 而非依赖 CLI 传递
- 实现任务启动时目录创建逻辑

**Non-Goals:**
- 不修改数据库 CHECK 约束
- 不修改 CLI 传递参数的逻辑
- 不修改 `TaskStatus` 类型定义

## Decisions

**1. 统一状态值为大写**：修改以下文件中的状态值：
- `src/api/handlers/task-stop.ts:31`：`'failed'` → `'FAILED'`
- 检查其他调用 `updateTaskStatus` 的地方是否也使用小写

**2. 修复 Core 使用 process.cwd() 获取项目路径**：
- 修改 `src/api/socket-server.ts`，在处理请求时直接使用 `process.cwd()` 获取项目路径
- 不依赖 CLI 传递 projectPath 参数
- Core 直接在当前工作目录下查找 `.openxenon/project.oxn`

**3. 实现任务目录创建**：在 `task-start` handler 中添加目录创建逻辑
- 创建 `.openxenon/tasks/<task-id>/` 目录
- 创建初始的 `step-manifest.json`

## Risks / Trade-offs

- 需要确保所有调用 `updateTaskStatus` 的地方都使用大写状态值

## Open Questions

- 无
