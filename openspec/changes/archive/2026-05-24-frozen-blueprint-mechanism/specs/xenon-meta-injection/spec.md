## ADDED Requirements

### Requirement: 冻结时注入 _xenon_meta
Core 在执行冻结操作时 SHALL 为每个 Stage 和 Probe 注入 `_xenon_meta` 元数据块。

### Requirement: _xenon_meta 只读
`_xenon_meta` 块 SHALL 是只读的，AI 不可修改其内容。

### Requirement: shadow 标记
当引用命中了 Shadowing 资产时，`_xenon_meta.shadow` SHALL 为 `true`，否则为 `false`。

### Requirement: content_hash 计算
冻结时 Core SHALL 计算原始资产的 SHA256 哈希并写入 `content_hash` 字段。

#### Scenario: 探针的元数据
- **WHEN** 基类 Stage 的某个 probe 被保留到 frozen
- **THEN** 该 probe 的 `_xenon_meta` SHALL 包含 `ref`、`resolved_from`

#### Scenario: 追加探针的元数据
- **WHEN** 基类 Stage 的 probe 通过 `probes_append` 被追加
- **THEN** 该 probe 的 `_xenon_meta` SHALL 包含 `appended: true`