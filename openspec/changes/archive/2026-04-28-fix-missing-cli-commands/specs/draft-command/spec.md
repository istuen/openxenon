## ADDED Requirements

### Requirement: Draft 命令提供子命令入口

CLI SHALL 提供 `oxn draft` 命令作为 Draft 模式的入口点。

#### Scenario: 执行 draft 命令
- **WHEN** 用户执行 `oxn draft <subcommand>`
- **THEN** CLI 加载并执行对应的 draft 子命令

### Requirement: Draft 命令无参数时显示帮助

CLI SHALL 当用户执行 `oxn draft` 不带子命令时显示帮助信息。

#### Scenario: 无参数显示帮助
- **WHEN** 用户执行 `oxn draft`
- **THEN** 显示 usage 帮助信息
- **AND** 列出所有可用子命令
