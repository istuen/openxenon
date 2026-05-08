## 问题分析

### 1. kernel/lib/project.ts - 只导出 interface，缺少函数

**当前状态**：
```typescript
// src/kernel/lib/project.ts
import type { ProjectStatus } from './core'
export interface Project { ... }
```

**需要添加的函数**（根据 index.ts 的导出声明）：
- `getProjectBoundaryPath(projectRoot: string): string`
- `getProjectConfigPath(projectRoot: string): string`
- `getProjectProofsPath(projectRoot: string): string`
- `getTasksPath(projectRoot: string): string`
- `getTaskPath(projectRoot: string, taskId: string): string`
- `getStepManifestPath(projectRoot: string, taskId: string, stepId: string): string`
- `getProjectArsenalPath(projectRoot: string): string`
- `getTaskTracePath(projectRoot: string, taskId: string): string`

### 2. kernel/lib/task-trace.ts - 类型未导出

**当前状态**：类型在文件内声明但未导出
```typescript
// src/kernel/lib/task-trace.ts
TaskTraceState,  // declared but not exported
StageState,
TraceEvent,
ProbeResult,
```

**需要**：将这些类型标记为 `export type`

### 3. kernel/lib/types/index.ts - 重复导出

**问题**：`./task-state` 和 `./task-trace` 导出相同的类型名称

**解决方案**：修改 index.ts，使用命名重导出而非 `export *`

### 4. infra 模块导入问题

**src/infra/blueprint/types.ts**：
- 导入 `./core` 但文件是 `src/kernel/lib/types/core.ts`
- 路径应为 `../../kernel/lib/types/core`

**src/infra/process.ts**：
- `cwd` 问题：`process` 是导入的对象，不应调用 `process.cwd()`
- `Response` 返回 Promise，需 await
- `exitCode` 可能为 null，需处理

### 5. daemon 模块导入问题

**src/daemon/api/context.ts** 和 **src/daemon/ipc/context.ts**：
- 导入 `../kernel/constants` 和 `../../common/constants`
- 需要创建 `src/kernel/constants.ts` 或修正到正确的 common 模块

### 6. server.ts 导入问题

**src/server.ts**：
- 导入 `./core/daemon-config` 不存在
- 需要创建或找到正确的模块

## 修复策略

### 策略 1：最小化修复
保持现有架构，只修复缺失的导入和导出

### 策略 2：清理重复导出
使用命名导出替代 `export *`，避免命名冲突

## 依赖关系

```
kernel/lib/project.ts (需添加函数)
    ↓
kernel/index.ts (导出这些函数)
    ↓
cli/draft.ts, arsenals/loader.ts (使用这些函数)

kernel/lib/task-trace.ts (需导出类型)
    ↓
kernel/lib/types/index.ts (重新导出)
    ↓
kernel/index.ts (统一导出)

infra/blueprint/types.ts (修正导入)
infra/process.ts (修正类型问题)
daemon/api/context.ts (创建/修正 constants)
daemon/trace/writer.ts (创建 common 类型)
```

## 风险

1. **循环依赖**：`kernel/lib/types/index.ts` 的重导出结构复杂
2. **缺失模块**：`common/schemas/blueprint.schema` 等可能需要创建
3. **类型冲突**：多个地方导出同名类型（ArtifactType, BlueprintStatus 等）