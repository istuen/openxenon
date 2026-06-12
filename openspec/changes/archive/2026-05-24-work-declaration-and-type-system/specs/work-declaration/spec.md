## ADDED Requirements

### Requirement: WorkDeclaration 语法

WorkDeclaration SHALL be a valid TopLevelEntity in OXN grammar.

**Grammar:**
```langium
WorkDeclaration:
    'work' name=STRING 'type' type=ID 'ref' ref=STRING '{'
        (slotBindings+=SlotBinding)*
    '}';
```

#### Scenario: 有效 WorkDeclaration
- **WHEN** 解析 `work "my-work" type "task" ref "@prj/bp/my-bp.oxn" { part slot "worker" ref "@prj/parts/k8s" { } }`
- **THEN** 成功创建 WorkDeclaration AST 节点，name="my-work", type="task", ref="@prj/bp/my-bp.oxn"

#### Scenario: 缺少 type 属性
- **WHEN** 解析 `work "my-work" ref "@prj/bp/my-bp.oxn" { }`
- **THEN** 解析失败，报告缺少 required 属性 `type`

#### Scenario: 缺少 ref 属性
- **WHEN** 解析 `work "my-work" type "task" { }`
- **THEN** 解析失败，报告缺少 required 属性 `ref`

### Requirement: WorkDeclaration 的 slotBindings

WorkDeclaration MAY contain zero or more SlotBinding 用于绑定 Blueprint 中定义的 slot。

#### Scenario: 无 slotBindings
- **WHEN** 解析 `work "my-work" type "task" ref "@prj/bp/my-bp.oxn" { }`
- **THEN** slotBindings 为空数组

#### Scenario: 多个同 slot 名绑定
- **WHEN** 解析包含多个同 slot 名 "worker" 的 slotBindings
- **THEN** 所有 binding 依次添加，不覆盖

### Requirement: SlotBinding 语法

SlotBinding SHALL support引用 Blueprint 中定义的 slot。

**Grammar:**
```langium
SlotBinding:
    'part' 'slot' slot=STRING ('ref' ref=STRING)? '{'
        (props+=SlotPropBinding)*
    '}';
```

#### Scenario: 带 ref 的 SlotBinding
- **WHEN** 解析 `part slot "worker" ref "@prj/parts/k8s" { }`
- **THEN** 创建 SlotBinding，slot="worker", ref="@prj/parts/k8s"

#### Scenario: 不带 ref 的 SlotBinding
- **WHEN** 解析 `part slot "worker" { }`
- **THEN** 创建 SlotBinding，slot="worker", ref=undefined

#### Scenario: 带 props 的 SlotBinding
- **WHEN** 解析 `part slot "worker" ref "@prj/parts/k8s" { prop env = "prod" }`
- **THEN** SlotBinding 包含 SlotPropBinding，name="env", value=Expression

### Requirement: SlotPropBinding 语法

SlotPropBinding SHALL 支持在 SlotBinding 内覆写 slot 的属性。

**Grammar:**
```langium
SlotPropBinding:
    'prop' name=ID '=' value=Expression;
```

#### Scenario: 有效 SlotPropBinding
- **WHEN** 解析 `prop env = "prod"`
- **THEN** 创建 SlotPropBinding，name="env", value=StringLiteral("prod")