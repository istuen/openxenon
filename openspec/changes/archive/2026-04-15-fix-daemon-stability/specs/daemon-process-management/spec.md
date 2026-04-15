## ADDED Requirements

### Requirement: 僵尸 PID 检测

系统 SHALL 检测 PID 文件存在但进程不存在的情况。

#### Scenario: 检测僵尸 PID

- **WHEN** PID 文件存在但进程不存在
- **THEN** `isDaemonRunning()` 返回 `{ pid: <pid>, isRunning: false }`

#### Scenario: 清理僵尸 PID 文件

- **WHEN** 检测到僵尸 PID
- **THEN** `startDaemon()` 清理 PID 文件后继续启动

### Requirement: 异常时清理 PID

系统 SHALL 在进程异常退出时清理 PID 文件。

#### Scenario: 未捕获异常

- **WHEN** daemon 进程抛出未捕获异常
- **THEN** 清理 PID 文件后退出

#### Scenario: 未处理的 Promise 拒绝

- **WHEN** daemon 进程有未处理的 Promise 拒绝
- **THEN** 清理 PID 文件后退出

### Requirement: 数据库操作异常处理

系统 SHALL 处理 daemon_address 数据库操作失败。

#### Scenario: 写入失败

- **WHEN** `saveDaemonAddress()` 执行失败
- **THEN** 记录错误日志但继续运行

#### Scenario: 清除失败

- **WHEN** `clearDaemonAddress()` 执行失败
- **THEN** 记录错误日志但继续退出流程
