## ADDED Requirements

### Requirement: frozen.json 在执行后生成

Work SHALL 在任务执行完成后生成 `frozen.json`，而非执行前。

#### Scenario: 任务成功完成
- **WHEN** 任务状态转为 `COMPLETED`
- **THEN** 生成 `frozen.json` 包含最终状态快照

#### Scenario: 任务失败
- **WHEN** 任务状态转为 `FAILED`
- **THEN** 生成 `frozen.json` 包含失败原因和已完成部分

### Requirement: frozen.json 作为不可变快照

Work SHALL 确保 `frozen.json` 一旦生成不可修改，作为工作流的回溯锚点。

#### Scenario: 快照不可修改
- **WHEN** 已生成的 `frozen.json`
- **THEN** 后续执行不可覆盖，仅可生成新的快照

#### Scenario: 快照包含执行信息
- **WHEN** 生成快照
- **THEN** 包含 `taskId`、`timestamp`、`parts`、`probes`、`artifacts`、`result` 等字段

### Requirement: frozen.json 用于漂移检测

CLI SHALL 能够通过对比多个 `frozen.json` 快照检测 AI 执行漂移。

#### Scenario: 快照对比
- **WHEN** 对比两个时间点的快照
- **THEN** 识别出状态差异部分

#### Scenario: 定位漂移起点
- **WHEN** 执行结果与预期不符
- **THEN** 找到第一个不一致的快照作为漂移起点

### Requirement: frozen.json 存储位置

Work SHALL 将 `frozen.json` 存储在任务目录的 `.openxenon/frozen/` 下。

#### Scenario: 目录创建
- **WHEN** 首次生成快照
- **THEN** 自动创建目录 `.openxenon/frozen/`

#### Scenario: 文件命名
- **WHEN** 生成快照
- **THEN** 文件名为 `{timestamp}-{partId}.frozen.json`