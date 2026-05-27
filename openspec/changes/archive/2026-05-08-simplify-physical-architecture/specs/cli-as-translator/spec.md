## ADDED Requirements

### Requirement: CLI 作为纯翻译层

CLI 命令 SHALL 只负责读取文件、转换为 JSON、通过 Unix Socket 发送给 Daemon。

#### Scenario: task-submit 命令流程
- **WHEN** 用户执行 `oxn task submit`
- **THEN** CLI SHALL 读取 `canonical.yaml` 文件
- **THEN** CLI SHALL 将 YAML 解析为 JSON 对象
- **THEN** CLI SHALL 通过 Unix Socket 发送 JSON 到 Daemon
- **THEN** CLI SHALL NOT 直接写入任何文件（除了 Daemon 的响应）

### Requirement: CLI 命令边界

CLI 命令 SHALL NOT 直接调用任何 persister、registry 或 config 模块。

#### Scenario: 验证 CLI 不越界
- **WHEN** 检查 CLI 命令代码
- **THEN** CLI SHALL NOT import `blueprint-persister`、`registry`、`config` 模块

### Requirement: 翻译层输入格式

CLI SHALL 支持读取 YAML 格式的 Blueprint 定义。

#### Scenario: 读取 Blueprint YAML
- **WHEN** CLI 接收 task-submit 请求
- **THEN** CLI SHALL 读取 `canonical.yaml` 文件
- **THEN** CLI SHALL 使用 YAML parser 解析内容