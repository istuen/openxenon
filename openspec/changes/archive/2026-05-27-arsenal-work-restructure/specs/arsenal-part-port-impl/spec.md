## ADDED Requirements

### Requirement: Arsenal 实现 PartPort 接口

Arsenal SHALL 实现 `PartPort` 接口，封装 Builtin/Project/Global 的统一寻址逻辑。

#### Scenario: Arsenal 实现 PartPort
- **WHEN** Runtime 初始化时
- **THEN** Arsenal 实例化 `PartPort` 实现
- **AND** 将其注入到 Kernel 的 `BlueprintFreezer`

#### Scenario: PartPort 实现包含 projectBoundary 闭包
- **WHEN** Arsenal 创建 `PartPort` 实现
- **THEN** 实现内部包含 `projectBoundary` 物理路径
- **AND** 对 Kernel 透明（Kernel 只调用逻辑引用）

### Requirement: PartPort 实现支持所有 scope 解析

`PartPort.fetchPartDefinition` SHALL 支持解析 `oxn://`、`@scope/`、`./` 等所有合法前缀。

#### Scenario: 解析 oxn:// 前缀（内置 Part）
- **WHEN** 调用 `partPort.fetchPartDefinition('oxn://parts/git-commit')`
- **THEN** 从 `BUILTIN_PARTS` 中查找并返回 Part 定义
- **AND** 不触发任何文件系统 IO

#### Scenario: 解析 @scope/ 前缀（全局 Arsenal）
- **WHEN** 调用 `partPort.fetchPartDefinition('@scope/parts/jest-runner')`
- **THEN** 从全局 arsenals 目录读取对应文件
- **AND** 返回解析后的 Part 定义

#### Scenario: 解析 ./ 前缀（项目 Arsenal）
- **WHEN** 调用 `partPort.fetchPartDefinition('./my-part')`
- **THEN** 从项目 arsenals 目录读取对应文件
- **AND** 返回解析后的 Part 定义

#### Scenario: 解析不存在的引用
- **WHEN** 调用 `partPort.fetchPartDefinition('oxn://parts/non-existent')`
- **THEN** 返回 null 或抛出 AssetNotFoundError

### Requirement: Arsenal 内置 BuiltinArsenal 作为内存版实现

BuiltinArsenal SHALL 作为 Arsenal 的内存版实现，用于存储和提供内置 Part 数据。

#### Scenario: BuiltinArsenal 是 Arsenal 接口的实现
- **WHEN** 检查 `src/arsenals/builtin-arsenal.ts`
- **THEN** 实现 `Arsenal` 接口

#### Scenario: BuiltinArsenal 提供内置 Part
- **WHEN** 调用 `builtinArsenal.get('parts', 'git-commit')`
- **THEN** 返回包含 `id: 'git-commit'`、`action.instruction` 等完整定义的 StandardAsset

#### Scenario: BuiltinArsenal 的 get 操作对 Kernel 透明
- **WHEN** `PartPort` 实现调用 BuiltinArsenal
- **THEN** `BlueprintFreezer` 不知道 Builtin 的存在，只知道调用 `fetchPartDefinition` 返回了数据

### Requirement: Arsenal 支持优先级链寻址

Arsenal SHALL 实现优先级链寻址：Project Arsenal → Global Arsenal → Builtin Arsenal。

#### Scenario: 优先级链寻址
- **WHEN** 调用 `partPort.fetchPartDefinition('./my-part')`
- **THEN** 先查找 Project Arsenal
- **AND** 如果 Project 中不存在，继续查找 Global Arsenal
- **AND** 如果 Global 中也不存在，查找 Builtin Arsenal
- **AND** 最终返回找到的 Part 定义或抛出 AssetNotFoundError

### Requirement: Arsenal 提供资产铸造接口

Arsenal SHALL 提供 `forgeAsset(type, name, template)` 方法，根据模板生成符合 DSL 规范的资产骨架。

#### Scenario: 铸造 Probe 资产
- **WHEN** 调用 `forgeAsset('probes', 'my-probe', template)`
- **THEN** 在 `.openxenon/forges/probes/my-probe.oxn` 创建资产文件

#### Scenario: 铸造 Part 资产
- **WHEN** 调用 `forgeAsset('parts', 'my-part', template)`
- **THEN** 在 `.openxenon/forges/parts/my-part.oxn` 创建资产文件

#### Scenario: 铸造 Blueprint 资产
- **WHEN** 调用 `forgeAsset('blueprints', 'my-bp', template)`
- **THEN** 在 `.openxenon/forges/blueprints/my-bp/draft.oxn` 创建资产文件

### Requirement: 寻址逻辑对 Kernel 透明

Arsenal 的寻址逻辑（包括内存寻址和文件系统寻址）对 Kernel 完全透明。

#### Scenario: Kernel 只知道逻辑引用
- **WHEN** `BlueprintFreezer` 调用 `partPort.fetchPartDefinition`
- **THEN** 不需要知道 Part 是在内存中还是在磁盘上
- **AND** 不包含任何 `path.join`、`existsSync` 等物理操作