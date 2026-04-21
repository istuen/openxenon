## ADDED Requirements

### Requirement: CLI 全局支持 --json 参数
CLI SHALL 在全局参数中添加 `--json`，使所有命令支持 JSON 格式输出。

#### Scenario: 使用 --json 参数
- **WHEN** 用户运行命令时添加 `--json` 参数
- **THEN** 输出格式为 JSON，而不是人类可读的文本

### Requirement: 统一 JSON 输出 Schema
所有命令 SHALL 使用统一的 zod Schema 验证输出数据。

#### Scenario: 输出格式一致性
- **WHEN** 多个命令使用 `--json` 输出
- **THEN** 每个命令的输出符合其对应的 zod Schema

### Requirement: Task 命令 JSON 输出
`xn task-*` 系列命令 SHALL 支持 JSON 输出。

#### Scenario: task-status JSON 输出
- **WHEN** 用户运行 `xn task-status --json`
- **THEN** 输出符合 TaskStatusOutput Schema

### Requirement: Proof 命令 JSON 输出
`xn proof-list` 命令 SHALL 支持 JSON 输出。

#### Scenario: proof-list JSON 输出
- **WHEN** 用户运行 `xn proof-list --json`
- **THEN** 输出符合 ProofListOutput Schema