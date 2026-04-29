## ADDED Requirements

### Requirement: 无 PATH 参数时列出可用资产

CLI SHALL 当用户执行 `oxn arsenal inspect` 不带 PATH 参数时，列出所有 DRAFT 资产供用户选择。

#### Scenario: 列出 DRAFT 资产
- **WHEN** 用户执行 `oxn arsenal inspect` 不带参数
- **THEN** CLI SHALL 列出 `.openxenon/arsenal/*/DRAFT/` 下所有可用资产
- **AND** 显示编号列表供用户选择

#### Scenario: 用户选择资产
- **WHEN** 用户输入资产编号
- **THEN** CLI SHALL 显示对应资产的完整内容

#### Scenario: 无 DRAFT 资产时
- **WHEN** 用户执行 `oxn arsenal inspect` 不带参数
- **AND** 不存在任何 DRAFT 资产
- **THEN** CLI SHALL 输出 "当前没有 DRAFT 状态的资产"

### Requirement: 帮助信息

CLI SHALL 无参数时显示使用说明。

#### Scenario: 显示帮助
- **WHEN** 用户执行 `oxn arsenal inspect` 不带参数
- **THEN** CLI SHALL 输出格式化的资产列表
- **AND** 提示用户输入编号选择或按 q 退出
