## ADDED Requirements

### Requirement: Documentation Command Examples

文档中的命令示例 SHALL 使用当前的 Work 流程命令，替代已废弃的 Task/Explore 命令。

#### Scenario: README getting started section uses work commands
- **WHEN** 用户阅读 README.md 快速开始部分
- **THEN** 看到的命令是 `oxn work new` 系列，不是已废弃的 `oxn task` 命令

#### Scenario: Architecture docs use current command syntax
- **WHEN** 用户阅读 architecture/*.md
- **THEN** 看到的命令示例使用 `oxn work` 而非 `oxn task` 或 `oxn explore new`

#### Scenario: CLI reference documents work commands
- **WHEN** 用户查阅 cli-reference.md
- **THEN** 看到的是 `oxn work` 子命令说明，而非已废弃的 `oxn task` 子命令

### Requirement: Deprecated Command Notice

文档中如需提及旧命令，SHALL 标注为 DEPRECATED 并提供迁移指引。

#### Scenario: Old command mentioned with deprecation notice
- **WHEN** 文档中提及已废弃的 `oxn task submit` 命令
- **THEN** 旁边标注 **(DEPRECATED, 请使用 `oxn work new ... --blueprint ...` 替代)**
- **AND** 提供迁移到新命令的简短说明