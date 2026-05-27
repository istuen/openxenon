## ADDED Requirements

### Requirement: Export 命令导出任务轨迹

CLI SHALL 提供 `oxn export <task-id>` 命令用于导出指定任务的 task-trace.yaml。

#### Scenario: 导出任务轨迹到文件
- **WHEN** 用户执行 `oxn export <task-id> --output <path>`
- **THEN** CLI 从 `.openxenon/tasks/<task-id>/` 读取 task-trace.yaml
- **AND** 写入到指定输出路径
- **AND** 输出导出成功信息

### Requirement: Export 命令输出到 stdout

CLI SHALL 当用户未指定输出路径时将 task-trace.yaml 内容输出到标准输出。

#### Scenario: 输出到 stdout
- **WHEN** 用户执行 `oxn export <task-id>` 不带 --output 参数
- **THEN** CLI 读取 task-trace.yaml 内容
- **AND** 输出到标准输出

### Requirement: Export 命令任务不存在时报错

CLI SHALL 当指定的任务 ID 不存在时显示错误信息并退出。

#### Scenario: 任务不存在
- **WHEN** 用户执行 `oxn export <non-existent-task-id>`
- **THEN** CLI 输出错误信息 "任务不存在: <task-id>"
- **AND** 以非零状态码退出
