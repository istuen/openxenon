## ADDED Requirements

### Requirement: PartSlotDeclaration slot[] 语法

PartSlotDeclaration SHALL 支持 `slot[]` 语法表示该 slot 可多次实例化。

**Grammar:**
```langium
PartSlotDeclaration:
    'part' 'slot[]' name=STRING '{'
        ('deps' '=' '[' deps+=STRING (',' deps+=STRING)* ','? ']')?
    '}';
```

#### Scenario: slot[] 声明
- **WHEN** 解析 `part slot[] "worker" { deps = ["@prj/parts/k8s"] }`
- **THEN** 创建 PartSlotDeclaration，name="worker", 带 slot[] 标记

#### Scenario: 无 slot[] 声明（单次）
- **WHEN** 解析 `part slot "worker" { deps = ["@prj/parts/k8s"] }`
- **THEN** 创建 PartSlotDeclaration，name="worker"，无 slot[] 标记

### Requirement: slot[] 语义

slot[] 标记的 slot SHALL 允许在 Work 中进行多次 SlotBinding。

#### Scenario: slot[] 多次绑定
- **WHEN** Work 中存在多个同 slot 名 "worker" 的 SlotBinding
- **THEN** 所有 binding 依次添加，不覆盖

#### Scenario: 无 slot[] 多次绑定
- **WHEN** Work 中存在多个同 slot 名 "worker" 的 SlotBinding（slot 无 slot[] 标记）
- **THEN** 行为取决于实现，可允许或报警告

### Requirement: SlotBinding 引用 slot

SlotBinding 的 `slot` 属性 SHALL 引用 Blueprint 中定义的 PartSlotDeclaration。

#### Scenario: 引用存在的 slot
- **WHEN** SlotBinding.slot = "worker" 且 Blueprint 中存在 slot[] "worker"
- **THEN** 绑定成功

#### Scenario: 引用不存在的 slot
- **WHEN** SlotBinding.slot = "nonexistent" 且 Blueprint 中不存在该 slot
- **THEN** validator 报告 `slot "nonexistent" not found in blueprint`

### Requirement: SlotBinding ref 为可选项

SlotBinding 的 `ref` 属性 SHALL 为可选项。

#### Scenario: 不提供 ref
- **WHEN** 解析 `part slot "worker" { }`
- **THEN** SlotBinding.ref = undefined

#### Scenario: 提供 ref
- **WHEN** 解析 `part slot "worker" ref "@prj/parts/k8s" { }`
- **THEN** SlotBinding.ref = "@prj/parts/k8s"