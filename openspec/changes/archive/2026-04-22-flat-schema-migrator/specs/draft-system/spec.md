## ADDED Requirements

### Requirement: 草案系统职责划分

草案系统（Draft System）负责工程师意图的结构化表达与入库，是系统中唯一允许外部写入的入口。

系统 SHALL 将 `.openxenon/` 目录划分为以下隔离区：
- `drafts/`：入站区，唯一允许外部（工程师/AI 辅助）写入的目录
- `active/`：活跃投影区，由 oxn export 生成的只读文件，供工程师实时查阅当前运行状态
- `archive/`：冷档投影区，由 oxn export 生成的只读文件，供工程师归档和复盘

#### Scenario: 目录职责隔离
- **WHEN** 系统初始化项目围栏
- **THEN** 系统创建 drafts/、active/、archive/ 三个子目录，各自职责明确

### Requirement: oxn draft apply

系统 SHALL 提供 `oxn draft apply` 命令，将草案文件导入数据库。

执行流程：
1. 读取草案文件（YAML 或 JSON 格式）
2. 执行 Zod Schema 校验（第一道 Proof）
3. 执行 DAG 拓扑校验（第二道 Proof）
4. 执行探针存在性扫描（第三道 Proof）
5. 物理写入数据库（INSERT，不 UPDATE）
6. 备份草案文件到 drafts/ 目录

#### Scenario: 草案文件格式
- **WHEN** 工程师编写草案文件
- **THEN** 文件包含 task（可选）、blueprint、stages 三个顶层字段

#### Scenario: Zod 校验失败熔断
- **WHEN** 草案文件不符合 Zod Schema
- **THEN** 系统拒绝写入数据库，返回校验错误

#### Scenario: 拓扑环检测
- **WHEN** 草案中 stages 的 deps 存在循环依赖
- **THEN** 系统拒绝写入数据库，返回拓扑错误

### Requirement: oxn draft apply --dry-run

`oxn draft apply` 命令 SHALL 支持 `--dry-run` 参数，仅执行校验而不写入数据库。

#### Scenario: Dry-run 模式
- **WHEN** 用户执行 `oxn draft apply <file> --dry-run`
- **THEN** 系统执行所有校验步骤，但不写入数据库

### Requirement: oxn draft diff

系统 SHALL 提供 `oxn draft diff` 命令，对比草案与数据库当前状态的差异。

对比维度：
- `added`：草案中存在但数据库中不存在的 Stage
- `removed`：数据库中存在但草案中不存在的 Stage
- `modified`：两处都存在但内容（target/spec/action/proof）有差异的 Stage

#### Scenario: 差异检测
- **WHEN** 用户执行 `oxn draft diff <file>`
- **THEN** 系统输出彩色差异列表（added/removed/modified）

### Requirement: oxn draft list

系统 SHALL 提供 `oxn draft list` 命令，列出 drafts/ 目录中的所有草案文件。

#### Scenario: 列出草案
- **WHEN** 用户执行 `oxn draft list`
- **THEN** 系统列出 drafts/ 目录中的所有草案文件及其元信息

### Requirement: oxn draft extract

系统 SHALL 提供 `oxn draft extract` 命令，将数据库中的 Blueprint 导出为本地 YAML 文件。

#### Scenario: 从数据库提取草案
- **WHEN** 用户执行 `oxn draft extract --task-id <id>`
- **THEN** 系统读取数据库中对应 Task 的 Blueprint，生成 YAML 文件到 drafts/ 目录
