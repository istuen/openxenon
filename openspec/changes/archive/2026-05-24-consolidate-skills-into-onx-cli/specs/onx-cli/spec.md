## ADDED Requirements

### Requirement: onx-cli 统一技能入口
onx-cli 技能 SHALL 作为 OpenXenon CLI 操作的单一起点，整合所有 oxn-* 技能的功能。

#### Scenario: 用户通过统一入口访问 Arsenal 资产
- **WHEN** 用户请求 `/onx-cli arsenal list`
- **THEN** 系统返回 Arsenal 中的 probe/blueprint/part 资产列表

#### Scenario: 用户通过统一入口访问 Task 工作流
- **WHEN** 用户请求 `/onx-cli task new --name <name>`
- **THEN** 系统初始化一个新的 Task 工作流

#### Scenario: 用户通过统一入口访问 Work 工作流
- **WHEN** 用户请求 `/onx-cli work init --name <name> --type <task|plan|explore>`
- **THEN** 系统根据 type 初始化对应类型的 Work

#### Scenario: 用户通过统一入口访问 Forge 资产生成
- **WHEN** 用户请求 `/onx-cli forge <type> --name <name>`
- **THEN** 系统根据 type 生成对应的 Draft 资产

#### Scenario: 用户通过统一入口访问 System 操作
- **WHEN** 用户请求 `/onx-cli system init`
- **THEN** 系统初始化项目围栏

- **WHEN** 用户请求 `/onx-cli system stop --task-id <id>`
- **THEN** 系统停止指定任务

- **WHEN** 用户请求 `/onx-cli system status --task-id <id>`
- **THEN** 系统返回指定任务的状态

- **WHEN** 用户请求 `/onx-cli system trace --task-id <id>`
- **THEN** 系统导出指定任务的执行轨迹

- **WHEN** 用户请求 `/onx-cli system resume --task-id <id>`
- **THEN** 系统从断点恢复指定任务

### Requirement: 子命令路由
onx-cli 技能 SHALL 支持以下子命令路由：
- `onx-cli arsenal` - Arsenal 资产管理（list/inspect）
- `onx-cli task` - 任务管理（new/list/next/verify）
- `onx-cli work` - 工作流管理（init/resume/complete/list）
- `onx-cli forge` - 资产生成（probe/blueprint/part）
- `onx-cli system` - 系统操作（init/stop/status/trace/resume）

#### Scenario: 未知子命令处理
- **WHEN** 用户请求 `/onx-cli unknown-subcommand`
- **THEN** 系统返回错误提示，列出可用子命令

### Requirement: 命令参数传递
onx-cli 技能 SHALL 将所有参数透传给 `oxn` CLI 工具。

#### Scenario: 参数完整性保持
- **WHEN** 用户请求 `/onx-cli task new --name test-task --type plan`
- **THEN** 系统调用 `oxn task new --name test-task --type plan`，保持参数完整