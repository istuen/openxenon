## ADDED Requirements

### Requirement: Stage.proof 字段
Stage 必须使用 `proof` 字段绑定 Proof 校验器。

#### Scenario: 创建 Stage
- **WHEN** 创建 Stage 实例
- **THEN** 使用 `proof` 字段（非 xnProof）

### Requirement: Blueprint 使用 stages
Blueprint 必须使用 `stages` 数组定义 Stage 序列。

#### Scenario: Blueprint 结构
- **WHEN** 定义 Blueprint
- **THEN** 使用 `stages: Stage[]`

## MODIFIED Requirements

### Requirement: Task 使用 blueprint
**FROM**: Task 使用 playbook
**TO**: Task 使用 blueprint

#### Scenario: 创建任务
- **WHEN** 创建任务
- **THEN** 存储 blueprint 字段