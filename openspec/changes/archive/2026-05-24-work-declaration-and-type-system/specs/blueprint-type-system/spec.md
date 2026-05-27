## ADDED Requirements

### Requirement: Blueprint type 属性

BlueprintDeclaration SHALL 支持 `type` 属性用于声明 Blueprint 的语义类型。

**Grammar:**
```langium
BlueprintDeclaration:
    'blueprint' name=STRING 'type' type=ID '{'
        ...
    '}';
```

**默认值：** 不写 `type` 时默认为 `"task"`

#### Scenario: 显式 type="task"
- **WHEN** 解析 `blueprint "my-bp" type "task" { ... }`
- **THEN** BlueprintDeclaration.type = "task"

#### Scenario: 隐式 type 默认值
- **WHEN** 解析 `blueprint "my-bp" { ... }`
- **THEN** BlueprintDeclaration.type = "task" (default)

#### Scenario: 自定义 type 值
- **WHEN** 解析 `blueprint "my-bp" type "flow" { ... }`
- **THEN** BlueprintDeclaration.type = "flow"

### Requirement: Work-Blueprint type 1:1 校验

WorkDeclaration 的 `type` 属性 SHALL 与引用的 Blueprint 的 `type` 属性同名匹配。

**校验规则：** `work "x" type "T" ref "bp.oxn"` 要求 `bp.oxn` 中 Blueprint 的 `type` 也为 `"T"`

#### Scenario: type 匹配成功
- **WHEN** Work type="task" 引用 Blueprint type="task"
- **THEN** 校验通过，无错误

#### Scenario: type 不匹配
- **WHEN** Work type="task" 引用 Blueprint type="flow"
- **THEN** 校验失败，报告 `type mismatch: work type "task" but blueprint type "flow"`

#### Scenario: 自定义 type 匹配
- **WHEN** Work type="pipeline" 引用 Blueprint type="pipeline"
- **THEN** 校验通过

### Requirement: 校验时机

type 1:1 校验 SHALL 在 Langium validator 中执行，于 document 构建完成后进行。

#### Scenario: validator 检测 type 不匹配
- **WHEN** OXN document 包含 type 不匹配的 Work 和 Blueprint 引用
- **THEN** validator 报告错误，不阻塞解析但阻止后续生成

### Requirement: 无白名单限制

type 属性的值 SHALL 不受白名单限制，任意 ID 都是合法值。

#### Scenario: 任意字符串作为 type
- **WHEN** 解析 `blueprint "bp" type "custom-type-123" { }`
- **THEN** 解析成功，无校验错误

#### Scenario: 自定义 type 协作
- **WHEN** Work type="pipeline" 引用 Blueprint type="pipeline"
- **THEN** 协作成功，type 仅为语义标签