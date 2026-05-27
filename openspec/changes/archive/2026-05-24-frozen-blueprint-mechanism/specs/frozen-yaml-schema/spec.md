## ADDED Requirements

### Requirement: frozen.yaml 包含必要字段
frozen.yaml SHALL 包含 `id`、`name`、`frozen_at`、`stages` 四个必填字段。

### Requirement: _xenon_meta 嵌入每个 Stage
每个 Stage 的定义 SHALL 嵌入 `_xenon_meta` 元数据块，包含以下字段：
- `ref`：原始引用字符串
- `resolved_from`：解析来源（kernel/global/project）
- `shadow`：是否发生 Shadowing
- `original_path`：原始资产的物理路径
- `frozen_at`：冻结时间戳
- `content_hash`：原始资产的内容哈希

### Requirement: _xenon_meta 嵌入每个 Probe
每个 Probe 的定义 SHALL 嵌入 `_xenon_meta` 元数据块，包含：
- `ref`：原始引用字符串
- `resolved_from`：解析来源
- `appended`：是否来自 probes_append

### Requirement: 参数已注入
frozen.yaml 中的 action 和 probe command SHALL 已完成参数注入，无任何 `{{...}}` 占位符。

#### Scenario: 读取 frozen 文件
- **WHEN** 需要复现某个历史 Task
- **THEN** 系统 SHALL 直接读取 Task 目录下的 `blueprint.frozen.yaml`