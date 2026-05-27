## ADDED Requirements

### Requirement: Plan Blueprint 类型

系统 SHALL 支持 `type "plan"` 的 Blueprint 定义，包含 analyze/design/estimate/review 四个 slot。

### Requirement: Analyze Slot

Analyze slot SHALL 在 deps 为空时首先执行，收集需求信息和约束条件。

### Requirement: Design Slot

Design slot SHALL 在 analyze 完成后执行，进行技术方案设计。

### Requirement: Estimate Slot

Estimate slot SHALL 在 design 完成后执行，评估工作量和资源需求。

### Requirement: Review Slot

Review slot SHALL 在 estimate 完成后执行，最终评审确认。

### Requirement: Plan Work 流程

系统 SHALL 支持 `oxn work init <name> --type plan --blueprint plan-flow` 创建 plan work。

#### Scenario: 新流程创建 plan work
- **WHEN** 用户执行 `oxn work init my-plan --type plan --blueprint plan-flow`
- **THEN** 系统创建 `.openxenon/work/plan/my-plan.oxn`