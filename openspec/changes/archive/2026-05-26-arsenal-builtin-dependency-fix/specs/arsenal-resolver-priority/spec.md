## ADDED Requirements

### Requirement: ArsenalResolver 必须按优先级查找资产

ArsenalResolver 必须按以下优先级查找资产：Project Arsenal > Global Arsenal > Builtin Arsenal。

#### Scenario: 项目级资产覆盖内置资产
- **WHEN** 项目中存在同名 Part（如 `git-commit`）
- **AND** Builtin Arsenal 也有 `git-commit` 定义
- **THEN** `arsenalResolver.resolve('parts', 'git-commit')` 返回项目级 StandardAsset

#### Scenario: 无项目级资产时使用全局资产
- **WHEN** 项目中不存在某 Part
- **AND** Global Arsenal 有该 Part 定义
- **THEN** `arsenalResolver.resolve('parts', name)` 返回全局 StandardAsset

#### Scenario: 无项目级和全局资产时使用内置资产
- **WHEN** 项目中和全局都不存在某 Part（如 `develop-feature`）
- **AND** Builtin Arsenal 有该 Part 定义
- **THEN** `arsenalResolver.resolve('parts', name)` 返回内置 StandardAsset

#### Scenario: 三个作用域都不存在时返回 null
- **WHEN** 所有作用域都不存在某 Part
- **THEN** `arsenalResolver.resolve('parts', 'non-existent')` 返回 null

### Requirement: ArsenalResolver 构造函数接收 Arsenal 实例数组

ArsenalResolver 的构造函数接收一个 Arsenal 实例数组，数组顺序即优先级顺序。

#### Scenario: ArsenalResolver 按数组顺序查找
- **WHEN** ArsenalResolver 构造函数传入 `[projectArsenal, globalArsenal, builtinArsenal]`
- **THEN** 查找顺序为：projectArsenal → globalArsenal → builtinArsenal

### Requirement: ArsenalResolver 支持类型过滤

ArsenalResolver.resolve 方法必须支持 AssetType 过滤。

#### Scenario: 按类型查找 Parts
- **WHEN** 调用 `arsenalResolver.resolve('parts', 'git-commit')`
- **THEN** 只在 Parts Arsenal 中查找，不涉及 Probes

#### Scenario: 按类型查找 Probes
- **WHEN** 调用 `arsenalResolver.resolve('probes', 'fs_exists')`
- **THEN** 只在 Probes Arsenal 中查找，不涉及 Parts