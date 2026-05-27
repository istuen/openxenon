## ADDED Requirements

### Requirement: Exploration Asset
系统 SHALL 支持将探索器定义为 Arsenal YAML 资产，存储在 `arsenals/explorations/<name>/canonical.yaml`。

#### Scenario: Exploration asset structure
- **WHEN** 加载 `arsenals/explorations/coverage/canonical.yaml`
- **THEN** 系统解析出 name、description、scope、rules

### Requirement: Generic Exploration Engine
系统 SHALL 支持通用探索引擎 `evaluateExploration(context, rules, meta)`，输入上下文和规则，输出 ExplorationResult。

#### Scenario: Rule matching with findings
- **WHEN** 执行 `evaluateExploration(context, rules, meta)`
- **THEN** 系统返回 `{ name, title, generatedAt, findings[], summary }`

### Requirement: Markdown Report Output
系统 SHALL 支持将 ExplorationResult 渲染为 Markdown 并写入 `.openxenon/explore/<name>-report.md`。

#### Scenario: Report file generation
- **WHEN** `oxn explore coverage` 执行成功
- **THEN** 系统创建 `.openxenon/explore/coverage-report.md`

### Requirement: Context Collection
系统 SHALL 支持采集探索上下文：项目文件结构、Arsenal 探针清单、Blueprint 引用、Trace 历史。

#### Scenario: Context includes project dirs
- **WHEN** 执行 `collectContext(projectRoot)`
- **THEN** 返回包含 projectFiles、projectDirs、probes 的对象

### Requirement: Self-Verification
探索报告 SHALL 支持通过 `oxn task verify` 验证：fs_exists 检查报告存在、fs_match 检查报告包含预期内容。

#### Scenario: Report is verifiable
- **WHEN** 报告已生成
- **THEN** 可以用 `fs_exists { pattern: ".openxenon/explore/coverage-report.md" }` 验证
- **AND** 可以用 `fs_match { pattern: ".openxenon/explore/coverage-report.md", contains: "覆盖度报告" }` 验证格式
