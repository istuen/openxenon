## ADDED Requirements

### Requirement: oxn CLI 命令命名
系统必须使用 `oxn` 作为 CLI 命令名。

#### Scenario: CLI 帮助信息
- **WHEN** 用户运行 `oxn --help`
- **THEN** 显示帮助信息

### Requirement: openxenon 目录命名
项目边界目录必须命名为 `.openxenon`。

#### Scenario: 初始化项目
- **WHEN** 运行 `oxn init`
- **THEN** 创建 `.openxenon/` 目录

### Requirement: oxn 数据库文件
数据库文件必须使用 `.oxn` 后缀。

#### Scenario: 项目数据库
- **WHEN** 初始化项目
- **THEN** 创建 `project.oxn` 数据库文件