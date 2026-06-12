## ADDED Requirements

### Requirement: oxn forge CLI 命令

CLI SHALL 提供 `oxn forge <type>` 命令显示元蓝图约束：

- `oxn forge probe` - 显示 Probe 元蓝图
- `oxn forge proof` - 显示 Proof 元蓝图
- `oxn forge stage` - 显示 Stage 元蓝图
- `oxn forge blueprint` - 显示 Blueprint 元蓝图
- `oxn forge all` - 显示所有元蓝图

#### Scenario: 查看 Probe 元蓝图
- **WHEN** 用户执行 `oxn forge probe`
- **THEN** 系统显示 Probe 类型的元蓝图约束

#### Scenario: 查看所有元蓝图
- **WHEN** 用户执行 `oxn forge all`
- **THEN** 系统显示所有类型的元蓝图约束

### Requirement: Skill 改进

Skill SHALL 通过 CLI 获取元蓝图，而非硬编码。

#### Scenario: AI 获取元蓝图
- **WHEN** AI 执行 /oxn-forge 生成资产
- **THEN** AI 执行 `oxn forge <type>` 获取模板
- **AND** 根据模板生成符合规范的 YAML