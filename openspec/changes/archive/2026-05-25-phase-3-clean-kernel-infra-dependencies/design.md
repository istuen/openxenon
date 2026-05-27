## Context

### 当前状态

```typescript
// infra/loader.ts
export const ProbeTypeSchema = z.enum(['fs_exists', 'fs_not_exists', 'fs_match', 'shell_exec'])

export function isValidProbeRef(ref: string): boolean { ... }
export function isBareProbeRef(ref: string): boolean { ... }
export function parseProbeNamespace(ref: string): ParsedProbeRef | null { ... }
```

```typescript
// kernel/schemas/part-asset.ts
import { isBareProbeRef, isValidProbeRef, ProbeTypeSchema, parseProbeNamespace } from '../../infra/loader'
```

### 核心问题

- Kernel 不应该直接导入 Infra
- `ProbeTypeSchema` 是 Schema 层的东西，应该在 Kernel
- 引用解析函数应属于 Kernel 的 namespace 模块

## Goals / Non-Goals

**Goals:**
- `ProbeTypeSchema` 最终定义位置：`kernel/schemas/probe.ts`
- `isValidProbeRef` 等函数重新从 `kernel/probes/namespace.ts` 导出
- Kernel 层 import 不再指向 `infra/`

**Non-Goals:**
- 不修改任何函数实现
- 不改变任何类型定义内容

## Decisions

### Decision 1: ProbeTypeSchema 位置

**选择:** `ProbeTypeSchema` 应位于 `kernel/schemas/probe.ts`

**理由:** `kernel/schemas/probe.ts` 已存在且有 TODO 注释指示迁入

### Decision 2: 引用解析函数源头

**选择:** `isValidProbeRef`, `isBareProbeRef`, `parseProbeNamespace` 原本就在 `infra/loader.ts` 中定义，保持源位置，在 `kernel/probes/namespace.ts` re-export

**理由:** 这些函数是 Infra 的职责，Kernel 只是通过 namespace.ts 提供访问入口

## Risks / Trade-offs

**风险:** `kernel/probes/namespace.ts` 当前是 re-export，需要改为直接导出

**缓解:** 检查 namespace.ts 的实现，确保符合预期

## Migration Plan

1. 确认 `kernel/schemas/probe.ts` 已有 `ProbeTypeSchema` 定义
2. 更新 `kernel/schemas/part-asset.ts` 的 import 从本地图入
3. 更新 `kernel/schemas/blueprint.schema.ts` 的 import 从本地图入
4. 运行测试验证

## Open Questions

无