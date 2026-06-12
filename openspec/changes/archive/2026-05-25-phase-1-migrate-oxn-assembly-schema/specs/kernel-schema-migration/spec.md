## ADDED Requirements

### Requirement: OxnAssemblyIR 必须位于 DSL 层

`OxnAssemblyIR` 及其相关类型定义（`OxnAssemblyPart`, `OxnAssemblySlot`, `OxnAssemblyExpectation`, `OxnAssemblyRule` 等）**SHALL** 位于 `oxn-dsl/schemas/` 目录下，不属于 Kernel 层。

#### Scenario: OxnAssemblyIR 类型在 DSL 层可用
- **WHEN** 代码从 `oxn-dsl/schemas/oxn-assembly.schema.ts` 导入 `OxnAssemblyIR`
- **THEN** 导入成功

#### Scenario: Kernel 不持有 OxnAssemblyIR 类型
- **WHEN** 代码从 `kernel/` 导入 `OxnAssemblyIR`
- **THEN** 导入失败，类型不存在

### Requirement: ExpectationRunner 必须位于 DSL 层

`ExpectationRunner` **SHALL** 位于 `oxn-dsl/executor/` 目录下，因为 expectation 是 DSL 前端的运行时断言概念，不属于 Kernel 的 Processor 范畴。

#### Scenario: ExpectationRunner 在 DSL 层可用
- **WHEN** 代码从 `oxn-dsl/executor/expectation-runner.ts` 导入 `ExpectationRunner`
- **THEN** 导入成功

#### Scenario: Kernel 不持有 ExpectationRunner
- **WHEN** 代码从 `kernel/` 导入 `ExpectationRunner`
- **THEN** 导入失败，类型不存在

### Requirement: 迁移后 import 路径正确

迁移完成后，所有引用 `OxnAssemblyIR` 的文件**SHALL** 从新路径导入。

#### Scenario: oxn-dsl 层文件从新路径导入
- **WHEN** `oxn-dsl/generator/oxn-generator.ts` 导入 `OxnAssemblyIR`
- **THEN** 导入路径为 `../../oxn-dsl/schemas/oxn-assembly.schema.js`

#### Scenario: oxn-dsl 层文件从新路径导入 expectation-runner
- **WHEN** `oxn-dsl/__tests__/phase4.test.ts` 导入 `ExpectationRunner`
- **THEN** 导入路径为 `../../oxn-dsl/executor/expectation-runner`

#### Scenario: 测试通过
- **WHEN** 运行 `bun test` 测试
- **THEN** 所有测试通过，无 import 错误