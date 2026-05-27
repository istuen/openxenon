## ADDED Requirements

### Requirement: Built-in Work Type Shorthand

OXN DSL SHALL 支持内置工作类型的简写语法。`task`、`plan`、`explore` 三个内置类型可以使用关键字形式声明，代替传统的 `type "xxx"` 字符串形式。

#### Scenario: Blueprint with task keyword
- **WHEN** 解析 `blueprint "ci-flow" task { part slot "build" { } }`
- **THEN** BlueprintDeclaration.type = "task"

#### Scenario: Blueprint with plan keyword
- **WHEN** 解析 `blueprint "my-plan" plan { part slot "analyze" { } }`
- **THEN** BlueprintDeclaration.type = "plan"

#### Scenario: Blueprint with explore keyword
- **WHEN** 解析 `blueprint "my-explore" explore { part slot "scan" { } }`
- **THEN** BlueprintDeclaration.type = "explore"

#### Scenario: Blueprint with explicit type string (custom type)
- **WHEN** 解析 `blueprint "hotfix" type "fix" { part slot "debug" { } }`
- **THEN** BlueprintDeclaration.type = "fix"

### Requirement: AST Structure Unchanged

内置关键字简写和显式 `type` 字符串形式 SHALL 产生相同的 AST 结构。两种写法等价，区别仅在于语法形式。

#### Scenario: Task keyword produces same AST as type string
- **WHEN** 解析 `blueprint "a" task { }` 和 `blueprint "b" type "task" { }`
- **THEN** 两个 AST 的 BlueprintDeclaration.type 字段值相同 (="task")
- **AND** 两个 AST 的 BlueprintDeclaration.name 字段值分别为 "a" 和 "b"

### Requirement: Custom Type Requires type Keyword

非内置类型 SHALL 必须使用 `type "xxx"` 语法声明。

#### Scenario: Custom type with keyword syntax (invalid)
- **WHEN** 尝试解析 `blueprint "my-fix" fix { }`
- **THEN** 解析失败，因为 `fix` 不是内置关键字

#### Scenario: Custom type with string syntax (valid)
- **WHEN** 解析 `blueprint "my-fix" type "fix" { }`
- **THEN** BlueprintDeclaration.type = "fix"