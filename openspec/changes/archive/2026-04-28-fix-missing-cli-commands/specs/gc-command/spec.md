## ADDED Requirements

### Requirement: Gc 命令清理已完成任务

CLI SHALL 提供 `oxn gc` 命令用于清理已完成任务的旧资产。

#### Scenario: 执行垃圾回收
- **WHEN** 用户执行 `oxn gc`
- **THEN** CLI 扫描 `.openxenon/tasks/` 目录
- **AND** 识别已完成且超过保留期限的任务
- **AND** 删除对应的任务目录和资产

### Requirement: Gc 命令支持预览模式

CLI SHALL 提供 `--dry-run` 参数用于预览将要删除的内容而不实际删除。

#### Scenario: 预览删除
- **WHEN** 用户执行 `oxn gc --dry-run`
- **THEN** CLI 扫描并列出将要删除的任务
- **AND** 不执行实际删除操作
- **AND** 输出预览结果

### Requirement: Gc 命令支持保留策略

CLI SHALL 提供 `--keep <days>` 参数用于指定任务保留天数。

#### Scenario: 指定保留天数
- **WHEN** 用户执行 `oxn gc --keep 30`
- **THEN** CLI 仅删除 30 天前已完成的任务
- **AND** 保留最近 30 天内的任务

### Requirement: Gc 命令无参数时显示帮助

CLI SHALL 当用户执行 `oxn gc` 不带参数时显示帮助信息。

#### Scenario: 无参数显示帮助
- **WHEN** 用户执行 `oxn gc`
- **THEN** 显示 usage 帮助信息
- **AND** 列出所有可用参数
