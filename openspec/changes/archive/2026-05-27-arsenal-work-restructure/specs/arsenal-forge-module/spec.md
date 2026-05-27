## ADDED Requirements

### Requirement: Arsenal 提供资产铸造接口

Arsenal SHALL 提供 `forgeAsset(type, name, template)` 方法，根据模板生成符合 DSL 规范的资产骨架。

#### Scenario: 铸造 Probe 资产
- **WHEN** 调用 `forgeAsset('probes', 'my-probe', template)`
- **THEN** 在 `.openxenon/forges/probes/my-probe.oxn` 创建资产文件
- **AND** 文件内容符合 `probe "<name>" { ... }` OXN 语法

#### Scenario: 铸造 Part 资产
- **WHEN** 调用 `forgeAsset('parts', 'my-part', template)`
- **THEN** 在 `.openxenon/forges/parts/my-part.oxn` 创建资产文件
- **AND** 文件内容符合 `part "<name>" { ... }` OXN 语法

#### Scenario: 铸造 Blueprint 资产
- **WHEN** 调用 `forgeAsset('blueprints', 'my-bp', template)`
- **THEN** 在 `.openxenon/forges/blueprints/my-bp/draft.oxn` 创建资产文件
- **AND** 文件内容符合 `blueprint "<name>" { ... }` OXN 语法

#### Scenario: 资产创建前检查目标路径
- **WHEN** 调用 `forgeAsset('probes', 'existing-probe', template)`
- **AND** 目标路径已存在 draft 资产
- **THEN** 抛出 `AssetAlreadyExistsError`

### Requirement: Forge 生成的资产包含必要元数据

生成的资产 SHALL 包含必要的 description 和 prop 定义，确保资产可被正确解析。

#### Scenario: Probe 资产包含 description
- **WHEN** 调用 `forgeAsset('probes', 'my-probe', {})`
- **THEN** 生成的文件包含 `description = "<description>"`

#### Scenario: Part 资产包含 target 和 spec
- **WHEN** 调用 `forgeAsset('parts', 'my-part', {})`
- **THEN** 生成的文件包含 `target.description` 和 `spec.description` 占位符

### Requirement: Forge 支持模板变量替换

Forge SHALL 支持在模板中使用变量占位符，创建时进行替换。

#### Scenario: 模板变量替换
- **WHEN** 调用 `forgeAsset('parts', 'my-part', { name: 'custom-name' })`
- **AND** 模板包含 `{{name}}` 占位符
- **THEN** 生成的文件中 `{{name}}` 被替换为 `custom-name`

### Requirement: Forge 生成的资产可被 Loader 正确加载

Forge 生成的资产 SHALL 可通过 `loader.ts` 的标准接口加载为 `StandardAsset`。

#### Scenario: 铸造后可通过 Loader 加载
- **WHEN** 调用 `forgeAsset('probes', 'test-probe', template)`
- **AND** 调用 `arsenalLoadStandardByName('test-probe', 'probes')`
- **THEN** 返回包含 name、type、state、path、content 的 StandardAsset 对象

### Requirement: Forge 支持元 Forge 约束校验

生成资产时 SHALL 根据元 Forge 的 constraints 进行校验，不符合的资产拒绝创建。

#### Scenario: 元 Forge 约束校验失败
- **WHEN** 调用 `forgeAsset('probes', 'bad-probe', invalidTemplate)`
- **AND** 模板不符合 meta-probe 的 constraints
- **THEN** 抛出 `ValidationFailedError`，包含具体违规信息