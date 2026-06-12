## ADDED Requirements

### Requirement: Explore Blueprint 类型

系统 SHALL 支持 `type "explore"` 的 Blueprint 定义，包含 scan/qa/report 三个 slot。

### Requirement: Scan Slot

Scan slot SHALL 在 deps 满足后执行扫描操作，将资料文件索引到 `.openxenon/explores/<name>/docs/` 目录。

### Requirement: QA Slot

QA slot SHALL 在 scan 完成后执行问答操作，读写 `.openxenon/explores/<name>/ai-qa.json` 和 `.openxenon/explores/<name>/engineer-qa.json`。

### Requirement: Report Slot

Report slot SHALL 在 qa 完成后生成报告到 `.openxenon/explores/<name>/report.md`。

### Requirement: Explore Work 流程

系统 SHALL 支持 `oxn work init <name> --type explore --blueprint explore-flow` 创建 explore work。

### Requirement: 旧命令兼容

系统 SHALL 保持 `oxn explore new/scan/qa/report` 命令可用，数据路径保持不变。

#### Scenario: 新流程创建 explore work
- **WHEN** 用户执行 `oxn work init my-explore --type explore --blueprint explore-flow`
- **THEN** 系统创建 `.openxenon/work/explore/my-explore.oxn`

#### Scenario: 旧流程创建 explore
- **WHEN** 用户执行 `oxn explore new my-explore`
- **THEN** 系统创建 `.openxenon/explores/my-explore/` 目录结构