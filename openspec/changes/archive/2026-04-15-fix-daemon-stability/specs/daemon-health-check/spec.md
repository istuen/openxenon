## ADDED Requirements

### Requirement: 启动后健康检查

系统 SHALL 在 daemon 启动后执行健康检查，确认 API 服务可用。

#### Scenario: 健康检查成功

- **WHEN** daemon 启动后执行健康检查
- **THEN** 系统轮询 `/api/v1/health` 端点直到返回成功或超时

#### Scenario: 健康检查超时

- **WHEN** 健康检查在超时时间内未收到响应
- **THEN** 系统清理 PID 文件并返回启动失败

### Requirement: 健康检查端点

系统 SHALL 提供 `/api/v1/health` 健康检查端点。

#### Scenario: 返回健康状态

- **WHEN** 收到 GET `/api/v1/health` 请求
- **THEN** 返回 200 状态码和 `{ "status": "ok" }` 响应

### Requirement: 启动延迟报告

系统 SHALL 在启动成功后报告健康检查耗时。

#### Scenario: 报告耗时

- **WHEN** 健康检查通过
- **THEN** 日志输出 "Daemon health check passed in Xms"
