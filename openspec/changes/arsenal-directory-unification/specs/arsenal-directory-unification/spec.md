## ADDED Requirements

### Requirement: Arsenal 统一物理入口

系统 SHALL 将所有资产（draft 和 canonical 状态）统一存储在 `.openxenon/arsenal/` 目录下，替代原有的平行结构 `forges/` 和 `arsenals/`。

#### Scenario: Blueprint 草稿存储路径
- **WHEN** 执行 `oxn forge blueprint <name>`
- **THEN** 资产写入 `.openxenon/arsenal/blueprints/drafts/<name>/draft.oxn`

#### Scenario: Blueprint 正式资产存储路径
- **WHEN** 执行 `oxn promote blueprint <name>`
- **THEN** 资产移动到 `.openxenon/arsenal/blueprints/<name>/canonical.oxn`

#### Scenario: Part 草稿存储路径
- **WHEN** 执行 `oxn forge part <name>`
- **THEN** 资产写入 `.openxenon/arsenal/parts/drafts/<name>.oxn`

#### Scenario: Part 正式资产存储路径
- **WHEN** 执行 `oxn promote part <name>`
- **THEN** 资产移动到 `.openxenon/arsenal/parts/<name>.oxn`

#### Scenario: Probe 草稿存储路径
- **WHEN** 执行 `oxn forge probe <name>`
- **THEN** 资产写入 `.openxenon/arsenal/probes/drafts/<name>.oxn`

#### Scenario: Probe 正式资产存储路径
- **WHEN** 执行 `oxn promote probe <name>`
- **THEN** 资产移动到 `.openxenon/arsenal/probes/<name>.oxn`

### Requirement: 路径常量重构

系统 SHALL 移除 `GLOBAL_FORGES_ROOT` 常量，统一使用 `GLOBAL_ARSENAL_ROOT` 作为 Arsenal 的根路径。

#### Scenario: 全局 Arsenal 根路径
- **WHEN** 解析全局 Arsenal 路径
- **THEN** 使用 `~/.openxenon/arsenal/` 作为根路径

#### Scenario: 项目 Arsenal 根路径
- **WHEN** 解析项目 Arsenal 路径
- **THEN** 使用 `{cwd}/.openxenon/arsenal/` 作为根路径

### Requirement: loadStandardByName state 过滤

`loadStandardByName` 函数 SHALL 添加 `options.state` 参数，支持按资产状态过滤查找结果。

#### Scenario: 默认返回 canonical 资产
- **WHEN** 调用 `loadStandardByName(name, type)` 不带 state 参数
- **THEN** 只返回状态为 'canonical' 的资产

#### Scenario: 显式请求 canonical 资产
- **WHEN** 调用 `loadStandardByName(name, type, { state: 'canonical' })`
- **THEN** 只返回状态为 'canonical' 的资产

#### Scenario: 请求 draft 资产
- **WHEN** 调用 `loadStandardByName(name, type, { state: 'draft' })`
- **THEN** 只返回状态为 'draft' 的资产（位于 `drafts/` 子目录）

#### Scenario: 请求所有状态资产
- **WHEN** 调用 `loadStandardByName(name, type, { state: 'both' })`
- **THEN** 同时返回 draft 和 canonical 状态的资产

### Requirement: promoteToCanonical 路径迁移

当执行 Promote 操作时，系统 SHALL 将资产从 `drafts/` 子目录移动到对应的正式目录。

#### Scenario: Blueprint promote 路径迁移
- **WHEN** Promote 一个 Blueprint
- **AND** 源路径是 `.openxenon/arsenal/blueprints/drafts/<name>/draft.oxn`
- **THEN** 目标路径是 `.openxenon/arsenal/blueprints/<name>/canonical.oxn`

#### Scenario: Part promote 路径迁移
- **WHEN** Promote 一个 Part
- **AND** 源路径是 `.openxenon/arsenal/parts/drafts/<name>.oxn`
- **THEN** 目标路径是 `.openxenon/arsenal/parts/<name>.oxn`

### Requirement: Task 实例化只获取 canonical 资产

Task 提交时 SHALL 只使用状态为 canonical 的 Blueprint，确保实例化的确定性。

#### Scenario: Task submit 使用 canonical Blueprint
- **WHEN** 执行 `oxn task submit --blueprint <name>`
- **THEN** `loadStandardByName` 使用 `{ state: 'canonical' }` 过滤
- **AND** 不会意外使用 draft 状态的 Blueprint