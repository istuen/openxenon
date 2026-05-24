## ADDED Requirements

### Requirement: Blueprint 层支持单实例和多实例 Slot

BlueprintDeclaration 支持两种 Slot 声明：
- `part slot "name"` - 单实例 Slot（只能被一个 Part 填充）
- `part slots[] "name"` - 多实例 Slot（可被多个 Part 填充）

**Grammar:**
```langium
PartSlotDeclaration:
    'part' 'slot' name=STRING '{'
        ('deps' '=' '[' deps+=STRING (',' deps+=STRING)* ','? ']')?
    '}'
  | 'part' 'slots[]' name=STRING '{'
        ('deps' '=' '[' deps+=STRING (',' deps+=STRING)* ','? ']')?
    '}';
```

#### Scenario: Blueprint 声明单实例 Slot
- **WHEN** 解析 `blueprint "bp" type "task" { part slot "prepare" { } }`
- **THEN** 创建单实例 PartSlotDeclaration，name="prepare"，isMulti=false

#### Scenario: Blueprint 声明多实例 Slot
- **WHEN** 解析 `blueprint "bp" type "task" { part slots[] "worker" { } }`
- **THEN** 创建多实例 PartSlotDeclaration，name="worker"，isMulti=true

### Requirement: Slot 信息需要持久化到 frozen.json

Slot 的 isMulti 属性需要包含在 frozen.json 输出中，供编译时校验使用。

**OxnAssemblySlotSchema:**
```typescript
{
  name: string,
  deps: string[],
  isMulti: boolean  // false = slot, true = slots[]
}
```

#### Scenario: frozen.json 包含 isMulti 信息
- **WHEN** 编译 Blueprint 并输出 frozen.json
- **THEN** 每个 slot 包含 isMulti 字段

#### Scenario: 读取旧版 frozen.json
- **WHEN** 读取不包含 isMulti 字段的 frozen.json
- **THEN** isMulti 默认为 false（向后兼容）

### Requirement: Work 层 SlotBinding 支持显式 Part 名

SlotBinding 支持两种语法：
- `part slot "name"` - 语法糖，part name = slot name（仅用于单实例绑定）
- `part "p1" slot "name"` - 显式 part 名（用于多实例绑定）

**Grammar:**
```langium
SlotBinding:
    'part' 'slot' slot=STRING ('ref' ref=STRING)? '{'
        (props+=SlotPropBinding)*
    '}'
  | 'part' name=STRING 'slot' slot=STRING ('ref' ref=STRING)? '{'
        (props+=SlotPropBinding)*
    '}';
```

#### Scenario: 语法糖 - 单实例绑定
- **WHEN** 解析 `work "w" type "task" ref "bp" { part slot "worker" { } }`
- **THEN** SlotBinding 的 part name = "worker", slot = "worker"

#### Scenario: 显式命名 - 多实例绑定
- **WHEN** 解析 `work "w" type "task" ref "bp" { part "w1" slot "worker" { } }`
- **THEN** SlotBinding 的 part name = "w1", slot = "worker"

#### Scenario: 带 ref 的 SlotBinding
- **WHEN** 解析 `part slot "worker" ref "@prj/parts/k8s" { }`
- **THEN** SlotBinding.slot = "worker", ref = "@prj/parts/k8s"

### Requirement: Blueprint 声明必须包含 type 属性

所有 Blueprint 必须显式声明 `type` 属性。

#### Scenario: Blueprint 包含 type 属性
- **WHEN** 解析 `blueprint "my-bp" type "task" { }`
- **THEN** BlueprintDeclaration.type = "task"

### Requirement: WorkDeclaration 使用 work 关键字和 ref 属性

Work 必须使用 `work` 关键字（而非 `task`）和 `ref` 属性（而非 `use`）。

#### Scenario: 有效 Work 声明
- **WHEN** 解析 `work "my-work" type "task" ref "@prj/bp/my-bp" { }`
- **THEN** 创建 WorkDeclaration，name="my-work", type="task", ref="@prj/bp/my-bp"

#### Scenario: Work 使用 task 关键字（错误）
- **WHEN** 解析 `task "my-work" type "task" ref "@prj/bp/my-bp" { }`
- **THEN** 解析失败，`task` 不是有效的 TopLevelEntity

### Requirement: migrated-blueprints.oxn 格式正确

migrated-blueprints.oxn 中的所有 Blueprint 必须使用正确的语法。

#### Scenario: migrated-blueprints 使用 slot 而非 stage
- **WHEN** 解析 migrated-blueprints.oxn 中的 Blueprint
- **THEN** 使用 `part slot` 而非 `stage` 语法

#### Scenario: migrated-blueprints 包含 type 属性
- **WHEN** 解析 migrated-blueprints.oxn 中的 Blueprint
- **THEN** 每个 Blueprint 包含 `type` 字段