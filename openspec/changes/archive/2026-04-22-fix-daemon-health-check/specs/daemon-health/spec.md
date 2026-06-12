## ADDED Requirements

### Requirement: Health check 正确发送请求并等待响应
`waitForHealth` SHALL 使用正确的 socket 协议发送请求并等待响应。

#### Scenario: Health check 成功
- **WHEN** daemon 已启动且 health endpoint 可访问
- **THEN** `waitForHealth` 返回 `{ success: true, elapsedMs }`

#### Scenario: Health check 超时
- **WHEN** daemon 未启动或在超时时间内不可访问
- **THEN** `waitForHealth` 返回 `{ success: false, elapsedMs }`

### Requirement: Socket 协议使用换行符分隔的 JSON
health check SHALL 按照 socket server 的协议格式发送请求（每行一个 JSON 对象加换行符）。

### Requirement: 验证响应内容
health check SHALL 验证响应内容确认 daemon 状态，而不仅仅依赖 socket 连接成功。
