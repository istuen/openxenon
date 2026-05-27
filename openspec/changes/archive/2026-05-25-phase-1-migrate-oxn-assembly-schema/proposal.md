## Why

当前 `kernel/schemas/oxn-assembly.schema.ts` 位于 Kernel 层，但其定义的类型（`OxnAssemblyIR`, `OxnAssemblyPart`, `OxnAssemblyExpectation` 等）是 OXN DSL 前端的中间表示（IR），属于解析流程的输出而非 Kernel 的 Schema 范畴。Kernel 只应接收 `FrozenBlueprint`（已转换为 JSON 格式的最终输入）。

将 `oxn-assembly.schema.ts` 迁回 `oxn-dsl/schemas/` 恢复正确的分层职责。

## What Changes

- 将 `kernel/schemas/oxn-assembly.schema.ts` 迁移至 `oxn-dsl/schemas/oxn-assembly.schema.ts`
- 将 `kernel/executor/expectation-runner.ts` 迁移至 `oxn-dsl/executor/expectation-runner.ts`
- 更新所有引用上述文件的 import 路径

## Capabilities

### New Capabilities
- 无新功能，纯迁移

### Modified Capabilities
- 无需求变更

## Impact

### 受影响的文件

**迁移源（需删除 import 引用）：**
- `kernel/task/sandbox-manager.ts`
- `kernel/executor/expectation-runner.ts`（本身也迁移）
- `kernel/explore/evaluator.ts`（仅引用 `OxnAssemblyProp`）

**迁移目标（需更新 import 路径）：**
- `oxn-dsl/generator/oxn-generator.ts`
- `oxn-dsl/compiler/oxn-adapter.ts`
- `oxn-dsl/loader/oxn-loader.ts`
- `oxn-dsl/evaluator/param-evaluator.ts`
- `oxn-dsl/compiler/bundle-compiler.ts`
- `oxn-dsl/flattener/bundle-flattener.ts`
- `oxn-dsl/validator/mutation-validator.ts`
- `oxn-dsl/validator/rule-validator.ts`
- `oxn-dsl/scope/oxn-scope.ts`

### 分层影响

| 层级 | 变化 |
|-----|------|
| Kernel | 不再持有 DSL 前端 IR 类型 |
| OXN DSL | 持有完整的 OxnAssemblyIR 类型定义 |
| 测试 | `oxn-dsl/__tests__/phase3.test.ts`, `phase4.test.ts` import 路径更新 |