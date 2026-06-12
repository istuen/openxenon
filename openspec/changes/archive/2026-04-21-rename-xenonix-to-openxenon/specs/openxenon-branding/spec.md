## ADDED Requirements

### Requirement: OpenXenon 品牌名
系统必须使用 `OpenXenon` 作为品牌名。

#### Scenario: CLI 帮助信息
- **WHEN** 用户运行 `oxn --help`
- **THEN** 显示 "OpenXenon CLI" 作为品牌名

### Requirement: OpenXenonSkill 接口
系统必须使用 `OpenXenonSkill` 作为 Skill 接口名。

#### Scenario: 导入接口
- **WHEN** 导入 Skill 接口
- **THEN** 使用 `OpenXenonSkill`