## ADDED Requirements

### Requirement: Work type 与 Blueprint type 必须匹配

WorkDeclaration 的 `type` 属性值必须与引用的 BlueprintDeclaration 的 `type` 属性值相同。

#### Scenario: type 匹配

- **WHEN** Work 引用 Blueprint，且两者 type 相同
- **THEN** 校验通过，无错误

#### Scenario: type 不匹配

- **WHEN** Work.type = "plan"，Blueprint.type = "task"
- **THEN** 校验失败，报错：Work type "plan" 与 Blueprint type "task" 不匹配

### Requirement: Slot 引用必须存在

WorkDeclaration 中每个 SlotBinding 的 `slot` 值必须在对应 Blueprint 的 `partSlots` 数组中存在。

#### Scenario: slot 存在

- **WHEN** Work slot="develop"，Blueprint 中存在 `part slot "develop"`
- **THEN** 校验通过，无错误

#### Scenario: slot 不存在

- **WHEN** Work slot="unknown-slot"，Blueprint 中不存在该 slot
- **THEN** 校验失败，报错：Slot "unknown-slot" 在 Blueprint 中未定义