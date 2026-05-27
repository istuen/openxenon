## Why

OXN DSL 的 Blueprint 声明语法需要更简洁。当前 `blueprint "name" type "task" { }` 对于内置类型（task/plan/explore）过于冗长。引入关键字简写语法可以提升 developer experience，同时保持与自定义类型的兼容性。

## What Changes

- **新增内置类型关键字简写**：内置类型（task/plan/explore）可用简写 `blueprint "name" task { }` 代替 `blueprint "name" type "task" { }`
- **保持自定义类型语法**：自定义类型（如 fix/test）继续使用 `blueprint "name" type "fix" { }` 语法
- **统一 AST 结构**：两种写法产生相同的 AST 结构，`type` 字段值相同
- **Grammar 修改**：Langium grammar 新增 BuiltInWorkType Data Type Rule

## Capabilities

### New Capabilities

- `builtin-work-type-shorthand`：内置工作类型关键字简写语法

## Impact

- 修改 `src/oxn-dsl/langium/oxn.langium`
- 重新生成 `src/oxn-dsl/generated/grammar.ts`
- 现有 `canonical.oxn` 文件可能需要迁移（如果使用内置类型简写）
- Skill 文档 `/oxn-work` 示例需更新（流程跑通后）