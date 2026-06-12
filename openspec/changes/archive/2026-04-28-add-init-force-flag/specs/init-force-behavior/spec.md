## MODIFIED Requirements

### Requirement: init 命令的 --force 参数行为

`oxn init --force` 命令 SHALL 在更新心跳时间的同时强制重编译所有 Skill。

#### Scenario: 使用 --force 参数
- **WHEN** 用户执行 `oxn init --force`
- **THEN** 系统 SHALL 更新项目心跳时间
- **AND** 系统 SHALL 强制重编译所有 Skill 文件（忽略内容比对）

#### Scenario: 使用 -f 别名
- **WHEN** 用户执行 `oxn init -f`
- **THEN** 系统 SHALL 产生与 `oxn init --force` 相同的行为

#### Scenario: 不使用 --force 参数
- **WHEN** 用户执行 `oxn init`（无 --force）
- **THEN** 系统 SHALL 仅执行 Skill 编译（按内容比对决定是否更新）

### Requirement: --compile-force 仍可单独使用

`--compile-force` 参数 SHALL 可独立使用，不需要 `--force`。

#### Scenario: 单独使用 --compile-force
- **WHEN** 用户执行 `oxn init --compile-force`
- **THEN** 系统 SHALL 强制重编译所有 Skill
- **AND** 不更新心跳时间（除非同时指定了 --force）