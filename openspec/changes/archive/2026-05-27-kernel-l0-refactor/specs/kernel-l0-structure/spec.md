## ADDED Requirements

### Requirement: Kernel L0 三元结构

`src/kernel/` 目录 **SHALL** 严格遵循 Schema/Contract/Processor 三层物理分离：

```
src/kernel/
├── schemas/                 # L0-Schema: 类型定义 + 运行时校验
│   ├── types/               # 纯 TS 类型, 零运行时依赖
│   │   ├── enums.ts         # 状态枚举
│   │   ├── action.ts
│   │   ├── artifact.ts
│   │   ├── task.ts
│   │   ├── task-trace.ts    # 唯一真相源
│   │   ├── part.ts
│   │   ├── probe.ts
│   │   ├── sample.ts
│   │   ├── spec.ts
│   │   └── policy.ts        # ExecutionPolicy 接口
│   └── validators/          # Zod 运行时校验
│       ├── blueprint.schema.ts
│       ├── frozen-schema.ts
│       ├── dag-validator.ts
│       ├── part.ts           # 从 schemas/part.ts 移入
│       ├── probe.ts          # 从 schemas/probe.ts 移入
│       └── part-asset.ts     # Zod schemas，从 schemas/part-asset.ts 拆分移入
├── contracts/               # L0-Contract: 由 Infra 实现
│   ├── probe-port.ts
│   └── path-port.ts
└── processors/              # L0-Processor: 纯逻辑
    ├── probes/
    ├── explore/
    ├── policies/
    └── ...
```

#### Scenario: Schema 目录只包含类型定义
- **WHEN** 检查 `src/kernel/schemas/types/` 目录
- **THEN** 所有文件都是 `.ts` 类型定义，不包含函数实现

#### Scenario: Schema validators 与类型物理隔离
- **WHEN** 检查 `src/kernel/schemas/validators/` 目录
- **THEN** 所有文件都是 Zod 运行时校验逻辑，与 types/ 物理分离

#### Scenario: Contract 由外部实现注入
- **WHEN** Kernel 内部代码引用 `contracts/` 下的接口
- **THEN** 这些接口不由 Kernel 自身实现，由 Runtime 注入 Infra 实现

#### Scenario: Processor 不碰宿主环境
- **WHEN** 检查 `src/kernel/processors/` 中的代码
- **THEN** 代码可以 import `node:path` 等宿主模块，但不直接执行 I/O

### Requirement: 删除 lib/ 目录

`src/kernel/lib/` 目录 **SHALL** 被废止：
- `lib/types/*.ts` 移动到 `schemas/types/`
- `lib/*.ts` 移动到 `processors/`

#### Scenario: lib/ 目录不存在
- **WHEN** 检查 `src/kernel/` 目录结构
- **THEN** 不存在 `lib/` 目录

#### Scenario: 类型定义在 schemas/types/
- **WHEN** 检查 `src/kernel/schemas/types/enums.ts`
- **THEN** 状态枚举已合并 core.ts，Xn 前缀已移除

### Requirement: 拆分 part-asset.ts

`schemas/part-asset.ts` **SHALL** 被拆分为：
- `schemas/validators/part-asset.ts` - Zod schemas (`PartRefSchema`, `PartDefinitionSchema` 等)
- `processors/part-asset-helpers.ts` - 辅助函数 (`getNamespaceFromRef`, `getScopeNameFromRef`, `getPartNameFromRef`)

#### Scenario: part-asset.ts 拆分
- **WHEN** 检查 `schemas/validators/part-asset.ts`
- **THEN** 只包含 Zod schemas 和 validate 函数，不包含辅助函数

### Requirement: 合并重复类型

`lib/types/task-state.ts` 和 `lib/types/task-trace.ts` **SHALL** 合并为 `schemas/types/task-trace.ts`：
- 以 `task-trace.ts` 为唯一真相源
- ProbeResult 使用可选字段兼容旧逻辑

#### Scenario: task-trace.ts 是唯一真相源
- **WHEN** 检查 `src/kernel/schemas/types/task-trace.ts`
- **THEN** 包含完整的 TaskTraceState、PartState、ProbeResult 定义

#### Scenario: 移除 Xn 前缀别名
- **WHEN** 搜索 `XnTaskStatus` 或 `XnPartStatus`
- **THEN** 不存在，这些别名已统一为 TaskStatus、StepStatus