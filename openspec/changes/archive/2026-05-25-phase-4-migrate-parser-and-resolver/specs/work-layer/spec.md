## ADDED Requirements

### Requirement: part-resolver 移至 work 层

`part-resolver.ts` **SHALL** 位于 `work/` 目录下，作为暂存位置。

#### Scenario: part-resolver 在 work 层可用
- **WHEN** 从 `work/part-resolver.ts` 导入 `resolvePartRef`
- **THEN** 导入成功

#### Scenario: Kernel 不持有 part-resolver
- **WHEN** 代码从 `kernel/` 导入 `resolvePartRef`
- **THEN** 导入失败

### Requirement: blueprint-parser 迁出 Kernel

`kernel/lib/blueprint-parser.ts` **SHALL** 不存在于 Kernel 层。

#### Scenario: blueprint-parser 不在 Kernel
- **WHEN** 检查 `kernel/lib/` 目录
- **THEN** 不存在 `blueprint-parser.ts`

#### Scenario: parseBlueprintYaml 不从 kernel 导出
- **WHEN** 检查 `kernel/index.ts` 导出
- **THEN** 不存在 `parseBlueprintYaml` 导出