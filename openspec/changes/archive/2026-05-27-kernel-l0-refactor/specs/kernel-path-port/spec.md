## ADDED Requirements

### Requirement: PathPort Contract 定义

Kernel **SHALL** 通过 `contracts/path-port.ts` 定义宿主路径计算接口：

```typescript
export interface PathPort {
  join(...segments: string[]): string
  resolve(base: string, ...segments: string[]): string
}
```

#### Scenario: PathPort 接口存在
- **WHEN** 检查 `src/kernel/contracts/path-port.ts`
- **THEN** 导出 `PathPort` 接口，包含 `join` 和 `resolve` 方法

#### Scenario: Kernel 不直接 import node:path
- **WHEN** 检查 `src/kernel/schemas/` 目录下的文件
- **THEN** 不存在 `import path from 'node:path'` 或类似宿主依赖

### Requirement: Runtime 注入 PathPort 实现

Runtime (Arsenal/Work/CLI/Daemon) **SHALL** 负责将 Infra 的 PathPort 实现注入 Kernel。

#### Scenario: PathPort 由 Infra 实现
- **WHEN** 检查 `src/infra/` 目录
- **THEN** 存在 PathPort 的宿主实现 (Bun/Node/Deno)

#### Scenario: Runtime 组装 PathPort
- **WHEN** 检查 Runtime 代码 (Work/Arsenal)
- **THEN** 将 PathPort 实现注入 Kernel Processor

### Requirement: Kernel 通过 Contract 获取路径计算

Kernel Processor **SHALL** 通过 PathPort Contract 获取路径计算能力，不直接调用宿主 API。

#### Scenario: Processor 使用 PathPort
- **WHEN** 检查 `src/kernel/processors/` 中的路径相关逻辑
- **THEN** 代码通过注入的 PathPort 实例调用路径方法

#### Scenario: Processor 不直接 import node:path
- **WHEN** 检查 `src/kernel/processors/` 中的 import 语句
- **THEN** 不存在 `import path from 'node:path'` (可以 import 但通过 Contract 使用)