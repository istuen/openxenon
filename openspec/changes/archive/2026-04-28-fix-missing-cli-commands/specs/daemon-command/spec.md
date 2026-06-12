## ADDED Requirements

### Requirement: Daemon 命令提供 start 子命令

CLI SHALL 提供 `oxn daemon start` 子命令用于启动全局守护进程。

#### Scenario: 启动守护进程
- **WHEN** 用户执行 `oxn daemon start`
- **THEN** CLI 向守护进程 socket 发送启动请求
- **AND** 等待守护进程响应
- **AND** 输出启动结果

### Requirement: Daemon 命令提供 stop 子命令

CLI SHALL 提供 `oxn daemon stop` 子命令用于停止全局守护进程。

#### Scenario: 停止守护进程
- **WHEN** 用户执行 `oxn daemon stop`
- **THEN** CLI 向守护进程 socket 发送停止请求
- **AND** 等待守护进程响应
- **AND** 输出停止结果

### Requirement: Daemon 命令提供 status 子命令

CLI SHALL 提供 `oxn daemon status` 子命令用于查看守护进程状态。

#### Scenario: 查看守护进程状态
- **WHEN** 用户执行 `oxn daemon status`
- **THEN** CLI 向守护进程 socket 发送状态查询请求
- **AND** 输出守护进程运行状态（running/stopped）和进程 ID

### Requirement: Daemon 命令无参数时显示帮助

CLI SHALL 当用户执行 `oxn daemon` 不带子命令时显示帮助信息。

#### Scenario: 无参数显示帮助
- **WHEN** 用户执行 `oxn daemon`
- **THEN** 显示 usage 帮助信息
- **AND** 列出所有可用子命令
