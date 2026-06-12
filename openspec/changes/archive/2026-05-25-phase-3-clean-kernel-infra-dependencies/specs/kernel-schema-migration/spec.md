## ADDED Requirements

### Requirement: Kernel 不直接导入 Infra

Kernel 层的模块**SHALL NOT** 从 `infra/` 目录导入任何模块。

#### Scenario: part-asset.ts 不导入 infra
- **WHEN** 检查 `kernel/schemas/part-asset.ts` 的 import
- **THEN** 不存在 `from '../../infra/loader'` 或类似路径

#### Scenario: blueprint.schema.ts 不导入 infra
- **WHEN** 检查 `kernel/schemas/blueprint.schema.ts` 的 import
- **THEN** 不存在 `from '../../infra/loader'` 或类似路径

### Requirement: ProbeTypeSchema 位于 Kernel

`ProbeTypeSchema` **SHALL** 在 `kernel/schemas/probe.ts` 中定义。

#### Scenario: ProbeTypeSchema 在 Kernel 可用
- **WHEN** 从 `kernel/schemas/probe.ts` 导入 `ProbeTypeSchema`
- **THEN** 导入成功

### Requirement: 引用解析函数从 Kernel 导出

`isValidProbeRef`, `isBareProbeRef`, `parseProbeNamespace` **SHALL** 从 `kernel/probes/namespace.ts` 导出。

#### Scenario: 引用解析函数在 Kernel 可用
- **WHEN** 从 `kernel/probes/namespace.ts` 导入上述函数
- **THEN** 导入成功

#### Scenario: namespace.ts 不 re-export infra
- **WHEN** 检查 `kernel/probes/namespace.ts` 内容
- **THEN** 函数定义在本文件，而非 re-export