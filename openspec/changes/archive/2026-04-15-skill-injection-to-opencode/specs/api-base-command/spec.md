## ADDED Requirements

### Requirement: api base 命令

系统 SHALL 提供 `xn api base` 命令返回 Core 当前通信地址。

#### Scenario: HTTP 地址

- **WHEN** Core 以 HTTP 模式启动并监听 8420 端口
- **THEN** `xn api base` 输出 `http://127.0.0.1:8420`

#### Scenario: 动态端口

- **WHEN** Core 启动时默认端口被占用，自动选择 8421
- **THEN** `xn api base` 输出 `http://127.0.0.1:8421`

#### Scenario: Unix Socket 地址

- **WHEN** Core 以 Unix Socket 模式启动
- **THEN** `xn api base` 输出 `unix:///Users/xxx/.xenonix/daemon.sock`

### Requirement: 地址存储

系统 SHALL 在 Core 启动时将实际监听地址写入 core.db。

#### Scenario: 启动时写入

- **WHEN** Core daemon 启动成功
- **THEN** 将实际监听地址写入 `~/.xenonix/core.db` 的配置表

#### Scenario: 停止时清除

- **WHEN** Core daemon 停止
- **THEN** 清除 core.db 中的监听地址记录

### Requirement: 未运行状态处理

系统 SHALL 在 Core 未运行时返回明确错误。

#### Scenario: Core 未启动

- **WHEN** Core 未运行时执行 `xn api base`
- **THEN** 输出错误信息 "Core daemon is not running" 并提示启动命令

#### Scenario: 退出码

- **WHEN** 获取地址失败
- **THEN** 命令以退出码 1 退出
