## ADDED Requirements

### Requirement: oxn-cli system init
oxn-cli system SHALL提供初始化项目围栏的功能。

#### Scenario: 初始化项目围栏
- **WHEN** 用户请求 `/oxn-cli system init`
- **THEN** 系统执行 `oxn init` 命令，创建 `.openxenon/` 目录和 `project.oxn` 数据库

#### Scenario: 验证初始化结果
- **WHEN** 用户执行 `/oxn-cli system init` 后
- **THEN** 系统显示 `.openxenon/` 目录内容，验证初始化成功

### Requirement: oxn-cli system status
oxn-cli system SHALL提供查看任务状态的功能。

#### Scenario: 查看任务状态
- **WHEN** 用户请求 `/oxn-cli system status --task-id <id>`
- **THEN** 系统执行 `oxn task status --task-id <id>` 并返回人类可读的进度报告

#### Scenario: 无任务 ID 时列出任务
- **WHEN** 用户请求 `/oxn-cli system status` 但未提供 task-id
- **THEN** 系统先执行 `oxn task list` 获取任务列表

### Requirement: oxn-cli system stop
oxn-cli system SHALL提供人工熔断功能，立即停止任务执行。

#### Scenario: 立即停止任务
- **WHEN** 用户请求 `/oxn-cli system stop --task-id <id>`
- **THEN** 系统执行 `oxn api task-stop --task-id <id>` 并锁定状态机

#### Scenario: 停止后通知
- **WHEN** 任务被停止
- **THEN** 系统告知用户："任务已停止，当前状态已保存。使用 `/oxn-resume` 可恢复执行。"

### Requirement: oxn-cli system trace
oxn-cli system SHALL提供轨迹取证功能，查看任务执行案卷。

#### Scenario: 导出任务轨迹
- **WHEN** 用户请求 `/oxn-cli system trace --task-id <id>`
- **THEN** 系统执行 `oxn export <id>` 并返回任务元数据、步骤记录、验证详情、产物清单

### Requirement: oxn-cli system arsenal
oxn-cli system SHALL提供 Arsenal 资产管理功能。

#### Scenario: 列出 Arsenal 资产
- **WHEN** 用户请求 `/oxn-cli system arsenal list`
- **THEN** 系统执行 `oxn arsenal list` 并将输出转换为 Markdown 统计报告

#### Scenario: 查看单个资产
- **WHEN** 用户请求 `/oxn-cli system arsenal inspect <type>/<name>`
- **THEN** 系统执行 `oxn arsenal inspect <type>/<name>` 并返回资产详情

## REMOVED Requirements

### Requirement: oxn-init 独立技能
**Reason**: 功能已整合到 `oxn-cli system init`，统一 CLI 入口
**Migration**: 使用 `/oxn-cli system init` 替代 `/oxn-init`

### Requirement: oxn-status 独立技能
**Reason**: 功能已整合到 `oxn-cli system status`，统一 CLI 入口
**Migration**: 使用 `/oxn-cli system status --task-id <id>` 替代 `/oxn-status`

### Requirement: oxn-stop 独立技能
**Reason**: 功能已整合到 `oxn-cli system stop`，统一 CLI 入口
**Migration**: 使用 `/oxn-cli system stop --task-id <id>` 替代 `/oxn-stop`

### Requirement: oxn-trace 独立技能
**Reason**: 功能已整合到 `oxn-cli system trace`，统一 CLI 入口
**Migration**: 使用 `/oxn-cli system trace --task-id <id>` 替代 `/oxn-trace`

### Requirement: oxn-arsenal 独立技能
**Reason**: 功能已整合到 `oxn-cli system arsenal`，统一 CLI 入口
**Migration**: 使用 `/oxn-cli system arsenal list/inspect` 替代 `/oxn-arsenal`