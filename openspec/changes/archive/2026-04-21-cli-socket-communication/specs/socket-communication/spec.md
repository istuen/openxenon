## ADDED Requirements

### Requirement: Unix Socket 服务器
API 服务必须使用 Unix Socket 而非 HTTP。

#### Scenario: 启动 Daemon
- **WHEN** 运行 `oxn daemon start`
- **THEN** 创建 Unix Socket 监听 `~/.openxenon/daemon.sock`

#### Scenario: Socket 通信
- **WHEN** CLI 通过 Socket 发送请求
- **THEN** 服务器返回 JSON 响应

### Requirement: oxn api 子命令
必须提供 `oxn api` 子命令入口。

#### Scenario: 提交任务
- **WHEN** 运行 `oxn api task-submit --task "xxx"`
- **THEN** 通过 Socket 提交任务并返回结果

#### Scenario: 查询状态
- **WHEN** 运行 `oxn api task-status --task-id <id>`
- **THEN** 通过 Socket 查询并返回状态

### Requirement: Skills 使用 CLI
Skills 必须使用 CLI 子命令调用 API。

#### Scenario: Skill 调用
- **WHEN** AI 执行 Skill 中的指令
- **THEN** 使用 `oxn api <subcommand>` 而非 curl

## MODIFIED Requirements

### Requirement: API 服务
**FROM**: HTTP 服务器监听 127.0.0.1:8420
**TO**: Unix Socket 监听 ~/.openxenon/daemon.sock

#### Scenario: 启动服务
- **WHEN** 启动 daemon
- **THEN** 创建 Unix Socket 而非 HTTP 服务器

### Requirement: CLI 输出格式
**FROM**: 返回 HTTP 地址
**TO**: 返回 Socket 路径

#### Scenario: oxn api base
- **WHEN** 运行 `oxn api base`
- **THEN** 输出 `~/.openxenon/daemon.sock`