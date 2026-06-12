## ADDED Requirements

### Requirement: 任务状态由文件系统表达

OpenXenon SHALL 使用文件系统作为任务执行状态的 Single Source of Truth。任务目录结构为 `.openxenon/tasks/{task_id}/`，其中包含：
- `blueprint.yaml`：任务执行蓝图
- `task-trace.yaml`：执行案卷

#### Scenario: 任务目录存在性判断任务状态
- **WHEN** CLI 执行 `oxn task status` 命令
- **THEN** CLI 直接检查 `.openxenon/tasks/{task_id}/` 目录是否存在
- **AND** 若目录不存在，返回 `NOT_FOUND`

#### Scenario: task-trace.yaml 中的 status 字段决定任务状态
- **WHEN** CLI 执行 `oxn task status` 命令且任务目录存在
- **THEN** CLI 读取 `task-trace.yaml` 的 `status` 字段
- **AND** 返回对应状态：`RUNNING` | `COMPLETED` | `FAILED` | `ESCAPED`

### Requirement: CLI 创建任务时生成文件系统结构

OpenXenon SHALL 在 `oxn task new` 时创建完整的任务目录结构，不依赖任何数据库。

#### Scenario: 新建任务创建目录和 blueprint.yaml
- **WHEN** 用户执行 `oxn task new <task_id>`
- **THEN** 系统在 `.openxenon/tasks/<task_id>/` 创建 `blueprint.yaml`
- **AND** `blueprint.yaml` 包含空的 `stages` 数组
- **AND** 系统不创建任何数据库记录

### Requirement: Daemon 接收 Payload 执行任务

OpenXenon SHALL 让 Daemon 成为无状态探针执行器，通过 Unix Domain Socket 接收完整 Payload 后直接操作文件系统。

#### Scenario: Daemon 接收 EXECUTE_TASK 命令
- **WHEN** CLI 通过 Socket 发送 `EXECUTE_TASK` Payload 给 Daemon
- **AND** Payload 包含 `project_root`、`task_id`、`blueprint` 对象和 `policy`
- **THEN** Daemon 根据 `project_root` 切换工作目录
- **AND** Daemon 根据 `blueprint` 中的探针定义执行检查
- **AND** Daemon 将执行结果写入 `{project_root}/.openxenon/tasks/{task_id}/task-trace.yaml`
- **AND** Daemon 返回执行结果给 CLI

#### Scenario: Daemon 接收 EXECUTE_STEP 命令
- **WHEN** CLI 通过 Socket 发送 `EXECUTE_STEP` Payload 给 Daemon
- **AND** Payload 包含 `step_id`
- **THEN** Daemon 仅执行指定的单个 Step
- **AND** Daemon 更新 `task-trace.yaml` 中对应 Step 的状态

### Requirement: Payload 格式定义

OpenXenon SHALL 定义标准的 CLI → Daemon Payload 格式，用于所有任务相关通信。

#### Scenario: DaemonPayload 结构
- **WHEN** CLI 发送 Payload 给 Daemon
- **THEN** Payload 必须包含：
  - `command`: `"EXECUTE_TASK"` | `"EXECUTE_STEP"` | `"VERIFY_STEP"`
  - `project_root`: string（项目绝对路径）
  - `task_id`: string
  - `policy`: `"PRODUCTION"` | `"SANDBOX"`
  - `schema_version`: string（用于版本兼容检查）

#### Scenario: EXECUTE_TASK 时包含完整 Blueprint
- **WHEN** CLI 发送 `EXECUTE_TASK` 命令
- **THEN** Payload 必须额外包含 `blueprint` 对象
- **AND** `blueprint` 包含 `id`、`name` 和 `stages` 数组

#### Scenario: EXECUTE_STEP 时包含 Step ID
- **WHEN** CLI 发送 `EXECUTE_STEP` 命令
- **THEN** Payload 必须额外包含 `step_id` 字符串

### Requirement: task-trace.yaml 结构定义

OpenXenon SHALL 定义 `task-trace.yaml` 的标准 Schema，用于记录任务执行过程。

#### Scenario: task-trace.yaml 包含任务级信息
- **WHEN** Daemon 开始执行任务
- **THEN** `task-trace.yaml` 必须包含：
  - `taskId`: string
  - `taskName`: string
  - `status`: `"RUNNING"` | `"COMPLETED"` | `"FAILED"` | `"ESCAPED"`
  - `startedAt`: ISO8601 时间戳
  - `stages`: Stage 执行记录数组

#### Scenario: Stage 执行记录包含探针结果
- **WHEN** Daemon 完成一个 Stage 的执行
- **THEN** `stages` 数组中对应条目必须包含：
  - `stageId`: string
  - `stageName`: string
  - `status`: `"PENDING"` | `"RUNNING"` | `"PASSED"` | `"FAILED"`
  - `probes`: 探针执行结果数组
  - `executedAt`: ISO8601 时间戳

### Requirement: 移除数据库的任务管理职责

OpenXenon SHALL 移除 `project.oxn` 中 `tasks`、`blueprints`、`stages` 表的全部职责。

#### Scenario: 系统不再创建任务数据库记录
- **WHEN** 用户执行 `oxn task new`
- **THEN** 系统不在任何 SQLite 数据库中创建 `tasks` 记录
- **AND** 系统不在任何 SQLite 数据库中创建 `blueprints` 记录
- **AND** 系统不在任何 SQLite 数据库中创建 `stages` 记录

#### Scenario: 系统不再查询数据库获取任务状态
- **WHEN** CLI 执行 `oxn task status`
- **THEN** CLI 不查询任何数据库获取任务状态
- **AND** CLI 仅通过文件系统判断任务状态