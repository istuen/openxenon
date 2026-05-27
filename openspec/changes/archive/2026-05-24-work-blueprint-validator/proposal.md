## Why

WorkDeclaration 已实现，但缺少 Blueprint type 1:1 校验机制。Work 可以引用任意 type 的 Blueprint，无法在编译期发现 type 不匹配的 bug。同样，slot 引用也无法在编译期校验存在性，导致运行时才发现错误。

## What Changes

- **新增 `WorkBlueprintTypeValidator`**：校验 Work.type 与引用的 Blueprint.type 是否 1:1 匹配
- **新增 `SlotReferenceValidator`**：校验 Work 中引用的 slot 名称是否在 Blueprint 中定义
- **集成 validator 到 Langium 流水线**：在文档解析阶段执行校验，返回语义错误

## Capabilities

### New Capabilities

- `work-type-validation`：Work.type 与 Blueprint.type 必须同名匹配的校验逻辑
- `slot-reference-validation`：Work 中引用的 slot 必须在对应 Blueprint 的 partSlots 中存在

### Modified Capabilities

- 无

## Impact

- `src/oxn-dsl/validator/work-type-validator.ts` — 新增 type 校验器
- `src/oxn-dsl/validator/slot-reference-validator.ts` — 新增 slot 校验器
- `src/oxn-dsl/langium/oxn-services.ts` — 注册 validator 到 Langium 流水线