## ADDED Requirements

### Requirement: work new 创建新 Work

work new 命令 SHALL 以与 task new 一致的参数和行为创建新的 Work 实例。

#### Scenario: 成功创建 Work
- **WHEN** 用户执行 `oxn work new --work-id my-work --type task --blueprint test-bp`
- **THEN** 系统在 `.openxenon/work/<type>/<work-id>.oxn` 创建 Work 文件

#### Scenario: 缺少必需参数
- **WHEN** 用户执行 `oxn work new` 不带 `--work-id`
- **THEN** 系统抛出错误提示缺少必需参数

### Requirement: work init 已废弃

work init 命令 SHALL 显示弃用提示，引导用户使用 work new。

#### Scenario: 使用已废弃命令
- **WHEN** 用户执行 `oxn work init --work-id my-work`
- **THEN** 系统输出提示 "work init 已废弃，请使用 work new"