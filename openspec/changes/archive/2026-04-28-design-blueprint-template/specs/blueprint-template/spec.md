## ADDED Requirements

### Requirement: Blueprint 模板格式

Blueprint 模板 SHALL 存放于 `src/templates/blueprint.yaml`，作为代码的一部分。模板包含三个区域：

1. **Task Information 区域**: 包含任务的 id, name, description, createdAt 字段
2. **Stage Selection 区域**: 列出可选的 Stage 及其描述
3. **Stage Definitions 区域**: 定义每个选中 Stage 的具体步骤和 Proof 配置

#### Scenario: Blueprint 模板包含完整结构
- **WHEN** 工程师查看 `src/templates/blueprint.yaml`
- **THEN** 模板包含 Task Information、Stage Selection、Stage Definitions 三个区域

#### Scenario: Blueprint 采用 YAML 格式存储
- **WHEN** Blueprint 被保存到文件
- **THEN** 文件格式为 YAML

### Requirement: 任务目录结构

`oxn task new` 命令 SHALL 由 Core 在项目 `.openxenon/tasks/<task-id>/` 下创建 Blueprint 文件。

目录结构：
```
.openxenon/
  tasks/
    <task-id>/
      blueprint.yaml    # 任务的 Blueprint 文件
```

#### Scenario: 创建新任务时生成任务目录
- **WHEN** 工程师执行 `oxn task new my-task`
- **THEN** Core 在项目 `.openxenon/tasks/my-task/blueprint.yaml` 创建 Blueprint 文件

### Requirement: Core tasks 表

Core 的 `core.oxn` SHALL 包含 tasks 表，用于统一管理所有项目的任务进度。

tasks 表结构：
- `id`: 任务唯一标识符（TEXT PRIMARY KEY）
- `project_path`: 项目路径
- `blueprint_path`: Blueprint 文件路径
- `status`: 任务状态（CREATED, IN_PROGRESS, PASSED, FAILED）
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### Scenario: tasks 表记录任务信息
- **WHEN** 执行 `oxn task new` 创建任务
- **THEN** Core 在 core.oxn 的 tasks 表中插入一条记录

#### Scenario: 任务状态更新
- **WHEN** 任务进度变化
- **THEN** Core 更新 tasks 表中对应记录的 status 和 updated_at

### Requirement: 移除 space.oxn

系统 SHALL 移除项目下的 `space.oxn` 数据库依赖，所有任务数据统一由 Core 的 `core.oxn` 管理。

#### Scenario: 项目目录不再包含 space.oxn
- **WHEN** 项目初始化或迁移完成后
- **THEN** 项目 `.openxenon/` 目录下不包含 space.oxn

### Requirement: CLI 命令支持

系统 SHALL 提供以下 CLI 命令：

- `oxn task new <name>`: 创建新任务，生成 Blueprint 文件
- `oxn task list`: 列出所有已登记的任务
- `oxn task show <task-id>`: 查看指定任务的 Blueprint 内容
- `oxn task submit <task-id>`: 提交任务到 Core 进行追踪

#### Scenario: 从 Blueprint 创建任务
- **WHEN** 工程师执行 `oxn task new my-task`
- **THEN** 系统创建任务目录、更新 core.oxn tasks 表

#### Scenario: 查看任务 Blueprint
- **WHEN** 工程师执行 `oxn task show my-task`
- **THEN** 系统输出该任务的 Blueprint 内容（YAML 格式）

#### Scenario: 提交任务到 Core
- **WHEN** 工程师执行 `oxn task submit my-task`
- **THEN** 系统更新 tasks 表中任务状态为 IN_PROGRESS