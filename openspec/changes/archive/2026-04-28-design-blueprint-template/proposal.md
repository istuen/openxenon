## Why

目前 Task 的 Blueprint 信息缺乏统一的模板定义和存放规范。需要设计一个 Blueprint 模板机制：
1. 模板存放于 src 代码中，通过 `oxn task new` 由 Core 在项目 `.openxenon/tasks/<task-id>/` 下创建
2. 去掉项目下的 `space.oxn` 数据库，改用 Core 的 `core.oxn` 中的 tasks 表统一管理任务进度

## What Changes

- 设计 Blueprint.md 模板文件格式（存放于 src 代码）
- 定义 `oxn task new` 时由 Core 在项目目录创建 Blueprint 文件
- 定义 `.openxenon/tasks/<task-id>/` 目录结构
- 在 Core 的 `core.oxn` 新增 tasks 表，记录任务ID、项目路径、Blueprint 路径、进度状态
- 移除项目下的 space.oxn 数据库依赖
- CLI 命令：task new / list / show / submit

## Capabilities

### New Capabilities

- `blueprint-template`: Blueprint 模板格式定义，Task 描述区、Stage 选择区、Stage JSON Schema、Proof 配置
- `task-registry`: Core tasks 表管理，所有项目的任务统一在 core.oxn 中登记和追踪

### Modified Capabilities

- 无

## Impact

- 新增 `src/templates/blueprint.yaml` 模板文件
- Core 在 `.openxenon/tasks/<task-id>/` 下创建 Blueprint 文件
- Core 的 `core.oxn` 新增 tasks 表
- 移除 `src/core/space.ts` 和相关 space.oxn 操作
- 影响 `oxn task` CLI 命令