## ADDED Requirements

### Requirement: Daemon 启动时构建 Arsenal Registry

Daemon SHALL 在启动时扫描全局和项目 arsenals 目录，构建内存索引 `ArsenalRegistry`，包含所有资产的 type/name/semantics 字段。

#### Scenario: Daemon 启动扫描
- **WHEN** Daemon 进程启动
- **THEN** 立即扫描 `~/.openxenon/arsenals/`（全局）和 `{cwd}/.openxenon/arsenals/`（项目）
- **AND** 将所有 canonical.yaml 的元数据存入 Registry

#### Scenario: 跳过 draft 资产
- **WHEN** 扫描目录时遇到 `draft.yaml` 文件
- **THEN** 跳过该文件（draft 资产不在 Registry 中）

#### Scenario: 解析 semantics 字段
- **WHEN** 解析 `canonical.yaml` 内容
- **THEN** 提取 `semantics` 字段（intent/tags/useWhen/relatedAssets）
- **AND** 如果缺少 `semantics` 字段，使用空对象 `{}` 作为默认值

### Requirement: Registry 提供搜索接口

`ArsenalRegistry` SHALL 提供 `search(query)` 方法，支持按 name/intent/tags 模糊匹配。

#### Scenario: 按名字搜索
- **WHEN** 调用 `registry.search("fs-exists")`
- **THEN** 返回所有 name 包含 "fs-exists" 的资产

#### Scenario: 按 intent 搜索
- **WHEN** 调用 `registry.search("文件存在")`
- **THEN** 返回所有 semantics.intent 包含 "文件存在" 的资产

#### Scenario: 按 tags 搜索
- **WHEN** 调用 `registry.search("fs")`
- **THEN** 返回所有 semantics.tags 包含 "fs" 的资产

#### Scenario: 多关键词匹配
- **WHEN** 调用 `registry.search("laravel install")`
- **THEN** 返回同时匹配 "laravel" 和 "install" 的资产

### Requirement: Registry 按类型查询

`ArsenalRegistry` SHALL 提供 `getByType(type)` 方法，返回指定类型的所有资产。

#### Scenario: 查询所有 probes
- **WHEN** 调用 `registry.getByType('probes')`
- **THEN** 返回所有 type 为 'probes' 的资产

#### Scenario: 查询所有 blueprints
- **WHEN** 调用 `registry.getByType('blueprints')`
- **THEN** 返回所有 type 为 'blueprints' 的资产