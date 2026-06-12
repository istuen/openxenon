## ADDED Requirements

### Requirement: CLI 必须传递 projectPath

所有 CLI 命令调用 `socketRequest()` 时必须显式传递 `projectPath` 参数。

#### Scenario: step-start 传递 projectPath
- **WHEN** CLI 执行 `oxn step-start --task-id X --step-id Y`
- **THEN** `socketRequest` 的第5参数为 `process.cwd()`

#### Scenario: step-verify 传递 projectPath
- **WHEN** CLI 执行 `oxn step-verify --task-id X --step-id Y`
- **THEN** `socketRequest` 的第5参数为 `process.cwd()`

#### Scenario: task-trace 传递 projectPath
- **WHEN** CLI 执行 `oxn trace --task-id X`
- **THEN** `socketRequest` 的第5参数为 `process.cwd()`

---

### Requirement: Handler 接收完整上下文

所有 handler 函数的签名必须显式接收 `projectPath` 参数。

#### Scenario: Handler 从 projectPath 解析文件路径
- **WHEN** handler 收到请求
- **THEN** handler 使用 `projectPath` 和 `taskId` 构建文件路径，读取 `.openxenon/tasks/<taskId>/` 下的文件

#### Scenario: Handler 不维护请求间状态
- **WHEN** Daemon 处理多个请求
- **THEN** 每个请求的处理都是独立的，不依赖之前请求的结果
