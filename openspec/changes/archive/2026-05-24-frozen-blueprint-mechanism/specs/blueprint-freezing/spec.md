## ADDED Requirements

### Requirement: submit 时执行冻结
当执行 `oxn task submit` 时，Core SHALL 在写入 Task 目录前执行 Blueprint 的深度冻结。

### Requirement: 深度内联展开
冻结时，Core SHALL 将所有 `ref` 引用展开为内联定义，包括：
- Stage 内部的目标、规格、操作、探针
- 探针的类型和参数

### Requirement: 深拷贝到 Task 目录
冻结后的 Blueprint SHALL 写入 `.openxenon/tasks/<task_id>/blueprint.frozen.yaml`。

### Requirement: 运行时只读 frozen
Task 执行时，Core SHALL 只读取 `blueprint.frozen.yaml`，不再访问 Arsenal。

#### Scenario: 冻结后 Arsenal 升级不影响执行
- **WHEN** Task A 在 v1 的 Arsenal 下提交并执行
- **WHEN** 3 个月后 Arsenal 升级到 v3
- **THEN** Task A 的执行 SHALL 不受影响，因为 frozen 文件已锁死 v1 语义

### Requirement: 冻结后修改 frozen 文件禁止
frozen 文件 SHALL 是只读的，任何对 `blueprint.frozen.yaml` 的修改尝试 SHALL 被拒绝。