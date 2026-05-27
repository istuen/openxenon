## Why

当前 OXN DSL (L1) 编译器 `oxn-adapter.ts` 存在两处越界依赖：
1. 直接依赖 `work/part-resolver.ts` (L2 执行域) — 编译器不该知道运行时解析逻辑
2. 直接依赖 `kernel/lib/project.ts` (应用层概念) — 编译器不该知道 project boundary 概念

这违反了 L1 DSL "纯翻译器" 的设计原则，导致编译器与执行器耦合，无法独立测试和复用。

## What Changes

### 移除 part-resolver 依赖
- 从 `oxn-dsl/compiler/oxn-adapter.ts` 移除 `import { resolvePartRef } from '../../work/part-resolver.js'`
- 引入 `IPartResolver` 接口，通过依赖注入方式由调用方提供 Part 解析能力
- DSL 编译器只负责翻译，不负责运行时链接

### 移除 project boundary 依赖
- 从 `oxn-adapter.ts` 移除 `import { getProjectBoundaryPath } from '../../kernel/lib/project.js'`
- Project boundary 信息通过 `AdapterContext` 参数传入，而非直接调用工具函数
- L3 CLI 编排时负责解析 project boundary 并注入

### 接口设计
```typescript
interface IPartResolver {
  resolve(ref: string, boundary: string): PartResolution
}

interface AdapterContext {
  taskId: string
  taskName: string
  boundary?: string
}

class OxnKernelAdapter {
  constructor(private partResolver?: IPartResolver)
  adapt(ir, slotBindings, ctx?: AdapterContext)
}
```

## Capabilities

### New Capabilities
- `dsl-injection-pattern`: DSL 编译器通过依赖注入获取运行时能力，保持纯翻译器职责

### Modified Capabilities
- （无）

## Impact

### 受影响文件
- `src/oxn-dsl/compiler/oxn-adapter.ts` — 移除越界依赖，引入 IPartResolver 接口
- `src/work/part-resolver.ts` — 归属 L2 正确，仅被 Work 域调用
- `src/kernel/lib/project.ts` — 调用方(L3/L2)负责解析 boundary

### 依赖变更
- 消除: `oxn-dsl → work/part-resolver` (L1 → L2 越界)
- 消除: `oxn-dsl → kernel/lib/project` (L1 → L0 应用层概念)
- 修正: DSL 只依赖 Schema 类型 (`FrozenBlueprint`, `DagNode`)