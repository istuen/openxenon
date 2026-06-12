## ADDED Requirements

### Requirement: 导出系统职责

导出系统（Export System）负责将数据库中的状态反编译为人类可读的 Markdown 文档，是系统向外部世界展示运行态的唯一出口。

导出系统 SHALL 严格单向执行：从数据库读取，反编译为文件，写入只读目录。绝不反向同步。

#### Scenario: 导出文件只读性
- **WHEN** 导出文件生成后
- **THEN** 系统不依赖这些文件进行任何状态判断，所有状态以数据库为准

### Requirement: oxn export active

系统 SHALL 提供 `oxn export active` 命令，导出当前活跃的 Task/Blueprint 结构到 `active/` 目录。

导出内容：
- Task 的基本信息和状态
- 当前 active Blueprint 的 DAG 拓扑（Mermaid 格式）
- 每个 Stage 的 target/spec/action/proof（YAML 格式代码块）

#### Scenario: 导出活跃拓扑
- **WHEN** 用户执行 `oxn export active --task-id <id>`
- **THEN** 系统生成包含 Mermaid 图和 YAML 代码块的 Markdown 文档到 active/ 目录

#### Scenario: Mermaid DAG 图生成
- **WHEN** 导出 Blueprint 包含多个 Stage
- **THEN** 系统生成合法的 Mermaid graph LR 语法表示依赖关系

### Requirement: oxn export archive

系统 SHALL 提供 `oxn export archive` 命令，导出已终结或废弃的 Task/Blueprint 结构到 `archive/` 目录。

#### Scenario: 导出历史归档
- **WHEN** 用户执行 `oxn export archive --task-id <id>`
- **THEN** 系统将对应 Task 的所有 Blueprint（包括 ABANDONED 状态）导出到 archive/ 目录

### Requirement: 导出文件命名规范

导出文件 SHALL 使用 `{task_id}.md` 作为文件名。

#### Scenario: 文件名冲突处理
- **WHEN** 同一 Task 多次导出
- **THEN** 系统覆盖已有文件，保证 active/ 和 archive/ 中每个 Task 只有一份最新的导出

### Requirement: 导出内容完整性

导出的 Markdown 文档 SHALL 包含：
- Task 名称、状态、创建时间
- Blueprint 名称、状态、版本
- 所有 Stage 的详细信息（deps、target、spec、action、proof）
- Mermaid DAG 图（如果 Stage 数量 > 1）

#### Scenario: 内容完整性保证
- **WHEN** 导出过程中数据库发生变更
- **THEN** 系统在单次导出事务中保证读取一致性，不出现半生不熟的文档

### Requirement: Git 友好性

导出的 Markdown 文件 SHALL 适合纳入 Git 版本控制。

#### Scenario: 文本格式优先
- **WHEN** 系统生成导出文件
- **THEN** 文件使用 UTF-8 编码，换行符为 LF，纯文本格式便于 Git diff
