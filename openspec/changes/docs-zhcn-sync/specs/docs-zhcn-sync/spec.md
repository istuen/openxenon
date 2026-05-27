## ADDED Requirements

### Requirement: 文档术语一致性

docs/zh-cn 目录下的所有文档 SHALL 使用与 README.md 一致的术语体系，包括：
- L2 资产单元使用 `Part` 而非 `Stage`
- 任务实例使用 `Work` 而非 `Task`
- 可视化界面使用 `Hall` (研讨厅)

#### Scenario: 核心概念文档使用正确术语
- **WHEN** 开发者阅读 `docs/zh-cn/architecture/concepts.md`
- **THEN** 文档使用 Part/Work/Hall 术语，不使用 Stage/Task

#### Scenario: 命令参考文档使用正确术语
- **WHEN** 开发者阅读 `docs/zh-cn/guides/cli-reference.md`
- **THEN** 命令示例使用 `oxn work` 而非 `oxn task`

### Requirement: 文档链接有效性

docs/zh-cn 目录下的所有文档内链接 SHALL 可正常访问，包括：
- 文档间链接指向正确路径
- README.md 中的中文文档链接包含 `zh-cn/` 前缀

#### Scenario: README 链接包含 locale 前缀
- **WHEN** 开发者阅读 README.md §9 文档链接
- **THEN** 链接指向 `docs/zh-cn/guides/getting-started.md` 而非 `docs/getting-started.md`

#### Scenario: architecture 内部链接正确
- **WHEN** 开发者阅读 `docs/zh-cn/architecture/intro.md`
- **THEN** 指向 concepts 的链接为 `concepts.md` 而非 `02-concepts.md`

### Requirement: 目录结构描述准确性

`docs/zh-cn/guides/development.md` SHALL 准确描述实际项目目录结构。

#### Scenario: 开发文档描述正确结构
- **WHEN** 开发者阅读 `docs/zh-cn/guides/development.md`
- **THEN** 文档中的目录结构与实际 `docs/en/` 和 `docs/zh-cn/` 双 locale 结构一致

### Requirement: Arsenal 物理结构描述正确性

`docs/zh-cn/guides/arsenal-guide.md` SHALL 准确描述 Arsenal 资产的实际存储结构。

#### Scenario: Arsenal 资产使用单文件存储
- **WHEN** 开发者阅读 `docs/zh-cn/guides/arsenal-guide.md`
- **THEN** 文档描述 `probes/<name>.yaml` 和 `parts/<name>.yaml` 单文件结构，而非目录结构